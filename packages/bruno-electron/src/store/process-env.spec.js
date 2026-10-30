const {
  getProcessEnvVars,
  setDotEnvVars,
  clearDotEnvVars,
  setEnvSpecificDotEnvVars,
  clearEnvSpecificDotEnvVars,
  clearAllEnvSpecificDotEnvVars,
  setWorkspaceDotEnvVars,
  clearWorkspaceDotEnvVars,
  setCollectionWorkspace,
  clearCollectionWorkspace,
  getUserDotEnvFiles,
  setUserDotEnvVars,
  clearUserDotEnvVars
} = require('./process-env');
const { setBrunoConfig, clearBrunoConfig } = require('./bruno-config');

describe('getProcessEnvVars', () => {
  const collectionUid = 'collection-1';
  const workspacePath = '/workspaces/one';

  beforeEach(() => {
    setCollectionWorkspace(collectionUid, workspacePath);
    setWorkspaceDotEnvVars(workspacePath, { HOST: 'workspace-host', WORKSPACE_ONLY: 'workspace' });
    setDotEnvVars(collectionUid, { HOST: 'collection-host', TOKEN: 'collection-token', USER: 'collection-user' });
    setEnvSpecificDotEnvVars(collectionUid, 'prod', { TOKEN: 'prod-token' });
    setEnvSpecificDotEnvVars(collectionUid, 'test', { TOKEN: 'test-token', HOST: 'test-host' });
  });

  afterEach(() => {
    clearDotEnvVars(collectionUid);
    clearAllEnvSpecificDotEnvVars(collectionUid);
    clearWorkspaceDotEnvVars(workspacePath);
    clearCollectionWorkspace(collectionUid);
  });

  it('overrides .env per key with the active environment\'s file', () => {
    const vars = getProcessEnvVars(collectionUid, 'prod');

    expect(vars.TOKEN).toBe('prod-token');
    expect(vars.USER).toBe('collection-user');
    expect(vars.HOST).toBe('collection-host');
    expect(vars.WORKSPACE_ONLY).toBe('workspace');
  });

  it('applies only the file for the active environment', () => {
    expect(getProcessEnvVars(collectionUid, 'test')).toMatchObject({ TOKEN: 'test-token', HOST: 'test-host' });
    expect(getProcessEnvVars(collectionUid, 'prod').HOST).toBe('collection-host');
  });

  it('ignores environment specific files when no environment is active', () => {
    expect(getProcessEnvVars(collectionUid).TOKEN).toBe('collection-token');
    expect(getProcessEnvVars(collectionUid, undefined).TOKEN).toBe('collection-token');
  });

  it('falls back to .env for an environment without its own file', () => {
    expect(getProcessEnvVars(collectionUid, 'staging').TOKEN).toBe('collection-token');
  });

  it('matches the environment name exactly', () => {
    expect(getProcessEnvVars(collectionUid, 'Prod').TOKEN).toBe('collection-token');
  });

  it('stops applying a file once it is cleared', () => {
    clearEnvSpecificDotEnvVars(collectionUid, 'prod');

    expect(getProcessEnvVars(collectionUid, 'prod').TOKEN).toBe('collection-token');
    expect(getProcessEnvVars(collectionUid, 'test').TOKEN).toBe('test-token');
  });

  it('keeps environment specific files when .env is removed', () => {
    clearDotEnvVars(collectionUid);

    const vars = getProcessEnvVars(collectionUid, 'prod');
    expect(vars.TOKEN).toBe('prod-token');
    expect(vars.HOST).toBe('workspace-host');
  });

  it('does not leak environment specific files between collections', () => {
    expect(getProcessEnvVars('collection-2', 'prod').TOKEN).toBeUndefined();
  });
});

describe('getProcessEnvVars with a --dotenv-dir folder', () => {
  const collectionUid = 'collection-dir';
  const workspacePath = '/workspaces/dir';
  const collectionName = 'Altinn Notifications';

  // Every layer sets LAYER plus a key of its own, so each test can see which layer won
  const layers = {
    userRoot: { LAYER: 'user root .env', USER_ROOT: '1' },
    userCollection: { LAYER: 'user collection .env', USER_COLLECTION: '1' },
    workspace: { LAYER: 'workspace .env', WORKSPACE: '1' },
    collection: { LAYER: 'collection .env', COLLECTION: '1' },
    userRootEnv: { LAYER: 'user root .env.prod', USER_ROOT_ENV: '1' },
    userCollectionEnv: { LAYER: 'user collection .env.prod', USER_COLLECTION_ENV: '1' },
    collectionEnv: { LAYER: 'collection .env.prod', COLLECTION_ENV: '1' }
  };

  beforeEach(() => {
    setBrunoConfig(collectionUid, { name: collectionName });
    setCollectionWorkspace(collectionUid, workspacePath);
    setUserDotEnvVars(null, '.env', layers.userRoot);
    setUserDotEnvVars(collectionName, '.env', layers.userCollection);
    setWorkspaceDotEnvVars(workspacePath, layers.workspace);
    setDotEnvVars(collectionUid, layers.collection);
    setUserDotEnvVars(null, '.env.prod', layers.userRootEnv);
    setUserDotEnvVars(collectionName, '.env.prod', layers.userCollectionEnv);
    setEnvSpecificDotEnvVars(collectionUid, 'prod', layers.collectionEnv);
  });

  afterEach(() => {
    clearUserDotEnvVars(null, '.env');
    clearUserDotEnvVars(null, '.env.prod');
    clearUserDotEnvVars(collectionName, '.env');
    clearUserDotEnvVars(collectionName, '.env.prod');
    clearDotEnvVars(collectionUid);
    clearAllEnvSpecificDotEnvVars(collectionUid);
    clearWorkspaceDotEnvVars(workspacePath);
    clearCollectionWorkspace(collectionUid);
    clearBrunoConfig(collectionUid);
  });

  it('merges every layer per key', () => {
    const vars = getProcessEnvVars(collectionUid, 'prod');

    for (const key of ['USER_ROOT', 'USER_COLLECTION', 'WORKSPACE', 'COLLECTION', 'USER_ROOT_ENV', 'USER_COLLECTION_ENV', 'COLLECTION_ENV']) {
      expect(vars[key]).toBe('1');
    }
  });

  it('applies the layers in order, environment specific last and the collection root last within each group', () => {
    expect(getProcessEnvVars(collectionUid, 'prod').LAYER).toBe('collection .env.prod');

    clearEnvSpecificDotEnvVars(collectionUid, 'prod');
    expect(getProcessEnvVars(collectionUid, 'prod').LAYER).toBe('user collection .env.prod');

    clearUserDotEnvVars(collectionName, '.env.prod');
    expect(getProcessEnvVars(collectionUid, 'prod').LAYER).toBe('user root .env.prod');

    clearUserDotEnvVars(null, '.env.prod');
    expect(getProcessEnvVars(collectionUid, 'prod').LAYER).toBe('collection .env');

    clearDotEnvVars(collectionUid);
    expect(getProcessEnvVars(collectionUid, 'prod').LAYER).toBe('workspace .env');

    clearWorkspaceDotEnvVars(workspacePath);
    expect(getProcessEnvVars(collectionUid, 'prod').LAYER).toBe('user collection .env');

    clearUserDotEnvVars(collectionName, '.env');
    expect(getProcessEnvVars(collectionUid, 'prod').LAYER).toBe('user root .env');
  });

  it('lets a user environment file override a committed collection .env', () => {
    clearEnvSpecificDotEnvVars(collectionUid, 'prod');
    clearUserDotEnvVars(collectionName, '.env.prod');

    expect(getProcessEnvVars(collectionUid, 'prod').LAYER).toBe('user root .env.prod');
  });

  it('applies only the folder root to a collection without its own subfolder', () => {
    setBrunoConfig('other-collection', { name: 'Altinn Profile' });

    const vars = getProcessEnvVars('other-collection', 'prod');
    expect(vars.LAYER).toBe('user root .env.prod');
    expect(vars.USER_COLLECTION).toBeUndefined();

    clearBrunoConfig('other-collection');
  });

  it('ignores user environment files when no environment is active', () => {
    expect(getProcessEnvVars(collectionUid).LAYER).toBe('collection .env');
    expect(getProcessEnvVars(collectionUid).USER_ROOT_ENV).toBeUndefined();
  });

  it('lists the user files for a collection with its subfolder merged over the root', () => {
    expect(getUserDotEnvFiles(collectionName)).toEqual({
      '.env': { ...layers.userRoot, ...layers.userCollection },
      '.env.prod': { ...layers.userRootEnv, ...layers.userCollectionEnv }
    });
    expect(getUserDotEnvFiles('Altinn Profile')).toEqual({
      '.env': layers.userRoot,
      '.env.prod': layers.userRootEnv
    });
  });
});
