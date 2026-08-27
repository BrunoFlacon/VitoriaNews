# Apply migration to remote Supabase instance
# Uses the service_role_key for admin access

$envPath = Join-Path $PSScriptRoot ".." "wacrm-check" ".env.local"
$envContent = Get-Content $envPath -Raw

# Extract service role key
$match = [regex]::Match($envContent, 'SUPABASE_SERVICE_ROLE_KEY="([^"]+)"')
if (!$match.Success) {
    Write-Error "Could not find SUPABASE_SERVICE_ROLE_KEY in $envPath"
    exit 1
}
$serviceRoleKey = $match.Groups[1].Value

$supabaseUrl = "https://supabase.webradiovitoria.com.br"

# Migration file to apply
$migrationPath = Join-Path $PSScriptRoot ".." "supabase" "migrations" "20260705000003_fix_touch_presence.sql"
$sql = Get-Content $migrationPath -Raw

Write-Host "Applying migration: $migrationPath" -ForegroundColor Cyan
Write-Host "Connecting to: $supabaseUrl" -ForegroundColor Cyan

# Execute SQL via Supabase REST API (rpc/pgrsql or direct SQL endpoint)
$body = @{ query = $sql } | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/pgrsql" `
        -Method Post `
        -Headers @{
            "apikey" = $serviceRoleKey
            "Authorization" = "Bearer $serviceRoleKey"
            "Content-Type" = "application/json"
        } `
        -Body $body `
        -ErrorAction Stop

    Write-Host "Migration applied successfully!" -ForegroundColor Green
}
catch {
    # Try alternative endpoint (pg_query or raw SQL)
    Write-Host "First attempt failed, trying alternative..." -ForegroundColor Yellow

    try {
        $response = Invoke-RestMethod -Uri "$supabaseUrl/supabase/sql" `
            -Method Post `
            -Headers @{
                "apikey" = $serviceRoleKey
                "Authorization" = "Bearer $serviceRoleKey"
                "Content-Type" = "application/json"
            } `
            -Body $body `
            -ErrorAction Stop

        Write-Host "Migration applied successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "Direct API failed. You'll need to apply manually." -ForegroundColor Red
        Write-Host "Open: https://supabase.webradiovitoria.com.br/dashboard/sql/new" -ForegroundColor Yellow
        Write-Host "And paste the content of: $migrationPath" -ForegroundColor Yellow
        Write-Host "" -ForegroundColor Yellow
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
