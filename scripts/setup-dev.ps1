#requires -Version 5.1
<#
  Setup/dev diagnostics for Windows PowerShell.
  Checks presence and versions of key SDKs/PMs and CLI tools.
  Does not install automatically; prints next-step hints.
#>

function Test-Command {
  param([string]$Name)
  $null = Get-Command $Name -ErrorAction SilentlyContinue
  return $?
}

$checks = @(
  @{ name = 'node';      hint = 'Install Node (use nvm-windows). Version from .nvmrc'; },
  @{ name = 'npm';       hint = 'Comes with Node'; },
  @{ name = 'pnpm';      hint = 'Optional: npm i -g pnpm'; },
  @{ name = 'yarn';      hint = 'Optional: npm i -g yarn'; },
  @{ name = 'python';    hint = 'Optional: Python 3.x for scripts'; },
  @{ name = 'pip';       hint = 'Python package manager'; },
  @{ name = 'uv';        hint = 'Optional: pipx install uv'; },
  @{ name = 'rustc';     hint = 'Optional: rustup (Rust toolchain)'; },
  @{ name = 'go';        hint = 'Optional: Go toolchain'; },
  @{ name = 'dotnet';    hint = 'Optional: .NET SDK'; },
  @{ name = 'rg';        hint = 'ripgrep (fast search)'; },
  @{ name = 'fd';        hint = 'fd (fast file search)'; },
  @{ name = 'bat';       hint = 'bat (cat with syntax highlight)'; }
)

Write-Host "== Dev environment diagnostics ==" -ForegroundColor Cyan
foreach ($c in $checks) {
  if (Test-Command $c.name) {
    try {
      $ver = & $c.name --version 2>$null
    } catch { $ver = 'installed' }
    Write-Host ("{0,-8} : {1}" -f $c.name, ($ver -split "`n")[0]) -ForegroundColor Green
  } else {
    Write-Host ("{0,-8} : missing" -f $c.name) -ForegroundColor Yellow
    Write-Host ("  hint    : {0}" -f $c.hint) -ForegroundColor DarkGray
  }
}

Write-Host "`nProject scripts:" -ForegroundColor Cyan
Write-Host "  npm run dev   # start dev server"
Write-Host "  npm run build # production build"
Write-Host "  npm run lint  # lint code"
Write-Host "  npm test      # placeholder"

Write-Host "`nNotes:" -ForegroundColor Cyan
Write-Host "- Use Node version specified in .nvmrc (nvm use)."
Write-Host "- Keep node_modules cached to speed up installs."

