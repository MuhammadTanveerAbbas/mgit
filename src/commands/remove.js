import inquirer from 'inquirer';
import ora from 'ora';
import { banner, section, success, warn, error, info, box, c } from '../ui.js';
import { listClients, clientExists, deleteKeyFiles, removeClientConfig, privateKeyPath, publicKeyPath, displayPath } from '../ssh.js';

export async function removeCommand(clientArg) {
  banner();
  section('🗑', 'Remove Client', 'Clean offboard — deletes keys + SSH config entry');

  const clients = await listClients();
  if (clients.length === 0) {
    info('No clients configured.');
    return;
  }

  let clientName = clientArg;
  if (!clientName) {
    const { picked } = await inquirer.prompt([{
      type: 'list',
      name: 'picked',
      message: c.accent('Which client to remove?'),
      choices: clients.map(c => ({ name: `${c.alias}  (${c.name})`, value: c.name })),
    }]);
    clientName = picked;
  } else if (!(await clientExists(clientName))) {
    error(`Client "${clientName}" not found. Run: mgit list`);
    return;
  }

  box(
    'What will be deleted',
    [
      `${displayPath(privateKeyPath(clientName))}        (private key)`,
      `${displayPath(publicKeyPath(clientName))}    (public key)`,
      `Host github-${clientName} block in SSH config`,
    ].join('\n'),
    'warn'
  );

  warn('Also manually remove the deploy key from GitHub:');
  info(`github.com / OWNER / REPO / settings / keys`);
  console.log('');

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: c.danger(`Permanently remove "${clientName}"?`),
    default: false,
  }]);

  if (!confirm) {
    info('Cancelled.');
    return;
  }

  const s1 = ora({ text: c.muted('Deleting key files...'), color: 'green' }).start();
  try {
    await deleteKeyFiles(clientName);
    s1.succeed(c.accent('Key files deleted'));
  } catch (e) {
    s1.fail(c.danger('Key deletion failed: ' + e.message));
  }

  const s2 = ora({ text: c.muted('Updating SSH config...'), color: 'green' }).start();
  try {
    await removeClientConfig(clientName);
    s2.succeed(c.accent('SSH config updated'));
  } catch (e) {
    s2.fail(c.danger('Config update failed: ' + e.message));
  }

  success(`Client "${clientName}" removed.`);
  info('Remember to remove the deploy key from GitHub as well.');
  console.log('');
}
