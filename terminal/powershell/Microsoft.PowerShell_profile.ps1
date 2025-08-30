# PowerShell 7 profile — удобный терминал по умолчанию
# Компоненты: PSReadLine, Oh My Posh, posh-git, Terminal-Icons, zoxide, fzf, eza, bat, rg

### PSReadLine: удобное редактирование и подсказки
if (Get-Module -ListAvailable -Name PSReadLine) {
  Import-Module PSReadLine
  Set-PSReadLineOption -PredictionSource History -PredictionViewStyle ListView -EditMode Windows -BellStyle None -HistoryNoDuplicates:$true -MaximumHistoryCount 100000
  Set-PSReadLineKeyHandler -Key Tab -Function Complete
} else {
  Write-Verbose "PSReadLine not found. Install: Install-Module PSReadLine -Scope CurrentUser"
}

### Oh My Posh: красивый и быстрый промпт
if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
  oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\jandedobbeleer.omp.json" | Invoke-Expression
}

### Git/иконки
if (Get-Module -ListAvailable -Name posh-git) { Import-Module posh-git -ErrorAction SilentlyContinue }
if (Get-Module -ListAvailable -Name Terminal-Icons) { Import-Module Terminal-Icons -ErrorAction SilentlyContinue }

### zoxide: умная навигация (z)
if (Get-Command zoxide -ErrorAction SilentlyContinue) {
  Invoke-Expression (& { (zoxide init powershell | Out-String) })
  Set-Alias z zoxide
  function c { z @args }
}

### fzf: fuzzy-поиск + биндинги (через PSFzf, если установлен)
if (Get-Module -ListAvailable -Name PSFzf) {
  Import-Module PSFzf -ErrorAction SilentlyContinue
  Set-PsFzfOption -PsReadlineChordProvider 'Ctrl+f' -PsReadlineChordReverseHistory 'Ctrl+r' | Out-Null
}

### Полезные переменные окружения
if (-not $env:BAT_THEME) { $env:BAT_THEME = 'OneHalfDark' }
$env:LESS = '-R'
$env:FZF_DEFAULT_OPTS = "--height 40% --layout=reverse --border"
if (Get-Command rg -ErrorAction SilentlyContinue) { $env:FZF_DEFAULT_COMMAND = "rg --files --hidden --glob !.git/" }

### Алиасы и функции (c проверками наличия утилит)
# eza / ls
if (Get-Command eza -ErrorAction SilentlyContinue) {
  function ls { eza --icons --group-directories-first @args }
  function ll { eza -l --icons --git --group-directories-first @args }
  function la { eza -la --icons --git --group-directories-first @args }
  function lt { eza -la --icons --git --group-directories-first --tree @args }
} else {
  Set-Alias ls Get-ChildItem
  function ll { Get-ChildItem -Force }
  function la { Get-ChildItem -Force -Hidden }
}

# bat / cat
if (Get-Command bat -ErrorAction SilentlyContinue) {
  function cat { bat -pp @args }
} else {
  Set-Alias cat Get-Content
}

# rg / grep
if (Get-Command rg -ErrorAction SilentlyContinue) {
  function grep { rg -n --hidden --glob !.git/ @args }
}

# mkdir+cd
function mkcd {
  param([Parameter(Mandatory=$true)][string]$path)
  New-Item -ItemType Directory -Force -Path $path | Out-Null
  Set-Location $path
}

### Git-хелперы
function gco { git checkout @args }
function gb { git branch @args }
function gst { git status -sb @args }
function glg { git log --oneline --graph --decorate @args }
function gcm { git commit -m @args }
function gca { git add -A; git commit -m @args }
function gpp { git pull --rebase --autostash; git push }

### Безопасное удаление (без подтверждений)
function rmrf {
  param([Parameter(Mandatory=$true)][string]$target)
  Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
}

### Быстрый запуск редактора (если есть VS Code)
if (Get-Command code -ErrorAction SilentlyContinue) { function e { code . } }

### Запасной промпт, если нет Oh My Posh
if (-not (Get-Command oh-my-posh -ErrorAction SilentlyContinue)) {
  function prompt {
    $loc = Get-Location
    $git = ""
    if (Get-Command git -ErrorAction SilentlyContinue) {
      try { $branch = git rev-parse --abbrev-ref HEAD 2>$null; if ($LASTEXITCODE -eq 0 -and $branch) { $git = " [$branch]" } } catch {}
    }
    "PS $loc$git> "
  }
}

$ErrorActionPreference = 'Continue'

