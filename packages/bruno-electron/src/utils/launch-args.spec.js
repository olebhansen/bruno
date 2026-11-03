const path = require('path');
const { getUserArgs, getOpenCollectionPaths, getConflictingSwitches } = require('./launch-args');

describe('getUserArgs', () => {
  it('drops the executable of a packaged app', () => {
    expect(getUserArgs(['Bruno.exe', '--open-collection=/a'], false)).toEqual(['--open-collection=/a']);
  });

  it('also drops the app path under `electron .`', () => {
    expect(getUserArgs(['electron', '.', '/a'], true)).toEqual(['/a']);
  });
});

describe('getOpenCollectionPaths', () => {
  const cwd = path.resolve('/work');
  const collectionA = path.resolve('/collections/a');
  const collectionB = path.resolve('/collections/b');

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns no paths without collection arguments', () => {
    expect(getOpenCollectionPaths(['--dotenv-dir=/secrets', '--disable-gpu'], cwd)).toEqual([]);
  });

  it('reads the --open-collection=<path> form', () => {
    expect(getOpenCollectionPaths([`--open-collection=${collectionA}`], cwd)).toEqual([collectionA]);
  });

  it('reads the --open-collection <path> form', () => {
    expect(getOpenCollectionPaths(['--open-collection', collectionA], cwd)).toEqual([collectionA]);
  });

  it('reads bare paths, as from `Bruno <folder>` or a folder dropped on the executable', () => {
    expect(getOpenCollectionPaths([collectionA], cwd)).toEqual([collectionA]);
    expect(getOpenCollectionPaths(['.'], cwd)).toEqual([cwd]);
  });

  it('collects every occurrence in order, mixing all forms', () => {
    const args = [collectionA, '--user-data-dir=/data', '--open-collection', collectionB, '--open-collection=api'];
    expect(getOpenCollectionPaths(args, cwd)).toEqual([collectionA, collectionB, path.join(cwd, 'api')]);
  });

  it('resolves relative paths against the given working directory', () => {
    expect(getOpenCollectionPaths(['--open-collection=../shared/api', 'local'], cwd))
      .toEqual([path.resolve(cwd, '../shared/api'), path.join(cwd, 'local')]);
  });

  it('keeps spaces in a quoted path', () => {
    const spaced = path.resolve('/collections/My API');
    expect(getOpenCollectionPaths([`--open-collection=${spaced}`, spaced], cwd)).toEqual([spaced, spaced]);
  });

  it('takes a bare path right after another switch as that switch\'s value', () => {
    expect(getOpenCollectionPaths(['--dotenv-dir', '/secrets', collectionA], cwd)).toEqual([collectionA]);
  });

  it('takes everything after -- as paths', () => {
    expect(getOpenCollectionPaths(['--', '--odd-name'], cwd)).toEqual([path.join(cwd, '--odd-name')]);
  });

  it('ignores deeplink URLs', () => {
    expect(getOpenCollectionPaths(['bruno://app/oauth2/callback?code=1'], cwd)).toEqual([]);
  });

  it('ignores --open-collection without a value and warns', () => {
    expect(getOpenCollectionPaths(['--open-collection'], cwd)).toEqual([]);
    expect(getOpenCollectionPaths(['--open-collection='], cwd)).toEqual([]);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('does not take the next switch as the value', () => {
    expect(getOpenCollectionPaths(['--open-collection', '--dotenv-dir=/secrets', `--open-collection=${collectionA}`], cwd))
      .toEqual([collectionA]);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('does not match switches that only share the prefix', () => {
    expect(getOpenCollectionPaths(['--open-collections=/x', '--open-collection-x=/y'], cwd)).toEqual([]);
  });
});

describe('getConflictingSwitches', () => {
  it('accepts a launch with only collections and the same user data dir', () => {
    const running = ['--user-data-dir=/data', '--dotenv-dir=/secrets'];
    const launch = ['--user-data-dir=/data2', '--open-collection=/a', '/b'];
    expect(getConflictingSwitches(running, launch)).toEqual([]);
  });

  it('accepts switches the running instance has with the same value, in either form', () => {
    expect(getConflictingSwitches(['--dotenv-dir', '/secrets'], ['--dotenv-dir=/secrets', '/a'])).toEqual([]);
  });

  it('reports a switch with another value than the running instance', () => {
    expect(getConflictingSwitches(['--dotenv-dir=/secrets'], ['--dotenv-dir=/other', '/a'])).toEqual([
      { name: '--dotenv-dir', value: '/other', runningValues: ['/secrets'] }
    ]);
  });

  it('reports a switch the running instance was started without', () => {
    expect(getConflictingSwitches([], ['--disable-gpu', '--remote-debugging-port=9340'])).toEqual([
      { name: '--disable-gpu', value: null, runningValues: [] },
      { name: '--remote-debugging-port', value: '9340', runningValues: [] }
    ]);
  });

  it('accepts a launch that leaves out switches the running instance has', () => {
    expect(getConflictingSwitches(['--dotenv-dir=/secrets'], ['/a'])).toEqual([]);
  });
});
