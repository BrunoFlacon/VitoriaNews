# ============================================================================
# auditoria-publicacoes.ps1
# Harness de auditoria de publicações — Social Canvas Hub
# Executa a matriz T01-T20 chamando publish-post (produção) com posts reais
# criados no dashboard e mídias do storage. Gera scripts/auditoria-resultados.json
# ============================================================================
$ErrorActionPreference = 'Stop'

$SUPA_URL  = 'https://ghtkdkauseesambzqfrd.supabase.co'
$USER_ID   = '38cd9720-494e-406a-853d-19d81ae85e99'
$BUCKET    = 'media'
$MEDIA_DIR = "$USER_ID"

# ── 1. Service role key (tabela settings, como fazem os crons) ───────────
$keyJson = & node_modules\.bin\supabase.cmd db query --linked --output json "SELECT value FROM public.settings WHERE key = 'supabase_service_role_key'" 2>$null
$SRK = (($keyJson | ConvertFrom-Json) | Select-Object -First 1).value
if (-not $SRK) { throw 'Nao consegui obter SERVICE_ROLE_KEY das settings.' }

$H  = @{ apikey = $SRK; Authorization = "Bearer $SRK"; 'Content-Type' = 'application/json' }
$HB = @{ apikey = $SRK; Authorization = "Bearer $SRK" }

# ── 2. Gerar mídias de teste (áudio MP3 e PDF válidos) e subir ao storage ─
$tmp = Join-Path $env:TEMP 'auditoria-socialhub'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

# MP3: frames MPEG-1 Layer III 128kbps 44.1kHz (silêncio)
$frame = New-Object byte[] 421
$frame[0] = 0xFF; $frame[1] = 0xFB; $frame[2] = 0x90; $frame[3] = 0x00
$mp3 = New-Object byte[] (421 * 10)
for ($i = 0; $i -lt 10; $i++) { [Array]::Copy($frame, 0, $mp3, $i * 421, 421) }
$mp3Path = Join-Path $tmp 'audit-test-audio.mp3'
[IO.File]::WriteAllBytes($mp3Path, $mp3)

# PDF mínimo de 1 página (xref com offsets calculados)
$objects = @(
  '<</Type/Catalog/Pages 2 0 R>>',
  '<</Type/Pages/Kids[3 0 R]/Count 1>>',
  '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
  '<</Length 47>>stream' + "`n" + 'BT /F1 24 Tf 100 700 Td (Auditoria SocialHub) Tj ET' + "`n" + 'endstream',
  '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>'
)
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('%PDF-1.4')
$offsets = @()
for ($i = 0; $i -lt $objects.Count; $i++) {
  $offsets += $sb.Length
  [void]$sb.AppendLine("$($i + 1) 0 obj$($objects[$i])endobj")
}
$xrefPos = $sb.Length
$count = $objects.Count + 1
[void]$sb.AppendLine("xref")
[void]$sb.AppendLine("0 $count")
[void]$sb.AppendLine('0000000000 65535 f ')
foreach ($off in $offsets) { [void]$sb.AppendLine($off.ToString('0000000000') + ' 00000 n ') }
[void]$sb.AppendLine("trailer<</Size $count/Root 1 0 R>>")
[void]$sb.AppendLine('startxref')
[void]$sb.AppendLine($xrefPos)
[void]$sb.AppendLine('%%EOF')
$pdfPath = Join-Path $tmp 'audit-test-doc.pdf'
[IO.File]::WriteAllText($pdfPath, $sb.ToString())

$IMG = "$SUPA_URL/storage/v1/object/public/$BUCKET/$MEDIA_DIR/b09c0f8b-9c68-41ba-a688-21bdbb7d0078.jpg"
$VID = "$SUPA_URL/storage/v1/object/public/$BUCKET/$MEDIA_DIR/f9f56fdd-6b9b-45dc-b8c5-3fb337019009.mp4"
$AUD = "$SUPA_URL/storage/v1/object/public/$BUCKET/$MEDIA_DIR/audit-test-audio.mp3"
$PDF = "$SUPA_URL/storage/v1/object/public/$BUCKET/$MEDIA_DIR/audit-test-doc.pdf"

function Upload-Media($path, $contentType) {
  $bytes = [IO.File]::ReadAllBytes($path)
  $name = Split-Path $path -Leaf
  $uri = "$SUPA_URL/storage/v1/object/$BUCKET/$MEDIA_DIR/$name"
  $r = Invoke-WebRequest -Uri $uri -Method Post -Headers @{ apikey = $SRK; Authorization = "Bearer $SRK"; 'Content-Type' = $contentType } -Body $bytes -UseBasicParsing -TimeoutSec 60
  return $r.StatusCode
}
Upload-Media $mp3Path 'audio/mpeg' | Out-Null
Upload-Media $pdfPath 'application/pdf' | Out-Null
Write-Host "[setup] audio/pdf enviados ao storage."

# ── 3. Criar posts de teste no dashboard (status draft; sem disparar triggers) ──
function New-TestPost($id, $content, $mediaType, $mediaIds, $platforms) {
  $body = @{
    user_id      = $USER_ID
    content      = $content
    media_type   = $mediaType
    media_ids    = $mediaIds
    platforms    = $platforms
    status       = 'draft'
    scheduled_at = (Get-Date).ToUniversalTime().AddDays(30).ToString('o')
    metadata     = @{ auditoria = $true; caso = $id; data = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss') }
  } | ConvertTo-Json -Depth 5
  $r = Invoke-RestMethod -Uri "$SUPA_URL/rest/v1/scheduled_posts?select=id" -Method Post -Headers $H -Body $body -TimeoutSec 60
  return $r[0].id
}

$cases = @(
  @{ id='T01'; platform='facebook';    target='c8d691ac-8814-49f5-a569-2dfb5e26eadc';  contentType='text';   media=$null;   title='Facebook Texto' },
  @{ id='T02'; platform='facebook';    target='c8d691ac-8814-49f5-a569-2dfb5e26eadc';  contentType='image';  media=$IMG;   title='Facebook Foto' },
  @{ id='T03'; platform='facebook';    target='c8d691ac-8814-49f5-a569-2dfb5e26eadc';  contentType='video';  media=$VID;   title='Facebook Video' },
  @{ id='T04'; platform='instagram';   target='11df6dcd-9f04-43bf-b045-7f5d51e7010f';  contentType='image';  media=$IMG;   title='Instagram Foto' },
  @{ id='T05'; platform='instagram';   target='11df6dcd-9f04-43bf-b045-7f5d51e7010f';  contentType='video';  media=$VID;   title='Instagram Reels (video)' },
  @{ id='T06'; platform='instagram';   target='11df6dcd-9f04-43bf-b045-7f5d51e7010f';  contentType='story';  media=$IMG;   title='Instagram Story' },
  @{ id='T07'; platform='threads';     target='1694f354-98d9-4105-abaa-df4dc995c189';  contentType='text';   media=$null;  title='Threads Texto' },
  @{ id='T08'; platform='threads';     target='1694f354-98d9-4105-abaa-df4dc995c189';  contentType='image';  media=$IMG;   title='Threads Foto' },
  @{ id='T09'; platform='whatsapp';    target='ee7ffa1d-d032-433c-a747-b4639d529c9a';  contentType='text';   media=$null;  title='WhatsApp Texto' },
  @{ id='T10'; platform='whatsapp';    target='ee7ffa1d-d032-433c-a747-b4639d529c9a';  contentType='image';  media=$IMG;   title='WhatsApp Foto' },
  @{ id='T11'; platform='whatsapp';    target='ee7ffa1d-d032-433c-a747-b4639d529c9a';  contentType='video';  media=$VID;   title='WhatsApp Video' },
  @{ id='T12'; platform='whatsapp';    target='ee7ffa1d-d032-433c-a747-b4639d529c9a';  contentType='audio';  media=$AUD;   title='WhatsApp Audio' },
  @{ id='T13'; platform='whatsapp';    target='ee7ffa1d-d032-433c-a747-b4639d529c9a';  contentType='document'; media=$PDF;  title='WhatsApp PDF' },
  @{ id='T14'; platform='telegram';    target='7d4a4555-f435-4e5a-bd80-afc39d3eeaa5';  contentType='text';   media=$null;  title='Telegram Texto' },
  @{ id='T15'; platform='telegram';    target='7d4a4555-f435-4e5a-bd80-afc39d3eeaa5';  contentType='image';  media=$IMG;   title='Telegram Foto' },
  @{ id='T16'; platform='youtube';     target='b578a066-e742-40a4-9e33-c01ebcbc1c05';  contentType='video';  media=$VID;   title='YouTube Video longo' },
  @{ id='T17'; platform='youtube';     target='b578a066-e742-40a4-9e33-c01ebcbc1c05';  contentType='video';  media=$VID;   title='YouTube Short' },
  @{ id='T18'; platform='tiktok';      target='8062240b-022d-404f-8739-63d526b8ab43';  contentType='video';  media=$VID;   title='TikTok Video' },
  @{ id='T19'; platform='linkedin';    target='75b990f3-35c3-4be6-bbb7-55f534058770';  contentType='text';   media=$null;  title='LinkedIn Texto' },
  @{ id='T20'; platform='twitter';     target='514d7df2-5fc4-43c4-9d3b-f110e6be7814';  contentType='text';   media=$null;  title='Twitter (nao conectado)' }
)

$results = @()
foreach ($c in $cases) {
  $content = "TESTE-AUDITORIA-2026-08-13 [$($c.id) - $($c.title)] " +
             "Verificacao de publicacao do Social Canvas Hub. Conteudo de auditoria tecnica automatizada."
  $platforms = @($c.platform)
  if ($c.target) { $platforms = @("$($c.platform)|$($c.target)") }

  $postId = New-TestPost $c.id $content $c.contentType @() $platforms
  Write-Host "[$($c.id)] post criado: $postId"

  $payload = @{
    postId    = $postId
    platforms = $platforms
    content   = $content
    userId    = $USER_ID
  }
  if ($c.media) {
    $payload.mediaUrls = @($c.media)
    if ($c.contentType -ne 'document') { $payload.mediaType = $c.contentType }
  } else {
    $payload.mediaType = 'text'
  }
  if ($c.platform -eq 'whatsapp') { $payload.recipientPhone = '5514999061720' }
  if ($c.platform -eq 'telegram') { $payload.chatId = '@TupaNoticias' }
  if ($c.platform -eq 'youtube')  { $payload.postType = 'video' }

  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-RestMethod -Uri "$SUPA_URL/functions/v1/publish-post" -Method Post -Headers $H -Body ($payload | ConvertTo-Json -Depth 6) -TimeoutSec 90
    $sw.Stop()
    $pl = $resp.results | Where-Object { $_.platform -eq $c.platform -or $_.platform -eq $c.platform -or $_.platform -like "$($c.platform)|*" } | Select-Object -First 1
    $results += [pscustomobject]@{
      caso = $c.id; title = $c.title; postId = $postId
      success = $pl.success; detail = ($pl | ConvertTo-Json -Compress -Depth 5)
      httpOk = $true; error = $pl.error; ms = $sw.ElapsedMilliseconds
    }
  } catch {
    $sw.Stop()
    $results += [pscustomobject]@{
      caso = $c.id; title = $c.title; postId = $postId
      success = $false; detail = 'HTTP ERROR'; httpOk = $false
      error = $_.Exception.Message; ms = $sw.ElapsedMilliseconds
    }
  }
  Write-Host "[$($c.id)] ok=$($results[-1].success) em $($results[-1].ms)ms"
  Start-Sleep -Milliseconds 300
}

$results | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $PSScriptRoot 'auditoria-resultados.json') -Encoding UTF8
Write-Host "`n=== RESULTADOS ==="
$results | Format-Table caso, title, success, ms, error -AutoSize | Out-String | Write-Host
