import os from 'os';

export const isWindows = os.platform() === 'win32';
export const isMac = os.platform() === 'darwin';
export const isLinux = os.platform() === 'linux';
export const isWSL = isLinux && !!process.env.WSL_DISTRO_NAME;

export function platformBadge() {
  if (isWSL) return '[Windows/WSL]';
  if (isWindows) return process.env.MSYSTEM ? '[Windows/Git Bash]' : '[Windows]';
  if (isMac) return '[macOS]';
  return '[Linux]';
}

export function platformLabel() {
  if (isWSL) return 'Windows (WSL)';
  if (isWindows) return process.env.MSYSTEM ? 'Windows (Git Bash)' : 'Windows';
  if (isMac) return 'macOS';
  return 'Linux';
}

export function isGitBash() {
  return isWindows && !!process.env.MSYSTEM;
}
