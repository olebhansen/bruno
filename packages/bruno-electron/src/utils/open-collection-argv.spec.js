const path = require('path');
const { getOpenCollectionPathsFromArgv } = require('./open-collection-argv');

describe('getOpenCollectionPathsFromArgv', () => {
  const cwd = path.resolve('/work');
  const collectionA = path.resolve('/collections/a');
  const collectionB = path.resolve('/collections/b');

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns no paths when the switch is absent', () => {
    expect(getOpenCollectionPathsFromArgv(['Bruno.exe', '--dotenv-dir=/secrets'], cwd)).toEqual([]);
  });

  it('reads the --open-collection=<path> form', () => {
    expect(getOpenCollectionPathsFromArgv(['Bruno.exe', `--open-collection=${collectionA}`], cwd)).toEqual([collectionA]);
  });

  it('reads the --open-collection <path> form', () => {
    expect(getOpenCollectionPathsFromArgv(['Bruno.exe', '--open-collection', collectionA], cwd)).toEqual([collectionA]);
  });

  it('collects every occurrence in order, mixing both forms', () => {
    const argv = ['Bruno.exe', '--open-collection', collectionA, '--user-data-dir=/data', `--open-collection=${collectionB}`];
    expect(getOpenCollectionPathsFromArgv(argv, cwd)).toEqual([collectionA, collectionB]);
  });

  it('resolves relative paths against the given working directory', () => {
    const argv = ['Bruno.exe', '--open-collection', 'api', '--open-collection=../shared/api'];
    expect(getOpenCollectionPathsFromArgv(argv, cwd)).toEqual([path.join(cwd, 'api'), path.resolve(cwd, '../shared/api')]);
  });

  it('keeps spaces in a quoted path', () => {
    const spaced = path.resolve('/collections/My API');
    expect(getOpenCollectionPathsFromArgv(['Bruno.exe', `--open-collection=${spaced}`], cwd)).toEqual([spaced]);
  });

  it('ignores the switch without a value and warns', () => {
    expect(getOpenCollectionPathsFromArgv(['Bruno.exe', '--open-collection'], cwd)).toEqual([]);
    expect(getOpenCollectionPathsFromArgv(['Bruno.exe', '--open-collection='], cwd)).toEqual([]);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('does not take the next switch as the value', () => {
    const argv = ['Bruno.exe', '--open-collection', '--dotenv-dir=/secrets', `--open-collection=${collectionA}`];
    expect(getOpenCollectionPathsFromArgv(argv, cwd)).toEqual([collectionA]);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('does not match switches that only share the prefix', () => {
    expect(getOpenCollectionPathsFromArgv(['Bruno.exe', '--open-collections=/x', '--open-collection-x', '/y'], cwd)).toEqual([]);
  });
});
