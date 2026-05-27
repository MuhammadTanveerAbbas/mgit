import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { platformBadge } from './platform.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const noColor = !process.stdout.isTTY;

function cwrap(fn) {
  return (t) => noColor ? t : fn(t);
}

export const c = {
  accent:  cwrap(chalk.hex('#00e5a0')),
  purple:  cwrap(chalk.hex('#7b61ff')),
  warn:    cwrap(chalk.hex('#ffb84d')),
  danger:  cwrap(chalk.hex('#ff5757')),
  info:    cwrap(chalk.hex('#4dc9ff')),
  muted:   cwrap(chalk.hex('#6b6b80')),
  white:   cwrap(chalk.white),
  bold:    cwrap(chalk.bold),
  dim:     cwrap(chalk.dim),
};

let _version = '1.0.0';
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
  _version = pkg.version;
} catch {}

export function banner() {
  const text = figlet.textSync('mgit', { font: 'Slant' });
  const colored = noColor ? text : gradient(['#00e5a0', '#7b61ff'])(text);
  console.log('\n' + colored);
  console.log(
    c.muted('  Multi-client GitHub Workflow CLI  ') +
    c.accent('v' + _version) +
    c.muted('  ') + c.purple(platformBadge())
  );
  console.log(c.muted('  themvpguy.vercel.app · @themvpguy/mgit'));
  console.log('');
}

export function section(icon, title, sub) {
  console.log('\n' + c.accent(icon) + '  ' + c.bold(c.white(title)));
  if (sub) console.log(c.muted('   ' + sub));
  console.log('');
}

export function step(num, label) {
  console.log(
    c.accent('  [' + num + ']') + '  ' + c.white(label)
  );
}

export function success(msg) {
  console.log('\n' + c.accent('  ✓  ') + c.white(msg));
}

export function warn(msg) {
  console.log('\n' + c.warn('  ⚠  ') + c.warn(msg));
}

export function error(msg) {
  console.log('\n' + c.danger('  ✗  ') + c.danger(msg));
}

export function info(msg) {
  console.log(c.info('  →  ') + c.muted(msg));
}

export function tip(msg) {
  console.log(c.info('  💡 ') + c.muted(msg));
}

export function divider() {
  console.log(c.muted('  ' + '─'.repeat(54)));
}

export function codeBlock(lang, code) {
  console.log('');
  console.log(c.muted('  ┌─ ') + c.purple(lang));
  const lines = code.trim().split('\n');
  lines.forEach(line => {
    console.log(c.muted('  │ ') + c.accent(line));
  });
  console.log(c.muted('  └' + '─'.repeat(40)));
  console.log('');
}

export function box(title, content, type = 'info') {
  const borderColor = {
    info:    '#00e5a0',
    warn:    '#ffb84d',
    danger:  '#ff5757',
    tip:     '#4dc9ff',
  }[type] || '#00e5a0';

  const msg = title ? chalk.bold(chalk.white(title)) + '\n' + chalk.hex('#b0b0c8')(content) : chalk.hex('#b0b0c8')(content);

  console.log(boxen(msg, {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    margin: { left: 2 },
    borderStyle: 'round',
    borderColor,
    dimBorder: false,
  }));
  console.log('');
}

export function keyVal(key, val, indent = 4) {
  const pad = ' '.repeat(indent);
  console.log(pad + c.muted(key.padEnd(18)) + c.accent(val));
}

export function label(txt) {
  return noColor ? txt : chalk.bold(chalk.hex('#e8e8f0')(txt));
}

export function highlight(txt) {
  return noColor ? txt : chalk.hex('#00e5a0')(txt);
}
