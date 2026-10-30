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
  clearCollectionWorkspace
} = require('./process-env');

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
