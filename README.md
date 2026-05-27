# mgit
[![npm version](https://badge.fury.io/js/%40themvpguy%2Fmgit.svg)](https://www.npmjs.com/package/@themvpguy/mgit)
[![npm downloads](https://img.shields.io/npm/dm/@themvpguy/mgit.svg)](https://www.npmjs.com/package/@themvpguy/mgit)
> Multi-client GitHub workflow CLI — manage SSH keys, conventional commits,
> and daily git ops across all your client repos.

Built by **[The MVP Guy](https://themvpguy.vercel.app)** — Muhammad Tanveer Abbas

---

## Install

### Linux
```bash
git clone https://github.com/MuhammadTanveerAbbas/mgit.git
cd mgit && chmod +x install.sh && ./install.sh
```

### Windows (Git Bash)
```bash
git clone https://github.com/MuhammadTanveerAbbas/mgit.git
cd mgit && ./install.sh
```

### Windows (PowerShell)
```powershell
git clone https://github.com/MuhammadTanveerAbbas/mgit.git
cd mgit
.\install.ps1
```

### Via npm
```bash
npm install -g @themvpguy/mgit
```

**Requirements:** Node.js 18+, Git

---

## Commands

| Command | What it does |
|---|---|
| `mgit setup [client]` | SSH wizard — gen key, update config, test connection |
| `mgit connect [client]` | Link local project to client GitHub repo |
| `mgit test [client]` | Test SSH connection for one or all clients |
| `mgit list` | Show all configured clients |
| `mgit status` | Rich status — remote, identity, changes |
| `mgit sync` | Pull latest from remote |
| `mgit branch [name]` | Create conventional feature branch |
| `mgit save [message]` | Stage all + conventional commit |
| `mgit push` | Push current branch |
| `mgit config` | Set git identity for this repo only |
| `mgit daily` | Interactive daily workflow (sync→branch→save→push) |
| `mgit fix` | Fix common git problems interactively |
| `mgit checklist` | New client project checklist |
| `mgit aliases` | Add git aliases globally (st, co, last, undo...) |
| `mgit remove [client]` | Clean offboard — delete keys + SSH config |
| `mgit ref` | Quick reference for all commands |

---

## Typical Flows

**New client onboarding (once):**
```
mgit setup acmecorp
# → generates SSH key
# → shows public key to add to GitHub
# → updates ~/.ssh/config
# → tests the connection
```

**Connect a local project:**
```
cd ~/clients/acmecorp/my-app
mgit connect acmecorp
# → set remote with SSH alias
# → set per-repo git identity
```

**Daily work:**
```
mgit sync          # pull latest
mgit branch        # create feat/fix branch
# ... do work ...
mgit save          # conventional commit
mgit push          # push branch → open PR on GitHub
```

Or the full loop:
```
mgit daily
```

**Something broke:**
```
mgit fix
# → interactive menu of common problems + auto-fixes
```

---

## SSH Config Pattern

`mgit setup` manages this automatically, but here's what it writes:

```
# Client: acmecorp
Host github-acmecorp
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_acmecorp
```

Remote URLs always use the alias, not `github.com`:
```
git@github-acmecorp:acmecorp/my-app.git
```

---

## Platforms

| Platform | Status |
|----------|--------|
| Linux | ✓ Full support |
| Windows (Git Bash) | ✓ Full support |
| Windows (WSL) | ✓ Full support |
| macOS | ⏳ Coming soon |

---

## Uninstall

```bash
chmod +x uninstall.sh && ./uninstall.sh
```

---

## Built by The MVP Guy

Muhammad Tanveer Abbas builds production-ready B2B SaaS MVPs
in 14–21 days for non-technical founders.

**→ [themvpguy.vercel.app](https://themvpguy.vercel.app)**

```
Validation MVP    $3,500 — 14 days
Production SaaS   $6,000 — 21 days
Full refund if deadline missed.
```

---

MIT License · © 2026 Muhammad Tanveer Abbas
