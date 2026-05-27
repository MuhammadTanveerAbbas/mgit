import inquirer from 'inquirer';
import ora from 'ora';
import { execa } from 'execa';
import { banner, section, success, warn, error, info, c } from '../ui.js';
import { isGitRepo, currentBranch, remoteUrl, changedFiles, hasUpstream } from '../git.js';

export async function dailyCommand() {
  banner();
  section('⚡', 'Daily Workflow', 'sync → branch → work → save → push');

  if (!(await isGitRepo())) {
    error('Not inside a git repo.');
    return;
  }

  const remote = await remoteUrl();
  if (!remote) {
    error('No remote set. Run: mgit connect <client>');
    return;
  }

  console.log(c.muted('  Remote: ') + c.accent(remote));
  console.log('');

  const { step } = await inquirer.prompt([{
    type: 'list',
    name: 'step',
    message: c.accent('Where are you in the workflow?'),
    choices: [
      { name: c.accent('1') + c.muted('  Pull latest (start of day)'),  value: 'sync' },
      { name: c.accent('2') + c.muted('  Create feature branch'),        value: 'branch' },
      { name: c.accent('3') + c.muted('  Commit my changes'),            value: 'save' },
      { name: c.accent('4') + c.muted('  Push branch to GitHub'),        value: 'push' },
      { name: c.accent('5') + c.muted('  Run full loop (sync→branch→save→push)'), value: 'full' },
    ],
  }]);

  console.log('');

  if (step === 'sync' || step === 'full') {
    await runSync();
    if (step === 'sync') return;
  }

  if (step === 'branch' || step === 'full') {
    await runBranch();
    if (step === 'branch') return;
  }

  if (step === 'save' || step === 'full') {
    await runSave();
    if (step === 'save') return;
  }

  if (step === 'push' || step === 'full') {
    await runPush();
  }
}

async function runSync() {
  const branch = await currentBranch();
  if (!branch) {
    error('Detached HEAD — checkout a branch first.');
    return;
  }
  const s = ora({ text: c.muted('Pulling from origin/' + branch + '...'), color: 'green' }).start();
  try {
    const { stdout } = await execa('git', ['pull', 'origin', branch], { cwd: process.cwd() });
    s.succeed(c.accent('Synced'));
    if (stdout.includes('Already up to date')) info('Already up to date.');
  } catch (e) {
    s.fail(c.danger('Pull failed — run: mgit fix'));
  }
  console.log('');
}

async function runBranch() {
  const TYPES = [
    { name: 'feat     — new feature',     value: 'feat' },
    { name: 'fix      — bug fix',          value: 'fix' },
    { name: 'refactor — code restructure', value: 'refactor' },
    { name: 'chore    — maintenance',      value: 'chore' },
    { name: 'docs     — documentation',    value: 'docs' },
  ];

  const current = await currentBranch();
  if (!current) {
    error('Detached HEAD or no commits yet.');
    return;
  }
  if (current !== 'main' && current !== 'master') {
    warn(`Already on branch: ${current}`);
    const { stay } = await inquirer.prompt([{
      type: 'confirm', name: 'stay',
      message: c.muted('Stay on this branch?'),
      default: true,
    }]);
    if (stay) { console.log(''); return; }
  }

  const { type } = await inquirer.prompt([{
    type: 'list', name: 'type',
    message: c.accent('Branch type:'),
    choices: TYPES,
  }]);

  const { name } = await inquirer.prompt([{
    type: 'input', name: 'name',
    message: c.accent(`Name:`),
    validate: v => v.trim().length > 0 || 'Required',
  }]);

  const branch = `${type}/${name.trim().toLowerCase().replace(/\s+/g, '-')}`;
  const s = ora({ text: c.muted('Creating branch...'), color: 'green' }).start();
  try {
    await execa('git', ['checkout', '-b', branch], { cwd: process.cwd() });
    s.succeed(c.accent('On: ' + branch));
  } catch (e) {
    s.fail(c.danger('Failed: ' + (e.stderr || e.message)));
  }
  console.log('');
}

async function runSave() {
  const changed = await changedFiles();
  if (changed === 0) {
    warn('Nothing to commit. Skipping.');
    console.log('');
    return;
  }

  const TYPES = ['feat','fix','refactor','docs','chore','style','test','perf'];
  const { type } = await inquirer.prompt([{
    type: 'list', name: 'type',
    message: c.accent('Commit type:'),
    choices: TYPES.map(t => ({ name: t, value: t })),
  }]);

  const { msg } = await inquirer.prompt([{
    type: 'input', name: 'msg',
    message: c.accent('Message:'),
    validate: v => v.trim().length > 0 || 'Required',
  }]);

  const commitMsg = `${type}: ${msg.trim()}`;
  const s = ora({ text: c.muted('Staging + committing...'), color: 'green' }).start();
  try {
    await execa('git', ['add', '.'], { cwd: process.cwd() });
    await execa('git', ['commit', '-m', commitMsg], { cwd: process.cwd() });
    s.succeed(c.accent('Committed: ') + commitMsg);
  } catch (e) {
    s.fail(c.danger('Commit failed'));
    error(e.stderr || e.message);
  }
  console.log('');
}

async function runPush() {
  const branch = await currentBranch();
  if (!branch) {
    error('Detached HEAD — nothing to push.');
    return;
  }
  const up     = await hasUpstream();
  const args   = up ? ['push', 'origin', branch] : ['push', '-u', 'origin', branch];
  const s = ora({ text: c.muted('Pushing...'), color: 'green' }).start();
  try {
    await execa('git', args, { cwd: process.cwd() });
    s.succeed(c.accent('Pushed: ' + branch));
    success('Open a Pull Request on GitHub to merge.');
  } catch (e) {
    s.fail(c.danger('Push failed — run: mgit fix'));
    error(e.stderr || '');
  }
  console.log('');
}

export async function checklistCommand() {
  banner();
  section('☑', 'New Client Project Checklist', 'Run through this every time you start a client project');

  const ITEMS = [
    { id: 'key',      label: 'Generated SSH key for client' },
    { id: 'github',   label: 'Added public key to GitHub (Deploy Key or Collaborator)' },
    { id: 'config',   label: 'Added Host block to ~/.ssh/config with correct alias' },
    { id: 'test',     label: 'Tested SSH connection: ssh -T git@github-<client> → success' },
    { id: 'remote',   label: 'Set remote URL with SSH alias via: mgit connect <client>' },
    { id: 'identity', label: 'Set per-repo user.email + user.name (no --global)' },
    { id: 'verify',   label: 'Ran mgit status — remote shows SSH alias URL' },
    { id: 'gitignore',label: 'Created .gitignore before first commit (.env included)' },
    { id: 'push1',    label: 'Made first push successfully' },
    { id: 'branch',   label: 'Working on feature branch, NOT main directly' },
  ];

  console.log(c.muted('  Use spacebar to check items off:\n'));

  const { done } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'done',
    message: c.accent('Mark completed steps:'),
    choices: ITEMS.map(i => ({ name: i.label, value: i.id })),
    pageSize: 12,
  }]);

  console.log('');

  const remaining = ITEMS.filter(i => !done.includes(i.id));
  if (remaining.length === 0) {
    success('All done! Project is fully set up. ✓');
    info('Start work: mgit branch → mgit save → mgit push');
  } else {
    info(`${done.length}/${ITEMS.length} complete.`);
    warn(`${remaining.length} step${remaining.length > 1 ? 's' : ''} remaining:`);
    remaining.forEach((item, i) => {
      console.log(c.muted(`  ${i + 1}. `) + c.warn(item.label));
    });
    console.log('');
    info('Run: mgit setup   to handle the SSH steps automatically');
  }
  console.log('');
}
