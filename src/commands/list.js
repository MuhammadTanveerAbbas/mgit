import Table from 'cli-table3';
import chalk from 'chalk';
import { banner, section, c, divider, info } from '../ui.js';
import { listClients, readPublicKey, keyExists } from '../ssh.js';
import { execa } from 'execa';
import os from 'os';
import path from 'path';

export async function listCommand() {
  banner();
  section('🗂', 'Client Manager', 'All configured GitHub clients');

  const clients = await listClients();

  if (clients.length === 0) {
    console.log(c.muted('  No clients configured yet.\n'));
    info('Run: mgit setup <clientname> to add one');
    console.log('');
    return;
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  const table = new Table({
    head: [
      chalk.hex('#6b6b80')('  CLIENT'),
      chalk.hex('#6b6b80')('SSH ALIAS'),
      chalk.hex('#6b6b80')('KEY FILE'),
      chalk.hex('#6b6b80')('STATUS'),
    ],
    style: {
      head: [],
      border: ['dim'],
      'padding-left': 1,
    },
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
      left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
      right: '│', 'right-mid': '┤', middle: '│',
    },
  });

  for (const client of clients) {
    const hasKey = await keyExists(client.name);
    const keyShort = client.keyFile
      ? path.basename(client.keyFile)
      : chalk.dim('—');

    const status = hasKey
      ? chalk.hex('#00e5a0')('● active')
      : chalk.hex('#ff5757')('✗ key missing');

    table.push([
      chalk.bold(chalk.white('  ' + client.name)),
      chalk.hex('#4dc9ff')(client.alias),
      chalk.dim(keyShort),
      status,
    ]);
  }

  console.log(table.toString());
  console.log('');

  // ── Agent-loaded keys ────────────────────────────────────────────────────
  try {
    const { stdout } = await execa('ssh-add', ['-l']);
    if (stdout.trim()) {
      divider();
      console.log(c.muted('  SSH Agent keys loaded:'));
      stdout.split('\n').forEach(line => {
        if (line.trim()) console.log('  ' + c.muted(line));
      });
      console.log('');
    }
  } catch {
    // ssh-add -l exits 1 if no keys loaded — that's fine
  }

  // ── Quick actions ─────────────────────────────────────────────────────────
  console.log(c.muted('  Commands:'));
  info('mgit setup <name>   — add new client');
  info('mgit test <name>    — test SSH connection');
  info('mgit remove <name>  — remove client');
  console.log('');
}
