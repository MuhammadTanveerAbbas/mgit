#!/bin/bash
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  Installing @themvpguy/mgit..."
echo -e "${RESET}"

# Check Node.js
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js not found. Install Node 18+ first: https://nodejs.org${RESET}"
  exit 1
fi

NODE_VER=$(node -e "console.log(process.version.slice(1).split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${RED}✗ Node.js 18+ required. You have $(node -v)${RESET}"
  exit 1
fi

# Check pnpm, fallback to npm
if command -v pnpm &>/dev/null; then
  PKG="pnpm"
elif command -v npm &>/dev/null; then
  PKG="npm"
else
  echo -e "${RED}✗ pnpm or npm required.${RESET}"
  exit 1
fi

echo -e "  ${DIM}Using: $PKG${RESET}"

$PKG install
$PKG link --global 2>/dev/null || npm link

echo ""
echo -e "  ${GREEN}${BOLD}✓ mgit installed successfully${RESET}"
echo -e "  ${DIM}Run: mgit${RESET}"
echo ""
echo -e "  ${DIM}Built by The MVP Guy — themvpguy.vercel.app${RESET}"
echo ""
