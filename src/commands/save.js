import inquirer from 'inquirer';
import ora from 'ora';
import { execa } from 'execa';
import { banner, section, success, warn, error, info, c } from '../ui.js';
import { isGitRepo, currentBranch, changedFiles, gitTry } from '../git.js';

const TYPES = [
  { name: 'feat     new feature',      value: 'feat'     },
  { name: 'fix      bug fix',           value: 'fix'      },
  { name: 'refactor code restructure',  value: 'refactor' },
  { name: 'docs     documentation',     value: 'docs'     },
  { name: 'chore    maintenance',       value: 'chore'    },
  { name: 'style    formatting only',   value: 'style'    },
  { name: 'test     tests',             value: 'test'     },
  { name: 'perf     performance',       value: 'perf'     },
];

export async function saveCommand(msgArg) {
  banner();
  section('💾', 'Commit Changes', 'Conventional Commits format — clean history always');

  if (!(await isGitRepo())) {
    error('Not inside a git repo.');
    return;
  }

  // ── Check for changes ─────────────────────────────────────────────────────
  const changed = await changedFiles();
  if (changed === 0) {
    warn('Nothing to commit. Working tree is clean.');
    return;
  }

  const branch = await currentBranch();
  info(`Branch: ${branch}`);
  info(`Files to commit: ${changed}`);

  // ── Show changed files ────────────────────────────────────────────────────
  const statusResult = await gitTry('status', '--short');
  if (statusResult.ok && statusResult.stdout) {
    console.log('');
    statusResult.stdout.split('\n').slice(0, 10).forEach(line => {
      const flag = line.slice(0, 2);
      const file = line.slice(3);
      const color = flag.trim() === 'M' ? c.warn : flag.trim() === '?' ? c.muted : c.accent;
      console.log('  ' + c.muted(flag) + ' ' + color(file));
    });
    console.log('');
  }

  // ── Parse or prompt commit message ───────────────────────────────────────
  let commitMsg = '';

  if (msgArg) {
    // Direct usage: mgit save "feat: add payment"
    // If it already has conventional format, use as-is
    const hasConvention = TYPES.some(t => msgArg.startsWith(t.value + ':'));
    if (hasConvention) {
      commitMsg = msgArg;
    } else {
      // Wrap it
      const { type } = await inquirer.prompt([{
        type: 'list',
        name: 'type',
        message: c.accent('Commit type:'),
        choices: TYPES,
      }]);
      commitMsg = `${type}: ${msgArg}`;
    }
  } else {
    // Interactive mode
    const { type } = await inquirer.prompt([{
      type: 'list',
      name: 'type',
      message: c.accent('Commit type:'),
      choices: TYPES,
    }]);

    const { scope } = await inquirer.prompt([{
      type: 'input',
      name: 'scope',
      message: c.accent('Scope') + c.muted(' (optional, e.g. auth, payment):'),
    }]);

    const { msg } = await inquirer.prompt([{
      type: 'input',
      name: 'msg',
      message: c.accent('Message:'),
      validate: v => v.trim().length > 0 || 'Message required',
    }]);

    const scopePart = scope.trim() ? `(${scope.trim()})` : '';
    commitMsg = `${type}${scopePart}: ${msg.trim()}`;
  }

  // ── Preview + confirm ─────────────────────────────────────────────────────
  console.log('');
  console.log(c.muted('  Commit message: ') + c.accent(commitMsg));
  console.log('');

  const { go } = await inquirer.prompt([{
    type: 'confirm',
    name: 'go',
    message: c.accent('Stage all and commit?'),
    default: true,
  }]);

  if (!go) {
    info('Cancelled.');
    return;
  }

  // ── Stage and commit ──────────────────────────────────────────────────────
  const s1 = ora({ text: c.muted('Staging files...'), color: 'green' }).start();
  try {
    await execa('git', ['add', '.'], { cwd: process.cwd() });
    s1.succeed(c.accent('Staged all changes'));
  } catch (e) {
    s1.fail(c.danger('Stage failed'));
    error(e.message);
    return;
  }

  const s2 = ora({ text: c.muted('Committing...'), color: 'green' }).start();
  try {
    await execa('git', ['commit', '-m', commitMsg], { cwd: process.cwd() });
    s2.succeed(c.accent('Committed: ') + commitMsg);
  } catch (e) {
    s2.fail(c.danger('Commit failed'));
    error(e.stderr || e.message);
    return;
  }

  success('Changes saved!');
  console.log('');
  info('Next: mgit push — push this branch to GitHub');
  console.log('');
}
