#!/usr/bin/env node

import { program } from 'commander';
import { banner, c, section, info, warn, error } from '../src/ui.js';
import { isMac, isWindows, isWSL, isGitBash } from '../src/platform.js';
import { setupCommand }    from '../src/commands/setup.js';
import { connectCommand }  from '../src/commands/connect.js';
import { testCommand }     from '../src/commands/test.js';
import { listCommand }     from '../src/commands/list.js';
import { statusCommand }   from '../src/commands/status.js';
import { syncCommand, pushCommand, configCommand } from '../src/commands/sync.js';
import { branchCommand }   from '../src/commands/branch.js';
import { saveCommand }     from '../src/commands/save.js';
import { removeCommand }   from '../src/commands/remove.js';
import { fixCommand }      from '../src/commands/fix.js';
import { dailyCommand, checklistCommand } from '../src/commands/daily.js';
import { aliasesCommand, refCommand }     from '../src/commands/aliases.js';

// ── Platform checks ─────────────────────────────────────────────────────────

if (isMac) {
  console.log(warn('macOS support is coming soon. Some features may not work correctly.'));
}

if (isWindows && !isWSL && !isGitBash()) {
  console.log(error('Run mgit in Git Bash or WSL, not CMD or PowerShell.'));
  process.exit(1);
}

// ── Global error handling ──────────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('');
  process.exit(0);
});

process.on('unhandledRejection', (e) => {
  if (e && e.message === 'User force closed the prompt') return;
  console.error('Unhandled error:', e?.message || e);
  process.exit(1);
});

// ── Commander setup ────────────────────────────────────────────────────────

program
  .name('mgit')
  .description('Multi-client GitHub workflow CLI — The MVP Guy')
  .version('1.0.0');

program
  .command('setup [client]')
  .description('SSH wizard for a new client — generate key + update config')
  .action(setupCommand);

program
  .command('connect [client] [owner/repo]')
  .description('Connect local project to client GitHub repo')
  .action(connectCommand);

program
  .command('test [client]')
  .description('Test SSH connection to GitHub for one or all clients')
  .action(testCommand);

program
  .command('list')
  .alias('ls')
  .description('List all configured clients and SSH keys')
  .action(listCommand);

program
  .command('remove [client]')
  .alias('rm')
  .description('Remove a client — delete keys + SSH config entry')
  .action(removeCommand);

program
  .command('status')
  .alias('s')
  .description('Rich project status — remote, identity, changes')
  .action(statusCommand);

program
  .command('sync')
  .description('Pull latest from remote branch')
  .action(syncCommand);

program
  .command('branch [name]')
  .alias('br')
  .description('Create a conventional feature branch (feat/fix/refactor/...)')
  .action(branchCommand);

program
  .command('save [message]')
  .description('Stage all + conventional commit (interactive or direct)')
  .action(saveCommand);

program
  .command('push')
  .description('Push current branch to GitHub')
  .action(pushCommand);

program
  .command('config')
  .description('Set git user.name + user.email for this repo (no --global)')
  .action(configCommand);

program
  .command('daily')
  .description('Interactive daily workflow: sync → branch → save → push')
  .action(dailyCommand);

program
  .command('fix')
  .description('Situation fixer for common git problems')
  .action(fixCommand);

program
  .command('checklist')
  .description('New client project setup checklist')
  .action(checklistCommand);

program
  .command('aliases')
  .description('Add useful git aliases to global config (st, co, last, undo...)')
  .action(aliasesCommand);

program
  .command('ref')
  .alias('help-me')
  .description('Quick reference — all commands at a glance')
  .action(refCommand);

program
  .action(() => {
    banner();
    section('📋', 'Commands', 'Run any command with --help for details');

    const cmds = [
      ['setup [client]',    'SSH wizard for new client'],
      ['connect [client]',  'Link project to client repo'],
      ['test [client]',     'Test SSH connection'],
      ['list',              'List all clients'],
      ['status',            'Project status'],
      ['sync',              'Pull from remote'],
      ['branch [name]',     'Create feature branch'],
      ['save [msg]',        'Stage + conventional commit'],
      ['push',              'Push current branch'],
      ['config',            'Set repo git identity'],
      ['daily',             'Interactive daily workflow'],
      ['fix',               'Fix common git problems'],
      ['checklist',         'New client checklist'],
      ['aliases',           'Add git aliases globally'],
      ['remove [client]',   'Remove client'],
      ['ref',               'Full command reference'],
    ];

    cmds.forEach(([cmd, desc]) => {
      console.log(
        '  ' + c.accent(('mgit ' + cmd).padEnd(26)) +
        c.muted(desc)
      );
    });

    console.log('');
    console.log(c.muted('  Run ') + c.accent('mgit <command> --help') + c.muted(' for details'));
    console.log('');
  });

program.parse(process.argv);
