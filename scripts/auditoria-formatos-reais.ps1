# Testes REAIS de formatos faltantes: Áudio, PDF e Carrossel (2026-08-13)
$ErrorActionPreference = 'Continue'
$SUPA_URL = 'https://supabase.webradiovitoria.com.br'
$USER_ID  = '38cd9720-494e-406a-853d-19d81ae85e99'
$OUT = Join-Path $PSScriptRoot 'auditoria-formatos-reais.jsonl'
Remove-Item $OUT -ErrorAction SilentlyContinue

$keyJson = & node_modules\.bin\supabase.cmd db query --linked --output json "SELECT value FROM public.settings WHERE key = 'supabase_service_role_key'" 2>$null
$SRK = (($keyJson | ConvertFrom-Json) | Select-Object -First 1).value
if (-not $SRK) { throw 'SRK nao obtida' }
$H = @{ apikey = $SRK; Authorization = "Bearer $SRK"; 'Content-Type' = 'application/json' }

# Alvos reais (conexões)
$fb = (& node_modules\.bin\supabase.cmd db query --linked --output json "SELECT id FROM public.social_connections WHERE user_id = '$USER_ID' AND platform='facebook' AND is_connected=true LIMIT 1;" 2>$null | ConvertFrom-Json) | Select-Object -First 1
$wa = (& node_modules\.bin\supabase.cmd db query --linked --output json "SELECT sc.id, sc.platform_user_id, sc.phone_number_id, sc.waba_id FROM public.social_connections sc WHERE user_id = '$USER_ID' AND platform='whatsapp' AND is_connected=true LIMIT 1;" 2>$null | ConvertFrom-Json) | Select-Object -First 1
"FB target: $($fb.id)"
"WA target: id=$($wa.id) phone=$($wa.phone_number_id) waba=$($wa.waba_id)"

$MP3 = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/1778166944570_cw5e4.mp3"   # MP3 real 2,4MB
$PDF = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/audit-test-doc.pdf"        # PDF real 711B
$IMG1 = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/b09c0f8b-9c68-41ba-a688-21bdbb7d0078.jpg"
$IMG2 = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/1ef98b6e-d550-47d5-a007-274e9ae240e5.jpg"
$VID  = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/f9f56fdd-6b9b-45dc-b8c5-3fb337019009.mp4"

$cases = @(
  @{ id='T21'; platform='facebook';  target="$($fb.id)";         ct='audio';    media=@($MP3); title='Facebook Audio (MP3)' },
  @{ id='T22'; platform='facebook';  target="$($fb.id)";         ct='image';    media=@($PDF); title='Facebook PDF' },
  @{ id='T23'; platform='telegram';  target=''; ct='audio'; media=@($MP3); title='Telegram Audio (MP3)' },
  @{ id='T24'; platform='telegram';  target=''; ct='image'; media=@($PDF); title='Telegram PDF' },
  @{ id='T25'; platform='whatsapp';  target="$($wa.id)";         ct='audio';    media=@($MP3); title='WhatsApp Audio (MP3)' },
  @{ id='T26'; platform='whatsapp';  target="$($wa.id)";         ct='image';    media=@($PDF); title='WhatsApp PDF' },
  @{ id='T27'; platform='instagram'; target='11df6dcd-9f04-43bf-b045-7f5d51e7010f'; ct='carousel'; media=@($IMG1,$IMG2); title='Instagram Carrossel 2 fotos' },
  @{ id='T28'; platform='threads';   target='1694f354-98d9-4105-abaa-df4dc995c189'; ct='video'; media=@($VID); title='Threads Video' }
)

foreach ($c in $cases) {
  $entry = [ordered]@{ caso=$c.id; platform=$c.platform; contentType=$c.ct; title=$c.title; ts=(Get-Date).ToUniversalTime().ToString('o') }
  # ⚠️ ATRIBUICAO DIRETA (nao usar if-expression: desenrola array de 1 elemento para string)
  if ($c.target) { $platforms = @("$($c.platform)|$($c.target)") } else { $platforms = @($c.platform) }
  $payload = @{ platforms=$platforms; content="TESTE-REAL [$($c.id)] $($c.title) - Social Canvas Hub 2026-08-13"; userId=$USER_ID; mediaType=$c.ct; mediaUrls=$c.media }
  $opts = @{ chatId = '@TupaNoticias' }
  if ($c.platform -eq 'telegram') { $payload.options = $opts }
  $bodyJson = $payload | ConvertTo-Json -Depth 6
  $check = $bodyJson | ConvertFrom-Json
  if ($check.platforms.GetType().Name -ne 'Object[]') { Write-Host "[$($c.id)] BUG HARNESS: platforms nao e array - ABORTANDO"; break }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-RestMethod -Uri "$SUPA_URL/functions/v1/publish-post" -Method Post -Headers $H -Body $bodyJson -TimeoutSec 150
    $sw.Stop(); $entry.ms = $sw.ElapsedMilliseconds
    $entry.rawResponse = ($resp | ConvertTo-Json -Compress -Depth 6)
    $entry.successAny = $false
    foreach ($r in @($resp.results)) { if ($r.success) { $entry.successAny = $true } }
  } catch {
    $sw.Stop(); $entry.ms = $sw.ElapsedMilliseconds
    $entry.rawResponse = 'HTTP ' + $_.Exception.Message
    if ($_.ErrorDetails.Message) { $entry.rawResponse += ' :: ' + $_.ErrorDetails.Message }
    $entry.successAny = $false
  }
  Add-Content -Path $OUT -Value ($entry | ConvertTo-Json -Compress -Depth 6) -Encoding UTF8
  Write-Host "[$($c.id)] $($c.platform) $($c.ct) -> successAny=$($entry.successAny) em $($entry.ms)ms"
  Start-Sleep -Seconds 2
}
Write-Host "DONE -> $OUT"
