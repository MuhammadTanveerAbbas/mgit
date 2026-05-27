import { execa } from 'execa';
import inquirer from 'inquirer';
import ora from 'ora';
import { banner, section, success, warn, error, info, tip, box, c } from '../ui.js';
import { keyExists, addClientConfig, clientExists, readPublicKey, privateKeyPath, displayPath } from '../ssh.js';
import { testSSH } from '../git.js';
import os from 'os';
import { isWindows, isGitBash } from '../platform.js';

export async function setupCommand(clientArg) {
  banner();
  section('🔑', 'New Client SSH Setup', 'One-time setup per client · ~5 minutes');

  let clientName = clientArg;
  if (!clientName) {
    const { name } = await inquirer.prompt([{
      type: 'input',
      name: 'name',
      message: c.accent('Client name') + c.muted(' (e.g. acmecorp, johndoe):'),
      validate: v => /^[a-z0-9_-]+$/.test(v.trim()) || 'Lowercase letters, numbers, hyphens only',
    }]);
    clientName = name.trim();
  }

  const alias   = `github-${clientName}`;
  const keyPath = privateKeyPath(clientName);
  const displayKeyPath = displayPath(keyPath);

  const alreadyHasKey    = await keyExists(clientName);
  const alreadyHasConfig = await clientExists(clientName);

  if (alreadyHasKey || alreadyHasConfig) {
    warn(`Client "${clientName}" already exists.`);
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: c.warn('Overwrite existing key + config?'),
      default: false,
    }]);
    if (!overwrite) {
      info('Skipping. Use: mgit test ' + clientName + ' to verify existing setup.');
      return;
    }
  }

  const { passphrase } = await inquirer.prompt([{
    type: 'list',
    name: 'passphrase',
    message: c.accent('SSH key passphrase:'),
    choices: [
      { name: 'No passphrase (recommended for dev)',  value: '' },
      { name: 'Enter a passphrase',                    value: '__ask__' },
    ],
  }]);

  let actualPassphrase = '';
  if (passphrase === '__ask__') {
    const { pp } = await inquirer.prompt([{
      type: 'password',
      name: 'pp',
      message: c.accent('Enter passphrase:'),
    }]);
    actualPassphrase = pp;
  }

  const spinner = ora({ text: c.muted('Generating SSH key...'), color: 'green' }).start();
  try {
    await execa('ssh-keygen', [
      '-t', 'ed25519',
      '-C', `${os.userInfo().username}@${clientName}`,
      '-f', keyPath,
      '-N', actualPassphrase,
    ]);
    spinner.succeed(c.accent('SSH key generated'));
  } catch (e) {
    spinner.fail(c.danger('Key generation failed'));
    error(e.message);
    return;
  }

  const pubKey = await readPublicKey(clientName);
  console.log('');
  console.log(c.info('  Public key to add to GitHub:'));
  console.log('');
  console.log('  ' + c.accent(pubKey));
  console.log('');

  // ── Clipboard instructions ───────────────────────────────────────────────
  if (isWindows) {
    info('Windows: clip < ' + displayPath(keyPath) + '.pub');
    info('Linux:   cat ' + displayPath(keyPath) + '.pub | xclip');
  } else {
    info('Copy the green key above and add it to GitHub.');
  }

  box(
    'Add to GitHub',
    [
      `URL: github.com / OWNER / REPO / settings / keys`,
      `Title: "${os.hostname()} Dev Machine"`,
      `Key: paste the green key above`,
      `Allow write access: ✓ check this`,
      ``,
      `Alternative: ask client to add you as Collaborator:`,
      `Repo → Settings → Collaborators → add your GitHub username`,
    ].join('\n'),
    'tip'
  );

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmed',
    message: c.accent('Have you added the public key to GitHub?'),
    default: false,
  }]);

  if (!confirmed) {
    warn('No problem. Key is saved. Run "mgit setup ' + clientName + '" again after adding it.');
    tip(`Key location: ${displayKeyPath}.pub`);
    return;
  }

  if (!alreadyHasConfig) {
    const s2 = ora({ text: c.muted('Updating ~/.ssh/config...'), color: 'green' }).start();
    try {
      await addClientConfig(clientName);
      s2.succeed(c.accent('SSH config updated'));
    } catch (e) {
      s2.fail(c.danger('Config update failed'));
      error(e.message);
      return;
    }
  } else {
    info('SSH config entry already exists — skipped.');
  }

  const s3 = ora({ text: c.muted(`Testing SSH → git@${alias}...`), color: 'green' }).start();
  const test = await testSSH(alias);
  if (test.ok) {
    s3.succeed(c.accent('SSH connection verified ✓'));
  } else {
    s3.fail(c.danger('SSH test failed'));
    box(
      'Fix: Permission denied',
      `The key may not have been saved on GitHub yet.\nCheck: github.com/OWNER/REPO/settings/keys\nThen run: mgit test ${clientName}`,
      'danger'
    );
    return;
  }

  success(`Client "${clientName}" is ready!`);
  console.log('');
  console.log(c.muted('  Next steps:'));
  info(`cd into your project folder`);
  info(`mgit connect ${clientName}   — link your local project to the client repo`);
  console.log('');
}
