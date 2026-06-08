# Run MCP Server for Social Canvas Hub
# Loads environment from .env.mcp and starts the MCP server via stdio

$envFile = Join-Path $PSScriptRoot ".env.mcp"
$mainFile = Join-Path $PSScriptRoot "mcp-social-canvas.ts"

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match "^\s*([^#=]+)=(.+)$") {
      $key = $matches[1].Trim()
      $val = $matches[2].Trim().Trim('"', "'")
      [Environment]::SetEnvironmentVariable($key, $val)
    }
  }
}

if (-not $env:SUPABASE_SERVICE_ROLE_KEY -or -not $env:MCP_USER_ID) {
  Write-Error "Missing required env vars. Create scripts/.env.mcp from .env.mcp.example"
  exit 1
}

npx tsx $mainFile
