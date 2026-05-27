import inquirer from 'inquirer';
import ora from 'ora';
import { execa } from 'execa';
import { banner, section, success, warn, error, info, c } from '../ui.js';
import { isGitRepo, currentBranch, slugify } from '../git.js';

const TYPES = [
  { name: 'feat     — new feature',      value: 'feat'     },
  { name: 'fix      — bug fix',           value: 'fix'      },
  { name: 'refactor — code restructure',  value: 'refactor' },
  { name: 'docs     — documentation',     value: 'docs'     },
  { name: 'chore    — maintenance',       value: 'chore'    },
  { name: 'style    — formatting only',   value: 'style'    },
  { name: 'test     — tests',             value: 'test'     },
  { name: 'perf     — performance',       value: 'perf'     },
];

export async function branchCommand(nameArg) {
  banner();
  section('🌿', 'Create Feature Branch', 'Always branch from main — never work directly on it');

  if (!(await isGitRepo())) {
    error('Not inside a git repo.');
    return;
  }

  // ── Parse pre-formatted name e.g. feat/add-auth ───────────────────────────
  let type = '';
  let name = '';

  if (nameArg && nameArg.includes('/')) {
    const parts = nameArg.split('/');
    const knownType = TYPES.find(t => t.value === parts[0]);
    if (knownType) {
      type = parts[0];
      name = parts.slice(1).join('/');
    }
  }

  // ── Select type ───────────────────────────────────────────────────────────
  if (!type) {
    const { selected } = await inquirer.prompt([{
      type: 'list',
      name: 'selected',
      message: c.accent('Branch type:'),
      choices: TYPES,
    }]);
    type = selected;
  }

  // ── Enter name ────────────────────────────────────────────────────────────
  if (!name) {
    const { branchName } = await inquirer.prompt([{
      type: 'input',
      name: 'branchName',
      message: c.accent(`Branch name`) + c.muted(` (${type}/your-name):  ${type}/`),
      validate: v => v.trim().length > 0 || 'Name required',
    }]);
    name = branchName.trim();
  }

  const fullName = `${type}/${slugify(name)}`;
  const current  = await currentBranch();

  console.log('');
  info(`Creating: ${fullName}`);
  info(`From: ${current}`);

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: c.accent(`Create branch "${fullName}"?`),
    default: true,
  }]);

  if (!confirm) {
    info('Cancelled.');
    return;
  }

  // ── Create and switch ─────────────────────────────────────────────────────
  const spinner = ora({ text: c.muted('Creating branch...'), color: 'green' }).start();
  try {
    await execa('git', ['checkout', '-b', fullName], { cwd: process.cwd() });
    spinner.succeed(c.accent(`Switched to: ${fullName}`));
  } catch (e) {
    spinner.fail(c.danger('Branch creation failed'));
    error(e.stderr || e.message);
    return;
  }

  success(`On branch: ${fullName}`);
  console.log('');
  info('Do your work, then: mgit save "your commit message"');
  info('Or run the full workflow: mgit daily');
  console.log('');
}
