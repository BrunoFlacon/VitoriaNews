$functionsDir = "C:\wamp64\www\lovableproj\social-canvas-hub\supabase\functions"
$importLine = 'import { resolveCorsOrigin } from "../_shared/cors.ts";'
$specialDirs = @{"social-oauth-init"=$true; "social-oauth-callback"=$true; "sync-telegram-chats"=$true; "automation-api"=$true}

function ProcessFile($filePath) {
    $dirName = $filePath.Directory.Name
    Write-Host ("Processing: " + $dirName + "\index.ts") -ForegroundColor Yellow
    $lines = Get-Content -Path $filePath.FullName

    if ($lines -match "resolveCorsOrigin") {
        Write-Host "  Already processed, skipping" -ForegroundColor Gray
        return
    }

    # 1. Add import after last import line
    $lastImportIdx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^import ') { $lastImportIdx = $i }
    }
    if ($lastImportIdx -ge 0) {
        $lines = $lines[0..$lastImportIdx] + @($importLine) + $lines[($lastImportIdx+1)..($lines.Count-1)]
    }

    # 2. Find corsHeaders block position
    $corsStartIdx = -1; $corsEndIdx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^const corsHeaders = \{') {
            $corsStartIdx = $i
            $braceCount = 1
            $j = $i + 1
            while ($j -lt $lines.Count -and $braceCount -gt 0) {
                $trimmed = $lines[$j].Trim()
                if ($trimmed -match '\{') { $braceCount++ }
                if ($trimmed -match '\}') { $braceCount-- }
                if ($braceCount -eq 0) { $corsEndIdx = $j; break }
                $j++
            }
            break
        }
    }

    if ($corsStartIdx -lt 0) {
        Write-Host "  No corsHeaders block found" -ForegroundColor Red
        return
    }

    # 3. Replace corsHeaders constant with function
    $newLines = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($i -eq $corsStartIdx) {
            $newLines += "const corsHeaders = (req) => ({"
        } elseif ($i -gt $corsStartIdx -and $i -le $corsEndIdx) {
            $trimmed = $lines[$i].Trim()
            if ($trimmed -match '^\};?' -or $trimmed -eq '}') {
                $newLines += "});"
            } elseif ($trimmed -match "^'Access-Control-Allow-Origin'") {
                $origLine = $lines[$i]
                $indent = ""
                if ($origLine -match '^(\s+)') { $indent = $matches[1] }
                $newLines += ("${indent}'Access-Control-Allow-Origin': resolveCorsOrigin(req),")
            } else {
                $newLines += $lines[$i]
            }
        } else {
            $newLines += $lines[$i]
        }
    }
    $lines = $newLines

    # 4. Replace corsHeaders value references with corsHeaders(req)
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($i -ge $corsStartIdx -and $i -le $corsEndIdx) { continue }
        $lines[$i] = $lines[$i] -replace '(?<!# )corsHeaders(?=[\)\s,])', 'corsHeaders(req)'
    }

    Set-Content -Path $filePath.FullName -Value ($lines -join "`n")
    Write-Host "  Done!" -ForegroundColor Green
}

$files = Get-ChildItem -Path $functionsDir -Recurse -Filter "index.ts" | Where-Object {
    $_.DirectoryName -notmatch '_shared' -and $_.DirectoryName -notmatch '\.git' -and -not $specialDirs.ContainsKey($_.Directory.Name)
}

$count = 0
foreach ($file in $files) {
    $count++
    ProcessFile $file
}

Write-Host ("`nProcessed " + $count + " files!") -ForegroundColor Cyan
