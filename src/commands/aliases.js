import inquirer from 'inquirer';
import { execa } from 'execa';
import { banner, section, success, info, c, codeBlock } from '../ui.js';

const ALIASES = [
  { name: 'st',   cmd: 'status',                    desc: 'git st' },
  { name: 'co',   cmd: 'checkout',                  desc: 'git co <branch>' },
  { name: 'br',   cmd: 'branch',                    desc: 'git br' },
  { name: 'last', cmd: 'log --oneline -10',          desc: 'git last — last 10 commits' },
  { name: 'undo', cmd: 'reset --soft HEAD~1',        desc: 'git undo — undo last commit (keep changes)' },
  { name: 'save', cmd: 'stash',                      desc: 'git save — stash work' },
  { name: 'pop',  cmd: 'stash pop',                  desc: 'git pop — restore stash' },
  { name: 'who',  cmd: 'config user.email',          desc: 'git who — check current identity' },
  { name: 'rv',   cmd: 'remote -v',                  desc: 'git rv — check remote URL' },
];

export async function aliasesCommand() {
  banner();
  section('⚡', 'Git Aliases Setup', 'Quality of life aliases for faster workflow');

  console.log(c.muted('  The following global aliases will be added:\n'));

  ALIASES.forEach(a => {
    console.log(
      '  ' + c.accent(`git ${a.name}`.padEnd(12)) +
      c.muted('→ ') +
      c.info(a.cmd.padEnd(30)) +
      c.muted('  ' + a.desc)
    );
  });
  console.log('');

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: c.accent('Add all aliases to global git config?'),
    default: true,
  }]);

  if (!confirm) {
    info('Skipped. Run again anytime.');
    return;
  }

  for (const alias of ALIASES) {
    await execa('git', ['config', '--global', `alias.${alias.name}`, alias.cmd]);
  }

  success('All aliases added to ~/.gitconfig!');
  console.log('');
  console.log(c.muted('  Quick reference:'));
  ALIASES.forEach(a => {
    console.log('  ' + c.accent(`git ${a.name}`.padEnd(12)) + c.muted(a.desc));
  });
  console.log('');
}

// ── Quick reference (mgit ref) ────────────────────────────────────────────────

export async function refCommand() {
  banner();
  section('📋', 'Quick Reference', 'All mgit commands at a glance');

  const cmds = [
    ['setup [client]',   'SSH wizard for new client — generates key + config'],
    ['connect [client]', 'Link local project to client GitHub repo'],
    ['test [client]',    'Test SSH connection to GitHub'],
    ['list',             'Show all configured clients'],
    ['status',           'Rich project status — remote, identity, changes'],
    ['sync',             'Pull latest from remote branch'],
    ['branch [name]',    'Create conventional feature branch (feat/fix/...)'],
    ['save [message]',   'Stage + commit with conventional format'],
    ['push',             'Push current branch to GitHub'],
    ['config',           'Set git user.name + user.email for this repo'],
    ['daily',            'Interactive daily workflow helper'],
    ['fix',              'Situation fixer for common git problems'],
    ['checklist',        'New client project checklist'],
    ['aliases',          'Add useful git aliases globally'],
    ['remove [client]',  'Clean offboard — delete keys + SSH config'],
  ];

  cmds.forEach(([cmd, desc]) => {
    console.log(
      '  ' + c.accent(('mgit ' + cmd).padEnd(28)) +
      c.muted(desc)
    );
  });

  console.log('');
  console.log(c.muted('  Docs: ') + c.info('https://themvpguy.vercel.app'));
  console.log('');
}
