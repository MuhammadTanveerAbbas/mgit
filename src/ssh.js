import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { isWindows } from './platform.js';

const SSH_DIR    = path.join(os.homedir(), '.ssh');
const SSH_CONFIG = path.join(SSH_DIR, 'config');

export function sshConfigPath() {
  return SSH_CONFIG;
}

export function sshDirPath() {
  return SSH_DIR;
}

function normalizePath(p) {
  if (isWindows) {
    return p.replace(os.homedir(), '%USERPROFILE%').replace(/\//g, '\\');
  }
  return p.replace(os.homedir(), '~');
}

export function displayPath(p) {
  return normalizePath(p);
}

export function parseConfig(raw) {
  const blocks = [];
  let current = null;

  raw.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('host ')) {
      if (current) blocks.push(current);
      current = { host: trimmed.split(/\s+/)[1], lines: [line], raw: true };
    } else if (current) {
      current.lines.push(line);
    } else {
      blocks.push({ host: null, lines: [line], raw: false });
    }
  });
  if (current) blocks.push(current);
  return blocks;
}

export function serializeConfig(blocks) {
  return blocks.map(b => b.lines.join('\n')).join('\n');
}

export async function readConfig() {
  await fs.ensureDir(SSH_DIR);
  if (!(await fs.pathExists(SSH_CONFIG))) return '';
  return fs.readFile(SSH_CONFIG, 'utf8');
}

export async function listClients() {
  const raw = await readConfig();
  const blocks = parseConfig(raw);
  return blocks
    .filter(b => b.host && b.host.startsWith('github-'))
    .map(b => {
      const alias = b.host;
      const name  = alias.replace('github-', '');
      const keyLine = b.lines.find(l => l.trim().startsWith('IdentityFile'));
      const keyFile = keyLine ? keyLine.trim().split(/\s+/)[1].replace('~', os.homedir()) : null;
      return { alias, name, keyFile, lines: b.lines };
    });
}

export async function clientExists(name) {
  const clients = await listClients();
  return clients.some(c => c.name === name || c.alias === `github-${name}`);
}

export async function addClientConfig(name) {
  const raw = await readConfig();
  const alias   = `github-${name}`;
  const keyFile = `~/.ssh/id_ed25519_${name}`;

  const block = `
# Client: ${name}
Host ${alias}
  HostName github.com
  User git
  IdentityFile ${keyFile}
`;

  await fs.appendFile(SSH_CONFIG, block, 'utf8');
  await fs.chmod(SSH_CONFIG, 0o600);
}

export async function removeClientConfig(name) {
  const raw    = await readConfig();
  const alias  = `github-${name}`;
  const blocks = parseConfig(raw);
  const filtered = blocks.filter(b => b.host !== alias);

  const cleaned = filtered.filter((b, i) => {
    if (!b.raw && b.lines.some(l => l.trim() === `# Client: ${name}`)) return false;
    return true;
  });

  await fs.writeFile(SSH_CONFIG, serializeConfig(cleaned), 'utf8');
  await fs.chmod(SSH_CONFIG, 0o600);
}

export function privateKeyPath(name) {
  return path.join(SSH_DIR, `id_ed25519_${name}`);
}

export function publicKeyPath(name) {
  return path.join(SSH_DIR, `id_ed25519_${name}.pub`);
}

export async function keyExists(name) {
  return fs.pathExists(privateKeyPath(name));
}

export async function readPublicKey(name) {
  const p = publicKeyPath(name);
  if (!(await fs.pathExists(p))) return null;
  return (await fs.readFile(p, 'utf8')).trim();
}

export async function deleteKeyFiles(name) {
  const priv = privateKeyPath(name);
  const pub  = publicKeyPath(name);
  if (await fs.pathExists(priv)) await fs.remove(priv);
  if (await fs.pathExists(pub))  await fs.remove(pub);
}
