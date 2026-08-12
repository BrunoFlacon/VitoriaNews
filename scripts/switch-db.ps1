param(
    [ValidateSet("supabase", "local", "status")]
    [string]$Mode = "status"
)

$EnvFile = Join-Path $PSScriptRoot "..\.env"
$VarName = "VITE_USE_LOCAL_DB"

function Get-EnvVar($key) {
    $match = Select-String "^$key=" $EnvFile | Select-Object -First 1
    if ($match) { return ($match.Line -split "=", 2)[1] }
    return $null
}

function Set-EnvVar($key, $value) {
    $content = Get-Content $EnvFile -Raw
    if ($content -match "(?m)^$key=.*") {
        $content = $content -replace "(?m)^$key=.*", "$key=$value"
    } else {
        $content += "`r`n$key=$value"
    }
    Set-Content $EnvFile -Value $content -NoNewline
}

$current = Get-EnvVar $VarName

switch ($Mode) {
    "local" {
        Set-EnvVar $VarName "true"
        Write-Host "[OK] Modo alterado para: LOCAL" -ForegroundColor Green
        Write-Host "      Database: postgresql://postgres@localhost:5433/ghtkdkauseesambzqfrd" -ForegroundColor Cyan
        Write-Host "      Server:   http://localhost:3001" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Nao esqueca de iniciar o servidor local:" -ForegroundColor Yellow
        Write-Host "  npm run db:server" -ForegroundColor White
    }
    "supabase" {
        Set-EnvVar $VarName "false"
        Write-Host "[OK] Modo alterado para: SUPABASE" -ForegroundColor Green
        Write-Host "      URL: https://ghtkdkauseesambzqfrd.supabase.co" -ForegroundColor Cyan
    }
    "status" {
        if ($current -eq "true") {
            Write-Host "[STATUS] LOCAL" -ForegroundColor Cyan
            Write-Host "  Host: localhost:5433"
            Write-Host "  Database: ghtkdkauseesambzqfrd"
        } else {
            Write-Host "[STATUS] SUPABASE" -ForegroundColor Cyan
            Write-Host "  URL: https://ghtkdkauseesambzqfrd.supabase.co"
        }
        Write-Host ""
        Write-Host "Uso: .\scripts\switch-db.ps1 local    -> usar banco local" -ForegroundColor Yellow
        Write-Host "     .\scripts\switch-db.ps1 supabase -> usar Supabase"   -ForegroundColor Yellow
        Write-Host "     .\scripts\switch-db.ps1 status   -> ver status atual" -ForegroundColor Yellow
    }
}
