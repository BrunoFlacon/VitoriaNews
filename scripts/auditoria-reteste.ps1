# Reteste pós-correção — casos T04-T07, T19, T20
$ErrorActionPreference = 'Stop'
$SUPA_URL = 'https://supabase.webradiovitoria.com.br'
$USER_ID  = '38cd9720-494e-406a-853d-19d81ae85e99'
$keyJson = & node_modules\.bin\supabase.cmd db query --linked --output json "SELECT value FROM public.settings WHERE key = 'supabase_service_role_key'" 2>$null
$SRK = (($keyJson | ConvertFrom-Json) | Select-Object -First 1).value
if (-not $SRK) { throw 'SRK nao obtida' }
$H = @{ apikey = $SRK; Authorization = "Bearer $SRK"; 'Content-Type' = 'application/json' }

$IMG = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/b09c0f8b-9c68-41ba-a688-21bdbb7d0078.jpg"
$VID = "$SUPA_URL/storage/v1/object/public/media/$USER_ID/f9f56fdd-6b9b-45dc-b8c5-3fb337019009.mp4"

$cases = @(
  @{ id='T04R'; platform='instagram'; target='11df6dcd-9f04-43bf-b045-7f5d51e7010f'; contentType='image';  media=$IMG; title='Instagram Foto (corrigido)' },
  @{ id='T05R'; platform='instagram'; target='11df6dcd-9f04-43bf-b045-7f5d51e7010f'; contentType='video';  media=$VID; title='Instagram Reels (corrigido)' },
  @{ id='T06R'; platform='instagram'; target='11df6dcd-9f04-43bf-b045-7f5d51e7010f'; contentType='story';  media=$IMG; title='Instagram Story (corrigido)' },
  @{ id='T07R'; platform='threads';   target='1694f354-98d9-4105-abaa-df4dc995c189'; contentType='text';  media=$null; title='Threads Texto (corrigido)' },
  @{ id='T19R'; platform='linkedin';  target='75b990f3-35c3-4be6-bbb7-55f534058770'; contentType='text';  media=$null; title='LinkedIn Texto (corrigido)' },
  @{ id='T20R'; platform='twitter';   target='514d7df2-5fc4-43c4-9d3b-f110e6be7814'; contentType='text';  media=$null; title='Twitter (corrigido)' }
)

$out = @()
foreach ($c in $cases) {
  $content = "RETESTE-AUDITORIA-2026-08-13 [$($c.id) - $($c.title)] Social Canvas Hub."
  $platforms = @("$($c.platform)|$($c.target)")
  $payload = @{ postId = $null; platforms = $platforms; content = $content; userId = $USER_ID }
  if ($c.media) { $payload.mediaUrls = @($c.media); $payload.mediaType = $c.contentType } else { $payload.mediaType = 'text' }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-RestMethod -Uri "$SUPA_URL/functions/v1/publish-post" -Method Post -Headers $H -Body ($payload | ConvertTo-Json -Depth 6) -TimeoutSec 120
    $sw.Stop()
    $pl = $resp.results | Where-Object { $_.platform -eq $c.platform -or $_.platform -like "$($c.platform)|*" } | Select-Object -First 1
    $out += [pscustomobject]@{ caso=$c.id; title=$c.title; success=$pl.success; detail=($pl | ConvertTo-Json -Compress -Depth 5); ms=$sw.ElapsedMilliseconds; error=$pl.error }
  } catch {
    $sw.Stop()
    $out += [pscustomobject]@{ caso=$c.id; title=$c.title; success=$false; detail='HTTP ERROR'; ms=$sw.ElapsedMilliseconds; error=$_.Exception.Message }
  }
  Write-Host "[$($c.id)] ok=$($out[-1].success) $($out[-1].ms)ms"
  Start-Sleep -Milliseconds 500
}
$out | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $PSScriptRoot 'auditoria-reteste.json') -Encoding UTF8
$out | Format-Table caso, title, success, ms, error -AutoSize | Out-String | Write-Host
