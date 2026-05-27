import inquirer from 'inquirer';
import ora from 'ora';
import { execa } from 'execa';
import { banner, section, success, warn, error, info, box, c } from '../ui.js';
import { listClients, clientExists } from '../ssh.js';
import { isGitRepo, remoteUrl, getConfig, setConfig, sshRemote, gitTry } from '../git.js';

export async function connectCommand(clientArg, ownerRepoArg) {
  banner();
  section('🔗', 'Connect Repo to Client', 'Links your local project to a client GitHub repo');

  // ── Check git repo ────────────────────────────────────────────────────────
  if (!(await isGitRepo())) {
    const { init } = await inquirer.prompt([{
      type: 'confirm',
      name: 'init',
      message: c.warn('Not a git repo. Initialize one here?'),
      default: true,
    }]);
    if (init) {
      await execa('git', ['init'], { cwd: process.cwd() });
      info('Git repo initialized.');
    } else {
      error('Run this inside a git repo.');
      return;
    }
  }

  // ── Pick client ───────────────────────────────────────────────────────────
  let clientName = clientArg;
  const clients = await listClients();

  if (!clientName) {
    if (clients.length === 0) {
      error('No clients set up yet. Run: mgit setup <clientname>');
      return;
    }

    const choices = [
      ...clients.map(c => ({ name: `${c.alias}  ${c.name}`, value: c.name })),
      new inquirer.Separator(),
      { name: '+ Add a new client first (mgit setup)', value: '__new__' },
    ];

    const { picked } = await inquirer.prompt([{
      type: 'list',
      name: 'picked',
      message: c.accent('Which client?'),
      choices,
    }]);

    if (picked === '__new__') {
      info('Run: mgit setup <clientname> first.');
      return;
    }
    clientName = picked;
  } else {
    if (!(await clientExists(clientName))) {
      error(`Client "${clientName}" not set up. Run: mgit setup ${clientName}`);
      return;
    }
  }

  const alias = `github-${clientName}`;

  // ── Get owner/repo ────────────────────────────────────────────────────────
  let ownerRepo = ownerRepoArg;
  const existing = await remoteUrl();

  if (!ownerRepo) {
    if (existing) {
      info(`Current remote: ${existing}`);
    }
    const { repo } = await inquirer.prompt([{
      type: 'input',
      name: 'repo',
      message: c.accent('GitHub owner/repo') + c.muted(' (e.g. acmecorp/my-app):'),
      validate: v => /^[\w.-]+\/[\w.-]+$/.test(v.trim()) || 'Format: owner/repo-name',
    }]);
    ownerRepo = repo.trim();
  }

  const remoteSSH = sshRemote(alias, ownerRepo);

  // ── Set remote ────────────────────────────────────────────────────────────
  const s1 = ora({ text: c.muted('Setting remote...'), color: 'green' }).start();
  try {
    if (existing) {
      await execa('git', ['remote', 'set-url', 'origin', remoteSSH], { cwd: process.cwd() });
    } else {
      await execa('git', ['remote', 'add', 'origin', remoteSSH], { cwd: process.cwd() });
    }
    s1.succeed(c.accent('Remote set: ') + remoteSSH);
  } catch (e) {
    s1.fail(c.danger('Failed to set remote'));
    error(e.message);
    return;
  }

  // ── Set git identity ──────────────────────────────────────────────────────
  const currentName  = await getConfig('user.name');
  const currentEmail = await getConfig('user.email');

  const { setIdentity } = await inquirer.prompt([{
    type: 'confirm',
    name: 'setIdentity',
    message: c.accent('Set git identity for this repo?') +
             (currentEmail ? c.muted(` (current: ${currentEmail})`) : ''),
    default: !currentEmail,
  }]);

  if (setIdentity) {
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
        validate: v => v.includes('@') || 'Enter a valid email',
      },
    ]);
    await setConfig('user.name', name);
    await setConfig('user.email', email);
    success(`Identity set: ${name} <${email}>`);
  }

  // ── Verify ────────────────────────────────────────────────────────────────
  const verify = await gitTry('remote', '-v');
  info('Remote: ' + verify.stdout.split('\n')[0]);

  // ── Done ──────────────────────────────────────────────────────────────────
  success('Project connected!');
  console.log('');
  console.log(c.muted('  Next:'));
  info('mgit sync     — pull latest from client repo');
  info('mgit branch   — create your first feature branch');
  info('mgit status   — verify everything looks right');
  console.log('');
}
