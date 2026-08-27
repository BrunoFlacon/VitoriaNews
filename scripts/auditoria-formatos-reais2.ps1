# Reteste 4 casos com params corretos (top-level): T23R/T24R Telegram, T27R IG carrossel, T28R Threads video
$ErrorActionPreference = 'Continue'
$SUPA_URL = 'https://supabase.webradiovitoria.com.br'
$USER_ID  = '38cd9720-494e-406a-853d-19d81ae85e99'
$keyJson = & node_modules\.bin\supabase.cmd db query --linked --output json "SELECT value FROM public.settings WHERE key = 'supabase_service_role_key'" 2>$null
$SRK = (($keyJson | ConvertFrom-Json) | Select-Object -First 1).value
$H = @{ apikey = $SRK; Authorization = "Bearer $SRK"; 'Content-Type' = 'application/json' }

$MP3 = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/1778166944570_cw5e4.mp3"
$PDF = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/audit-test-doc.pdf"
$IMG1 = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/b09c0f8b-9c68-41ba-a688-21bdbb7d0078.jpg"
$IMG2 = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/1ef98b6e-d550-47d5-a007-274e9ae240e5.jpg"
$VID  = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/f9f56fdd-6b9b-45dc-b8c5-3fb337019009.mp4"

$cases = @(
  @{ id='T23R'; platform='telegram';  ct='audio';    media=@($MP3); chat='@TupaNoticias'; title='Telegram Audio (MP3)' },
  @{ id='T24R'; platform='telegram';  ct='image';    media=@($PDF); chat='@TupaNoticias'; title='Telegram PDF' },
  @{ id='T27R'; platform='instagram'; target='11df6dcd-9f04-43bf-b045-7f5d51e7010f'; ct='carousel'; media=@($IMG1,$IMG2); title='Instagram Carrossel 2 fotos' },
  @{ id='T28R'; platform='threads';   target='1694f354-98d9-4105-abaa-df4dc995c189'; ct='video';    media=@($VID); title='Threads Video' }
)

foreach ($c in $cases) {
  if ($c.target) { $platforms = @("$($c.platform)|$($c.target)") } else { $platforms = @($c.platform) }
  $payload = @{ platforms=$platforms; content="TESTE-REAL [$($c.id)] $($c.title) - Social Canvas Hub 2026-08-13"; userId=$USER_ID; mediaType=$c.ct; mediaUrls=$c.media }
  if ($c.chat) { $payload.chatId = $c.chat }
  $bodyJson = $payload | ConvertTo-Json -Depth 6
  $check = $bodyJson | ConvertFrom-Json
  if ($check.platforms.GetType().Name -ne 'Object[]') { Write-Host "[$($c.id)] BUG HARNESS platforms"; continue }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  Write-Host "=== [$($c.id)] $($c.title) -> chamando publish-post..."
  try {
    $resp = Invoke-RestMethod -Uri "$SUPA_URL/functions/v1/publish-post" -Method Post -Headers $H -Body $bodyJson -TimeoutSec 240
    $sw.Stop()
    Write-Host "[$($c.id)] ms=$($sw.ElapsedMilliseconds)"
    $resp | ConvertTo-Json -Depth 8
  } catch {
    $sw.Stop()
    Write-Host "[$($c.id)] ms=$($sw.ElapsedMilliseconds) ERRO: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message }
  }
  Start-Sleep -Seconds 3
}
