param(
    [string]$BackupDir = "_conflict_backup"
)

$ErrorActionPreference = "Stop"

# Create backup of conflicted files
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$conflictedFiles = git diff --name-only --diff-filter=U | Sort-Object

if (-not $conflictedFiles) {
    Write-Host "Nenhum arquivo em conflito encontrado." -ForegroundColor Yellow
    exit 0
}

Write-Host "Resolvendo $($conflictedFiles.Count) arquivos em conflito..." -ForegroundColor Cyan

$resolved = 0
$failed = @()

foreach ($file in $conflictedFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "  [SKIP] $file (não encontrado)" -ForegroundColor Yellow
        continue
    }

    # Backup original
    $backupPath = Join-Path $BackupDir ($file -replace '[/\\]', '_')
    Copy-Item -Path $file -Destination $backupPath -Force

    # Read file content
    $content = Get-Content -Path $file -Raw
    
    # Check if file has conflict markers
    if ($content -notmatch '<<<<<<<|>>>>>>>') {
        Write-Host "  [OK] $file (sem marcadores)" -ForegroundColor Green
        $resolved++
        continue
    }

    # Resolve conflicts: keep "Stashed changes" side
    $originalContent = $content
    
    # Use regex to replace conflict blocks
    # Pattern: <<<<<<< Updated upstream\n...content...\n=======\n...content...\n>>>>>>> Stashed changes
    # Keep only the Stashed changes side
    
    $resolvedContent = $content -replace '(?s)<<<<<<< Updated upstream\n.*?\n=======\n(.*?)>>>>>>> Stashed changes', '$1'
    
    # Handle any remaining conflict markers of other types
    $resolvedContent = $resolvedContent -replace '(?s)<<<<<<<.*?\n(.*?)>>>>>>>.*?(\n|$)', '$1$2'

    if ($resolvedContent -eq $originalContent) {
        Write-Host "  [WARN] $file (regex não encontrou padrão, manual)" -ForegroundColor Magenta
        $failed += $file
        continue
    }

    # Write resolved content
    $resolvedContent | Set-Content -Path $file -NoNewline -Encoding UTF8
    
    Write-Host "  [RESOLVIDO] $file (backup em $backupPath)" -ForegroundColor Green
    $resolved++
}

Write-Host "`n=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Resolvidos: $resolved" -ForegroundColor Green
if ($failed.Count -gt 0) {
    Write-Host "Falharam: $($failed.Count)" -ForegroundColor Red
    foreach ($f in $failed) { Write-Host "  - $f" -ForegroundColor Red }
}
Write-Host "Backups em: $BackupDir" -ForegroundColor Cyan
