const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseGitHead, findGitHead } = require('./git-head-watcher');

describe('parseGitHead', () => {
  it('returns the branch of a symbolic ref', () => {
    expect(parseGitHead('ref: refs/heads/main\n')).toBe('main');
    expect(parseGitHead('ref: refs/heads/feature/display-name\r\n')).toBe('feature/display-name');
  });

  it('returns the short hash of a detached HEAD', () => {
    expect(parseGitHead('a025f49fe1b2c3d4e5f60718293a4b5c6d7e8f90\n')).toBe('a025f49');
  });

  it('returns null for unrecognised content', () => {
    expect(parseGitHead('')).toBeNull();
    expect(parseGitHead('not a head')).toBeNull();
  });
});

describe('findGitHead', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-git-head-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('finds HEAD in the .git directory of a regular clone', () => {
    const repoPath = path.join(tempDir, 'notifications');
    const collectionPath = path.join(repoPath, 'collections', 'api');
    fs.mkdirSync(collectionPath, { recursive: true });
    fs.mkdirSync(path.join(repoPath, '.git'));

    expect(findGitHead(collectionPath)).toEqual({
      headPath: path.join(repoPath, '.git', 'HEAD'),
      rootFolder: 'notifications'
    });
  });

  it('follows the .git file of a linked worktree', () => {
    const worktreeGitDir = path.join(tempDir, 'notifications', '.git', 'worktrees', 'orgfix');
    const worktreePath = path.join(tempDir, 'worktrees', 'orgfix');
    fs.mkdirSync(worktreeGitDir, { recursive: true });
    fs.mkdirSync(worktreePath, { recursive: true });
    fs.writeFileSync(path.join(worktreePath, '.git'), `gitdir: ${worktreeGitDir}\n`);

    expect(findGitHead(worktreePath)).toEqual({
      headPath: path.join(worktreeGitDir, 'HEAD'),
      rootFolder: 'orgfix'
    });
  });

  it('resolves a relative gitdir against the git root', () => {
    const submodulePath = path.join(tempDir, 'parent', 'sub');
    fs.mkdirSync(path.join(tempDir, 'parent', '.git', 'modules', 'sub'), { recursive: true });
    fs.mkdirSync(submodulePath, { recursive: true });
    fs.writeFileSync(path.join(submodulePath, '.git'), 'gitdir: ../.git/modules/sub\n');

    expect(findGitHead(submodulePath).headPath).toBe(path.join(tempDir, 'parent', '.git', 'modules', 'sub', 'HEAD'));
  });
});
