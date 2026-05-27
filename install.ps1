# mgit Windows Installer — The MVP Guy
# Run in PowerShell as Administrator or in Windows Terminal

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  Installing @themvpguy/mgit..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  X Node.js not found. Install from: https://nodejs.org" -ForegroundColor Red
    exit 1
}

$nodeVer = [int](node -e "console.log(process.version.slice(1).split('.')[0])")
if ($nodeVer -lt 18) {
    Write-Host "  X Node.js 18+ required. You have $(node -v)" -ForegroundColor Red
    exit 1
}

# Check Git Bash warning
Write-Host "  NOTE: Run mgit commands in Git Bash or WSL, not PowerShell." -ForegroundColor Yellow
Write-Host ""

# Install
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm install
    pnpm link --global
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install
    npm link
} else {
    Write-Host "  X pnpm or npm required." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  mgit installed successfully" -ForegroundColor Green
Write-Host "  Run: mgit" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Built by The MVP Guy - themvpguy.vercel.app" -ForegroundColor DarkGray
Write-Host ""
