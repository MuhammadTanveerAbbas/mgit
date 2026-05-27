import inquirer from 'inquirer';
import ora from 'ora';
import { execa } from 'execa';
import { banner, section, success, warn, error, info, box, c } from '../ui.js';
import { isGitRepo, currentBranch, remoteUrl, hasUpstream, getConfig, setConfig } from '../git.js';

export async function syncCommand() {
  banner();
  section('⬇️', 'Sync from Remote', 'Pull latest changes before starting work');

  if (!(await isGitRepo())) {
    error('Not inside a git repo.');
    return;
  }

  const branch = await currentBranch();
  const remote = await remoteUrl();

  if (!remote) {
    error('No remote set. Run: mgit connect <client>');
    return;
  }

  if (!branch) {
    error('Detached HEAD or no commits yet. Checkout a branch first.');
    return;
  }

  info(`Branch: ${branch}`);
  info(`Remote: ${remote}`);
  console.log('');

  const s = ora({ text: c.muted('Pulling from origin/' + branch + '...'), color: 'green' }).start();
  try {
    const { stdout } = await execa('git', ['pull', 'origin', branch], { cwd: process.cwd() });
    s.succeed(c.accent('Sync complete'));
    if (stdout.trim() && stdout !== 'Already up to date.') {
      stdout.split('\n').filter(Boolean).slice(0, 5).forEach(l => {
        console.log(c.muted('  ' + l));
      });
    } else {
      info('Already up to date.');
    }
  } catch (e) {
    s.fail(c.danger('Pull failed'));
    const msg = e.stderr || '';
    if (msg.includes('unrelated histories')) {
      box('Fix: Unrelated histories', 'Remote has existing commits not in your local repo.\nRun manually:\n  git pull origin main --allow-unrelated-histories', 'warn');
    } else if (msg.includes('CONFLICT')) {
      box('Merge Conflict', 'Open the conflicting files, look for <<<<<<< markers,\nresolve manually, then:\n  git add . && git commit', 'danger');
    } else {
      error(msg);
    }
    return;
  }

  success('Ready to work!');
  console.log('');
}

export async function pushCommand() {
  banner();
  section('⬆️', 'Push Branch', 'Push current branch to GitHub');

  if (!(await isGitRepo())) {
    error('Not inside a git repo.');
    return;
  }

  const branch = await currentBranch();
  const remote = await remoteUrl();

  if (!remote) {
    error('No remote set. Run: mgit connect <client>');
    return;
  }

  if (!branch) {
    error('Detached HEAD — nothing to push.');
    return;
  }

  if (branch === 'main' || branch === 'master') {
    warn(`You're about to push directly to ${branch}.`);
    const { sure } = await inquirer.prompt([{
      type: 'confirm',
      name: 'sure',
      message: c.warn('Are you sure? This bypasses code review.'),
      default: false,
    }]);
    if (!sure) {
      info('Cancelled. Create a feature branch: mgit branch');
      return;
    }
  }

  const up = await hasUpstream();
  const pushArgs = up
    ? ['push', 'origin', branch]
    : ['push', '-u', 'origin', branch];

  const label = up ? 'Pushing...' : 'Pushing (first push, setting upstream)...';
  const s = ora({ text: c.muted(label), color: 'green' }).start();

  try {
    await execa('git', pushArgs, { cwd: process.cwd() });
    s.succeed(c.accent('Pushed: ') + branch);
  } catch (e) {
    s.fail(c.danger('Push failed'));
    const msg = e.stderr || '';
    if (msg.includes('Permission denied')) {
      box('Fix: Permission denied', `SSH key not on GitHub or wrong alias.\nTest: mgit test\nCheck remote: mgit status`, 'danger');
    } else {
      error(msg);
    }
    return;
  }

  success('Branch pushed!');
  info('Open a Pull Request on GitHub to merge into main.');
  console.log('');
}

export async function configCommand() {
  banner();
  section('🪪', 'Repo Identity', 'Set git user.name and user.email for this repo only');

  if (!(await isGitRepo())) {
    error('Not inside a git repo.');
    return;
  }

  const currentName  = await getConfig('user.name');
  const currentEmail = await getConfig('user.email');

  if (currentName || currentEmail) {
    console.log(c.muted('  Current identity:'));
    if (currentName)  console.log(c.muted('    Name:  ') + c.accent(currentName));
    if (currentEmail) console.log(c.muted('    Email: ') + c.accent(currentEmail));
    console.log('');
  }

  const { name, email } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: c.accent('Your name:'),
      default: currentName || 'Tanveer',
    },
    {
      type: 'input',
      name: 'email',
      message: c.accent('Your email:'),
      default: currentEmail || '',
      validate: v => v.includes('@') || 'Enter a valid email',
    },
  ]);

  await setConfig('user.name', name);
  await setConfig('user.email', email);

  success(`Identity set: ${name} <${email}>`);
  info('This only applies to this repo (no --global used)');
  console.log('');
}
