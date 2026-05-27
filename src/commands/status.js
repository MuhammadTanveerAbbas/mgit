import { banner, section, c, divider, info, warn, box } from '../ui.js';
import {
  isGitRepo, currentBranch, remoteUrl,
  getConfig, changedFiles, lastCommit,
} from '../git.js';

export async function statusCommand() {
  banner();
  section('📊', 'Project Status', 'Current repo · identity · remote · changes');

  if (!(await isGitRepo())) {
    warn('Not inside a git repo.');
    info('cd into a project folder and run: mgit connect <client>');
    console.log('');
    return;
  }

  const branch  = await currentBranch();
  const remote  = await remoteUrl();
  const name    = await getConfig('user.name');
  const email   = await getConfig('user.email');
  const changes = await changedFiles();
  const last    = await lastCommit();

  const branchColor = !branch
    ? c.danger('detached HEAD or no commits yet')
    : branch === 'main' || branch === 'master'
      ? c.warn(branch + ' ⚠ (work on a feature branch!)')
      : c.accent(branch);

  row('Branch', branchColor);

  if (remote) {
    const isSSHAlias = remote.includes('github-');
    const remoteDisplay = isSSHAlias
      ? c.accent(remote)
      : c.warn(remote + ' ⚠ (use SSH alias, not github.com)');
    row('Remote', remoteDisplay);
  } else {
    row('Remote', c.danger('not set — run: mgit connect <client>'));
  }

  divider();
  if (email) {
    row('Identity', c.info(`${name || '—'} <${email}>`));
  } else {
    row('Identity', c.warn('not set — run: mgit config'));
  }

  divider();
  if (changes === 0) {
    row('Changes', c.muted('clean'));
  } else {
    row('Changes', c.warn(`${changes} file${changes > 1 ? 's' : ''} changed`));
  }

  if (last) {
    row('Last commit', c.muted(last));
  }

  console.log('');

  const warnings = [];
  if (branch && (branch === 'main' || branch === 'master')) {
    warnings.push('Working directly on main. Create a feature branch: mgit branch');
  }
  if (remote && !remote.includes('github-')) {
    warnings.push('Remote uses github.com instead of SSH alias. Fix: mgit connect');
  }
  if (!email) {
    warnings.push('Git identity not set for this repo. Fix: mgit config');
  }

  if (warnings.length > 0) {
    box('Warnings', warnings.map(w => '⚠  ' + w).join('\n'), 'warn');
  }
}

function row(label, value) {
  const pad = label.padEnd(14);
  console.log('  ' + c.muted(pad) + value);
}
