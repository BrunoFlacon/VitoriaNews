param(
    [string]$DbName = "ghtkdkauseesambzqfrd",
    [string]$Port = "5433",
    [string]$User = "postgres",
    [string]$Password = "123456"
)

$ErrorActionPreference = "Continue"
$PSQL = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$RootDir = Split-Path -Parent $PSScriptRoot
$MigrationDir = Join-Path $RootDir "supabase\migrations"
$LogFile = Join-Path $RootDir "scripts\setup-local-db.log"

$env:PGPASSWORD = $Password

Write-Host "=== Setup do Banco Local ===" -ForegroundColor Cyan
Write-Host "Database: $DbName | Port: $Port | User: $User" -ForegroundColor Cyan
Write-Host ""

# 1. Criar stubs do Auth
Write-Host "[1/3] Criando stubs do Auth Supabase..." -ForegroundColor Yellow
& $PSQL -h localhost -p $Port -U $User -d $DbName -f "$PSScriptRoot\setup-local-db.sql" 2>&1 | Tee-Object -FilePath $LogFile
Write-Host "[1/3] Stubs criados!" -ForegroundColor Green
Write-Host ""

# 2. Aplicar migrations
Write-Host "[2/3] Aplicando migrations..." -ForegroundColor Yellow

$migrations = Get-ChildItem -Path $MigrationDir -Filter "*.sql" -File | 
    Where-Object { $_.Name -notlike "RUN_ALL*" } |
    Sort-Object Name

$total = $migrations.Count
$ok = 0
$fail = 0
$failedFiles = @()

foreach ($m in $migrations) {
    Write-Host "  -> $($m.Name)..." -NoNewline
    $output = & $PSQL -h localhost -p $Port -U $User -d $DbName -f $m.FullName 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        Write-Host " OK" -ForegroundColor Green
        $ok++
    } else {
        Write-Host " FALHOU (ignorando)" -ForegroundColor DarkYellow
        $fail++
        $failedFiles += $m.Name
        $output | Out-File "$PSScriptRoot\migration-error.log" -Append
    }
}

Write-Host ""
Write-Host "[2/3] Resumo: $ok/$total OK, $fail/$total falharam" -ForegroundColor Cyan
if ($failedFiles.Count -gt 0) {
    Write-Host "Falharam:" -ForegroundColor DarkYellow
    $failedFiles | ForEach-Object { Write-Host "  - $_" }
}

# 3. Verificar tabelas criadas
Write-Host ""
Write-Host "[3/3] Verificando tabelas..." -ForegroundColor Yellow
& $PSQL -h localhost -p $Port -U $User -d $DbName -c "\dt public.*" 2>&1

Write-Host ""
Write-Host "=== Setup concluído! ===" -ForegroundColor Cyan
