import inquirer from 'inquirer';
import ora from 'ora';
import { banner, section, success, error, info, c } from '../ui.js';
import { listClients, clientExists } from '../ssh.js';
import { testSSH } from '../git.js';
import { isWindows, isGitBash } from '../platform.js';

export async function testCommand(clientArg) {
  banner();
  section('🔌', 'Test SSH Connection', 'Verifies your key works with GitHub');

  const clients = await listClients();

  if (clients.length === 0) {
    error('No clients configured. Run: mgit setup <clientname>');
    return;
  }

  let toTest = [];

  if (clientArg) {
    if (!(await clientExists(clientArg))) {
      error(`Client "${clientArg}" not found. Run: mgit list`);
      return;
    }
    toTest = [clients.find(c => c.name === clientArg)];
  } else if (clients.length === 1) {
    toTest = clients;
  } else {
    const { selected } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selected',
      message: c.accent('Which clients to test?'),
      choices: [
        { name: 'All clients', value: '__all__' },
        ...clients.map(c => ({ name: c.alias, value: c.name })),
      ],
    }]);

    if (selected.includes('__all__') || selected.length === 0) {
      toTest = clients;
    } else {
      toTest = clients.filter(c => selected.includes(c.name));
    }
  }

  console.log('');
  const results = [];

  for (const client of toTest) {
    const spinner = ora({
      text: c.muted(`Testing git@${client.alias}...`),
      color: 'green',
    }).start();

    const result = await testSSH(client.alias);

    if (result.ok) {
      spinner.succeed(c.accent(`✓  ${client.alias}`));
      results.push({ client: client.alias, ok: true });
    } else {
      spinner.fail(c.danger(`✗  ${client.alias}`));
      console.log(c.muted('     ' + result.out.split('\n')[0]));
      results.push({ client: client.alias, ok: false });
    }
  }

  console.log('');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  if (failed === 0) {
    success(`All ${passed} connection${passed > 1 ? 's' : ''} verified ✓`);
  } else {
    error(`${failed} connection${failed > 1 ? 's' : ''} failed`);
    console.log('');
    console.log(c.muted('  Fix: check that your public key is added to GitHub'));
    info('github.com / OWNER / REPO / settings / keys');
    info(`Then re-run: mgit setup <client> to re-test`);
  }

  if (isWindows && isGitBash()) {
    console.log('');
    info('Note: ssh -T git@github.com works in Git Bash on Windows.');
  }

  console.log('');
}
