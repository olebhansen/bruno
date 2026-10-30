const {
  getProcessEnvVars,
  setEnvFromFileVars,
  setDotEnvVars,
  clearDotEnvVars,
  setWorkspaceDotEnvVars,
  clearWorkspaceDotEnvVars,
  setCollectionWorkspace,
  clearCollectionWorkspace
} = require('./process-env');

describe('getProcessEnvVars', () => {
  const collectionUid = 'collection-1';
  const workspacePath = '/workspaces/one';
  const osVarName = 'BRUNO_PROCESS_ENV_SPEC_OS_VAR';

  beforeEach(() => {
    process.env[osVarName] = 'from-os';
    setCollectionWorkspace(collectionUid, workspacePath);
  });

  afterEach(() => {
    delete process.env[osVarName];
    setEnvFromFileVars({});
    clearDotEnvVars(collectionUid);
    clearWorkspaceDotEnvVars(workspacePath);
    clearCollectionWorkspace(collectionUid);
  });

  it('lets --env-from-file values override collection, workspace and OS values', () => {
    setWorkspaceDotEnvVars(workspacePath, { [osVarName]: 'from-workspace', SHARED: 'from-workspace' });
    setDotEnvVars(collectionUid, { SHARED: 'from-collection', TOKEN: 'from-collection' });
    setEnvFromFileVars({ [osVarName]: 'from-file', TOKEN: 'from-file' });

    const vars = getProcessEnvVars(collectionUid);

    expect(vars[osVarName]).toBe('from-file');
    expect(vars.TOKEN).toBe('from-file');
    expect(vars.SHARED).toBe('from-collection');
  });

  it('applies --env-from-file values to collections without a .env or workspace', () => {
    setEnvFromFileVars({ TOKEN: 'from-file' });

    expect(getProcessEnvVars('collection-without-dotenv').TOKEN).toBe('from-file');
  });

  it('leaves the existing priority unchanged when no file is loaded', () => {
    setWorkspaceDotEnvVars(workspacePath, { [osVarName]: 'from-workspace' });

    expect(getProcessEnvVars(collectionUid)[osVarName]).toBe('from-workspace');
  });
});
