# Script to remove Serena MCP server from Claude Code configuration

$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"

Write-Host "Searching for Claude Code configuration file..." -ForegroundColor Cyan

if (-not (Test-Path $configPath)) {
    Write-Host "Error: Configuration file not found at: $configPath" -ForegroundColor Red
    Write-Host "Please check if Claude Code is installed" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "File found: $configPath" -ForegroundColor Green

# Create backup
$backupPath = "$configPath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $configPath $backupPath
Write-Host "Backup created: $backupPath" -ForegroundColor Green

# Read configuration
try {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json

    if ($config.mcpServers.PSObject.Properties.Name -contains "serena") {
        Write-Host "Found MCP server 'serena', removing..." -ForegroundColor Yellow

        # Remove serena from configuration
        $config.mcpServers.PSObject.Properties.Remove("serena")

        # Save updated configuration
        $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8

        Write-Host "SUCCESS: MCP server 'serena' has been removed from configuration!" -ForegroundColor Green
        Write-Host "Please restart Claude Code for changes to take effect." -ForegroundColor Cyan
    } else {
        Write-Host "MCP server 'serena' not found in configuration." -ForegroundColor Yellow
        Write-Host "Available MCP servers:" -ForegroundColor Cyan
        $config.mcpServers.PSObject.Properties.Name | ForEach-Object { Write-Host "  - $_" }
    }

} catch {
    Write-Host "Error processing configuration: $_" -ForegroundColor Red
    Write-Host "Restoring from backup..." -ForegroundColor Yellow
    Copy-Item $backupPath $configPath -Force
    Write-Host "Configuration restored from backup" -ForegroundColor Green
    exit 1
}

Write-Host ""
Write-Host "Done! Press any key to exit..." -ForegroundColor Green
pause
