#!/usr/bin/env bash
set -euo pipefail

echo "== Dev environment diagnostics =="

check() {
  local name="$1"; shift
  local hint="$*"
  if command -v "$name" >/dev/null 2>&1; then
    local ver
    ver=$("$name" --version 2>/dev/null || echo installed)
    echo "$(printf '%-8s' "$name") : ${ver%%$'\n'*}"
  else
    echo "$(printf '%-8s' "$name") : missing"
    echo "  hint    : $hint"
  fi
}

check node   "Install Node (use nvm). Version from .nvmrc"
check npm    "Comes with Node"
check pnpm   "Optional: npm i -g pnpm"
check yarn   "Optional: npm i -g yarn"
check python "Optional: Python 3.x for scripts"
check pip    "Python package manager"
check uv     "Optional: pipx install uv"
check rustc  "Optional: rustup (Rust toolchain)"
check go     "Optional: Go toolchain"
check dotnet "Optional: .NET SDK"
check rg     "ripgrep (fast search)"
check fd     "fd (fast file search)"
check bat    "bat (cat with syntax highlight)"

cat <<'EOF'

Project scripts:
  npm run dev   # start dev server
  npm run build # production build
  npm run lint  # lint code
  npm test      # placeholder

Notes:
- Use Node version specified in .nvmrc (nvm use).
- Keep node_modules cached to speed up installs.
EOF

