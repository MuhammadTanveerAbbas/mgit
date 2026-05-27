import inquirer from 'inquirer';
import ora from 'ora';
import { execa } from 'execa';
import { banner, section, success, warn, error, info, box, codeBlock, c } from '../ui.js';
import { isGitRepo, currentBranch, remoteUrl, gitTry } from '../git.js';

const SITUATIONS = [
  {
    id: 'unrelated-histories',
    name: 'Remote has existing code, local is different',
    desc: 'Pull with --allow-unrelated-histories',
    auto: true,
  },
  {
    id: 'https-to-ssh',
    name: 'Remote is HTTPS — need to convert to SSH alias',
    desc: 'Convert https://github.com/ to git@github-clientname:',
    auto: true,
  },
  {
    id: 'wrong-identity',
    name: 'Commits showing wrong name/email',
    desc: 'Set identity for this repo only',
    auto: true,
  },
  {
    id: 'undo-local',
    name: 'Undo last commit (NOT pushed yet)',
    desc: 'git reset --soft HEAD~1 — keeps your changes',
    auto: true,
  },
  {
    id: 'undo-pushed',
    name: 'Undo last commit (already pushed)',
    desc: 'git revert HEAD — creates a safe revert commit',
    auto: true,
  },
  {
    id: 'merge-conflict',
    name: 'Merge conflict after pull',
    desc: 'Shows how to resolve manually',
    auto: false,
  },
  {
    id: 'permission-denied',
    name: 'Permission denied (publickey) on push',
    desc: 'SSH key not on GitHub or wrong alias',
    auto: false,
  },
  {
    id: 'wrong-branch-delete',
    name: 'Pushed to wrong branch — delete it',
    desc: 'Delete a remote branch (safe for feature branches only)',
    auto: true,
  },
  {
    id: 'stash',
    name: 'Need to stash work temporarily',
    desc: 'Save work-in-progress without committing',
    auto: true,
  },
];

export async function fixCommand() {
  banner();
  section('🔧', 'Situation Fixer', 'Common problems with interactive fixes');

  const inRepo = await isGitRepo();

  const { situation } = await inquirer.prompt([{
    type: 'list',
    name: 'situation',
    message: c.accent('What\'s the problem?'),
    choices: SITUATIONS.map(s => ({
      name: `${s.auto ? c.accent('⚡ auto') : c.muted('📋 guide')}  ${s.name}`,
      value: s.id,
    })),
    pageSize: 12,
  }]);

  console.log('');

  switch (situation) {

    // ── Unrelated histories ─────────────────────────────────────────────────
    case 'unrelated-histories': {
      if (!inRepo) { error('Not in a git repo.'); return; }
      const branch = await currentBranch();
      const s = ora({ text: c.muted('Pulling with --allow-unrelated-histories...'), color: 'green' }).start();
      try {
        await execa('git', ['pull', 'origin', branch, '--allow-unrelated-histories'], { cwd: process.cwd() });
        s.succeed(c.accent('Pull complete'));
        success('Done! You may have merge conflicts to resolve.');
      } catch (e) {
        s.fail(c.danger('Pull failed'));
        error(e.stderr || e.message);
      }
      break;
    }

    // ── HTTPS to SSH ────────────────────────────────────────────────────────
    case 'https-to-ssh': {
      if (!inRepo) { error('Not in a git repo.'); return; }
      const current = await remoteUrl();
      if (!current) { error('No remote set.'); return; }
      if (!current.startsWith('https://github.com/')) {
        info('Remote is already SSH: ' + current);
        return;
      }
      const { alias } = await inquirer.prompt([{
        type: 'input',
        name: 'alias',
        message: c.accent('SSH alias for this client') + c.muted(' (e.g. github-acme):'),
        validate: v => v.startsWith('github-') || 'Must start with github-',
      }]);
      const ownerRepo = current.replace('https://github.com/', '').replace('.git', '');
      const newRemote = `git@${alias}:${ownerRepo}.git`;
      await execa('git', ['remote', 'set-url', 'origin', newRemote], { cwd: process.cwd() });
      success('Remote updated: ' + newRemote);
      break;
    }

    // ── Wrong identity ───────────────────────────────────────────────────────
    case 'wrong-identity': {
      if (!inRepo) { error('Not in a git repo.'); return; }
      const { name, email } = await inquirer.prompt([
        { type: 'input', name: 'name', message: c.accent('Correct name:'), default: 'Tanveer' },
        { type: 'input', name: 'email', message: c.accent('Correct email:'), validate: v => v.includes('@') || 'Valid email required' },
      ]);
      await execa('git', ['config', 'user.name', name], { cwd: process.cwd() });
      await execa('git', ['config', 'user.email', email], { cwd: process.cwd() });
      success(`Identity set: ${name} <${email}> (this repo only)`);
      info('Future commits will use this identity.');
      break;
    }

    // ── Undo local commit ────────────────────────────────────────────────────
    case 'undo-local': {
      if (!inRepo) { error('Not in a git repo.'); return; }
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: c.warn('Undo last commit? (your changes are kept, just uncommitted)'),
        default: false,
      }]);
      if (!confirm) { info('Cancelled.'); return; }
      const s = ora({ text: c.muted('Undoing commit...'), color: 'green' }).start();
      try {
        await execa('git', ['reset', '--soft', 'HEAD~1'], { cwd: process.cwd() });
        s.succeed(c.accent('Commit undone — changes are unstaged'));
        success('Files are still there, just uncommitted.');
      } catch (e) {
        s.fail(c.danger('Failed'));
        error(e.message);
      }
      break;
    }

    // ── Undo pushed commit ───────────────────────────────────────────────────
    case 'undo-pushed': {
      if (!inRepo) { error('Not in a git repo.'); return; }
      warn('This creates a NEW revert commit — safe for shared branches.');
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: c.warn('Revert HEAD and push?'),
        default: false,
      }]);
      if (!confirm) { info('Cancelled.'); return; }
      const s = ora({ text: c.muted('Reverting...'), color: 'green' }).start();
      try {
        await execa('git', ['revert', 'HEAD', '--no-edit'], { cwd: process.cwd() });
        s.succeed(c.accent('Revert commit created'));
        const s2 = ora({ text: c.muted('Pushing...'), color: 'green' }).start();
        await execa('git', ['push'], { cwd: process.cwd() });
        s2.succeed(c.accent('Pushed'));
        success('Revert pushed successfully.');
      } catch (e) {
        s.fail(c.danger('Failed'));
        error(e.message);
      }
      break;
    }

    // ── Merge conflict ───────────────────────────────────────────────────────
    case 'merge-conflict': {
      box(
        'Resolving Merge Conflicts',
        [
          '1. Open the conflicting files in your editor',
          '2. Look for <<<<<<< markers',
          '3. Keep the code you want, delete the markers',
          '4. Save the files',
          '5. Run:',
          '     git add .',
          '     git commit',
          '',
          'To abort and start over:',
          '     git merge --abort',
        ].join('\n'),
        'info'
      );
      break;
    }

    // ── Permission denied ────────────────────────────────────────────────────
    case 'permission-denied': {
      box(
        'Fix: Permission Denied (publickey)',
        [
          '1. Check your remote URL is using the SSH alias:',
          '     mgit status  →  look at Remote line',
          '',
          '2. Test the SSH connection:',
          '     mgit test <clientname>',
          '',
          '3. Verify your key is on GitHub:',
          '     github.com/OWNER/REPO/settings/keys',
          '',
          '4. If key is missing, re-run the setup:',
          '     mgit setup <clientname>',
        ].join('\n'),
        'danger'
      );
      break;
    }

    // ── Delete wrong branch ──────────────────────────────────────────────────
    case 'wrong-branch-delete': {
      if (!inRepo) { error('Not in a git repo.'); return; }
      warn('NEVER delete main, master, or shared branches this way.');
      const { branchName } = await inquirer.prompt([{
        type: 'input',
        name: 'branchName',
        message: c.accent('Branch name to delete (remote):'),
        validate: v => {
          if (!v.trim()) return 'Required';
          if (v === 'main' || v === 'master') return 'Cannot delete main/master this way';
          return true;
        },
      }]);
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: c.danger(`Delete remote branch "${branchName}"?`),
        default: false,
      }]);
      if (!confirm) { info('Cancelled.'); return; }
      const s = ora({ text: c.muted('Deleting remote branch...'), color: 'green' }).start();
      try {
        await execa('git', ['push', 'origin', '--delete', branchName], { cwd: process.cwd() });
        s.succeed(c.accent(`Remote branch "${branchName}" deleted`));
      } catch (e) {
        s.fail(c.danger('Delete failed'));
        error(e.stderr || e.message);
      }
      break;
    }

    // ── Stash ────────────────────────────────────────────────────────────────
    case 'stash': {
      if (!inRepo) { error('Not in a git repo.'); return; }
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: c.accent('Stash action:'),
        choices: [
          { name: 'Save current work to stash',  value: 'save' },
          { name: 'Pop stash (restore saved work)', value: 'pop' },
          { name: 'List all stashes',             value: 'list' },
          { name: 'Drop/clear all stashes',       value: 'drop' },
        ],
      }]);

      if (action === 'save') {
        const { msg } = await inquirer.prompt([{
          type: 'input',
          name: 'msg',
          message: c.accent('Stash message (optional):'),
        }]);
        const args = msg.trim() ? ['stash', 'push', '-m', msg.trim()] : ['stash'];
        await execa('git', args, { cwd: process.cwd() });
        success('Work stashed. Switch branch or pull, then: mgit fix → Pop stash');
      } else if (action === 'pop') {
        await execa('git', ['stash', 'pop'], { cwd: process.cwd() });
        success('Stash restored!');
      } else if (action === 'list') {
        const r = await gitTry('stash', 'list');
        if (r.stdout) {
          r.stdout.split('\n').forEach(l => console.log(c.muted('  ' + l)));
        } else {
          info('No stashes found.');
        }
      } else if (action === 'drop') {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm', name: 'confirm',
          message: c.danger('Clear ALL stashes?'), default: false,
        }]);
        if (confirm) {
          await execa('git', ['stash', 'clear'], { cwd: process.cwd() });
          success('All stashes cleared.');
        }
      }
      break;
    }
  }
  console.log('');
}
