import { execa } from 'execa';

// ── Run a git command, return stdout ─────────────────────────────────────────

export async function git(...args) {
  const { stdout } = await execa('git', args, { cwd: process.cwd() });
  return stdout.trim();
}

// ── Quietly run git, return { ok, stdout, stderr } ───────────────────────────

export async function gitTry(...args) {
  try {
    const { stdout, stderr } = await execa('git', args, { cwd: process.cwd() });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (e) {
    return { ok: false, stdout: '', stderr: e.stderr || e.message };
  }
}

// ── Check if we're inside a git repo ─────────────────────────────────────────

export async function isGitRepo() {
  const r = await gitTry('rev-parse', '--is-inside-work-tree');
  return r.ok && r.stdout === 'true';
}

// ── Current branch ───────────────────────────────────────────────────────────

export async function currentBranch() {
  const r = await gitTry('rev-parse', '--abbrev-ref', 'HEAD');
  return r.ok ? r.stdout : null;
}

// ── Remote origin URL ────────────────────────────────────────────────────────

export async function remoteUrl(name = 'origin') {
  const r = await gitTry('remote', 'get-url', name);
  return r.ok ? r.stdout : null;
}

// ── All remotes ──────────────────────────────────────────────────────────────

export async function remoteList() {
  const r = await gitTry('remote', '-v');
  return r.ok ? r.stdout : '';
}

// ── Repo-local git config value ───────────────────────────────────────────────

export async function getConfig(key) {
  const r = await gitTry('config', key);
  return r.ok ? r.stdout : null;
}

// ── Set repo-local config (no --global) ─────────────────────────────────────

export async function setConfig(key, value) {
  await execa('git', ['config', key, value], { cwd: process.cwd() });
}

// ── Uncommitted changes count ────────────────────────────────────────────────

export async function changedFiles() {
  const r = await gitTry('status', '--porcelain');
  if (!r.ok || !r.stdout) return 0;
  return r.stdout.split('\n').filter(Boolean).length;
}

// ── Last commit message ───────────────────────────────────────────────────────

export async function lastCommit() {
  const r = await gitTry('log', '-1', '--oneline');
  return r.ok ? r.stdout : null;
}

// ── Has upstream set for current branch ──────────────────────────────────────

export async function hasUpstream() {
  const branch = await currentBranch();
  if (!branch) return false;
  const r = await gitTry('rev-parse', `--verify`, `origin/${branch}`);
  return r.ok;
}

// ── Run SSH test ─────────────────────────────────────────────────────────────

export async function testSSH(alias) {
  try {
    await execa('ssh', ['-T', '-o', 'StrictHostKeyChecking=no', `git@${alias}`]);
    return { ok: true, out: '' };
  } catch (e) {
    const msg = e.stderr || '';
    // SSH to GitHub always "fails" with exit code 1 but authenticates OK
    if (msg.includes('successfully authenticated')) {
      return { ok: true, out: msg };
    }
    return { ok: false, out: msg };
  }
}

// ── Is git installed ─────────────────────────────────────────────────────────

export async function gitInstalled() {
  try {
    await execa('git', ['--version']);
    return true;
  } catch {
    return false;
  }
}

// ── Slugify a branch name ─────────────────────────────────────────────────────

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Build SSH remote URL from alias + owner/repo ──────────────────────────────

export function sshRemote(alias, ownerRepo) {
  const clean = ownerRepo.replace(/\.git$/, '');
  return `git@${alias}:${clean}.git`;
}
