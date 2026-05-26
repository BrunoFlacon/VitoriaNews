# ═══════════════════════════════════════════════════════════════
# Deploy EFI Bank - Edge Functions + Secrets
# ═══════════════════════════════════════════════════════════════

Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Deploy EFI Bank - Passo a Passo             ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan

# ─── 1. Deploy Edge Functions ───────────────────────────────

Write-Host "`n📦 Deploying Edge Functions..." -ForegroundColor Yellow

Write-Host "  → efi-create-charge..." -NoNewline
supabase functions deploy efi-create-charge
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ❌" -ForegroundColor Red
}

Write-Host "  → efi-webhook..." -NoNewline
supabase functions deploy efi-webhook
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ❌" -ForegroundColor Red
}

# ─── 2. Set Secrets (substitua pelos valores reais) ────────

Write-Host "`n🔐 Setting Supabase Secrets..." -ForegroundColor Yellow

# Webhook secret (auto-generate if not set)
$whSecret = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
Write-Host "  → EFI_WEBHOOK_SECRET (auto-generated)" -ForegroundColor DarkGray
supabase secrets set EFI_WEBHOOK_SECRET="$whSecret"
Write-Host "  ⚠️  Guarde este secret! URL do webhook: https://SEU_PROJ.supabase.co/functions/v1/efi-webhook?token=$whSecret" -ForegroundColor Yellow

Write-Host "  (Edite este script com suas credenciais reais)" -ForegroundColor DarkYellow

# Descomente e edite com suas credenciais:
# supabase secrets set EFI_CLIENT_ID="seu_client_id"
# supabase secrets set EFI_CLIENT_SECRET="seu_client_secret"
# supabase secrets set EFI_PIX_KEY="sua_chave_pix"
# supabase secrets set EFI_CERTIFICATE_BASE64="base64_do_seu_certificado"
# supabase secrets set EFI_SANDBOX="true"

Write-Host "`n✅ Deploy concluído!" -ForegroundColor Green
Write-Host "Para testar em sandbox, execute manualmente:" -ForegroundColor Cyan
Write-Host "  supabase secrets set EFI_SANDBOX='true'" -ForegroundColor White
