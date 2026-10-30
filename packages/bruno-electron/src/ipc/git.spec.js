jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));
jest.mock('../utils/git', () => ({
  cloneGitRepository: jest.fn(),
  getCollectionGitRepoUrl: jest.fn(),
  listBranchesForRemoteUrl: jest.fn()
}));
jest.mock('../utils/filesystem', () => ({
  createDirectory: jest.fn(),
  removeDirectory: jest.fn()
}));
jest.mock('../app/git-head-watcher', () => ({
  addCollectionWatcher: jest.fn()
}));

const { getCollectionGitRepoUrl, listBranchesForRemoteUrl } = require('../utils/git');
const gitHeadWatcher = require('../app/git-head-watcher');
const { getCollectionGitRemoteUrl, handleListRemoteBranches, watchCollectionGitHead } = require('./git');

describe('getCollectionGitRemoteUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the origin url for the collection path', async () => {
    getCollectionGitRepoUrl.mockResolvedValue('https://github.com/org/repo.git');

    expect(await getCollectionGitRemoteUrl('/tmp/repo/collection')).toBe('https://github.com/org/repo.git');
    expect(getCollectionGitRepoUrl).toHaveBeenCalledWith('/tmp/repo/collection');
  });

  it('maps an empty remote url to null', async () => {
    getCollectionGitRepoUrl.mockResolvedValue('');

    expect(await getCollectionGitRemoteUrl('/tmp/repo')).toBeNull();
  });

  it('returns null when the collection is not a git repo (lookup throws)', async () => {
    getCollectionGitRepoUrl.mockRejectedValue(new Error('not a git repository'));

    expect(await getCollectionGitRemoteUrl('/tmp/not-a-repo')).toBeNull();
  });
});

describe('handleListRemoteBranches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the branch listing for the url', async () => {
    listBranchesForRemoteUrl.mockResolvedValue({ branches: ['main', 'develop'], defaultBranch: 'main' });

    expect(await handleListRemoteBranches({}, { url: '  https://github.com/org/repo.git  ' })).toEqual({
      branches: ['main', 'develop'],
      defaultBranch: 'main'
    });
    expect(listBranchesForRemoteUrl).toHaveBeenCalledWith({ url: 'https://github.com/org/repo.git' });
  });

  it('rejects a missing url', async () => {
    await expect(handleListRemoteBranches({}, { url: '   ' })).rejects.toThrow('Repository URL is required');
    expect(listBranchesForRemoteUrl).not.toHaveBeenCalled();
  });

  it('rejects a url that git would read as a command option', async () => {
    await expect(handleListRemoteBranches({}, { url: '--upload-pack=touch /tmp/pwned' }))
      .rejects.toThrow('Repository URL is not valid');
    expect(listBranchesForRemoteUrl).not.toHaveBeenCalled();
  });
});

describe('watchCollectionGitHead', () => {
  const mainWindow = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts watching and returns the current git head', () => {
    gitHeadWatcher.addCollectionWatcher.mockReturnValue({ branch: 'main', rootFolder: 'repo' });

    expect(watchCollectionGitHead(mainWindow, { collectionUid: 'c1', collectionPath: '/tmp/repo' })).toEqual({
      branch: 'main',
      rootFolder: 'repo'
    });
    expect(gitHeadWatcher.addCollectionWatcher).toHaveBeenCalledWith(mainWindow, '/tmp/repo', 'c1');
  });

  it('rejects a missing collection path', () => {
    expect(() => watchCollectionGitHead(mainWindow, { collectionUid: 'c1' })).toThrow('Collection uid and path are required');
    expect(gitHeadWatcher.addCollectionWatcher).not.toHaveBeenCalled();
  });
});
