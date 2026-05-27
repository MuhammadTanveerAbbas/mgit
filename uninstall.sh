#!/bin/bash
RED='\033[0;31m'; GREEN='\033[0;32m'; DIM='\033[2m'; RESET='\033[0m'
echo ""
if command -v pnpm &>/dev/null; then
  pnpm unlink --global mgit 2>/dev/null || true
  pnpm unlink --global @themvpguy/mgit 2>/dev/null || true
else
  npm unlink --global mgit 2>/dev/null || true
fi
echo -e "  ${GREEN}✓ mgit uninstalled${RESET}"
echo -e "  ${DIM}  Thanks for using The MVP Guy tools — themvpguy.vercel.app${RESET}"
echo ""
