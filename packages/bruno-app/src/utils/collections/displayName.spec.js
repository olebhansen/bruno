import { formatCollectionDisplayName } from './displayName';

const collection = {
  name: 'Altinn Notifications',
  pathname: 'C:\\code\\worktrees\\notifications\\orgfix\\collections\\altinn',
  gitHead: { branch: 'feature/orgfix', rootFolder: 'orgfix' }
};

const collectionOutsideGit = {
  name: 'Altinn Notifications',
  pathname: '/home/user/collections/altinn'
};

describe('formatCollectionDisplayName', () => {
  it('shows the stored name when no template is set', () => {
    expect(formatCollectionDisplayName(undefined, collection)).toBe('Altinn Notifications');
    expect(formatCollectionDisplayName('', collection)).toBe('Altinn Notifications');
  });

  it('keeps the stored name untouched with the default template', () => {
    const oddlySpaced = { ...collectionOutsideGit, name: '  My  API: ' };

    expect(formatCollectionDisplayName('{name}', oddlySpaced)).toBe('  My  API: ');
  });

  it('fills every token', () => {
    expect(formatCollectionDisplayName('{name} ({branch}) [{gitRoot}/{folder}]', collection))
      .toBe('Altinn Notifications (feature/orgfix) [orgfix/altinn]');
  });

  it('takes the folder name from both Windows and POSIX paths', () => {
    expect(formatCollectionDisplayName('{folder}', collection)).toBe('altinn');
    expect(formatCollectionDisplayName('{folder}', collectionOutsideGit)).toBe('altinn');
  });

  it('drops bracket groups whose tokens are all empty', () => {
    expect(formatCollectionDisplayName('{name} ({branch})', collectionOutsideGit)).toBe('Altinn Notifications');
    expect(formatCollectionDisplayName('[{gitRoot}] {name}', collectionOutsideGit)).toBe('Altinn Notifications');
  });

  it('keeps bracket groups that still have content', () => {
    expect(formatCollectionDisplayName('{name} ({branch} {folder})', collectionOutsideGit))
      .toBe('Altinn Notifications (altinn)');
    expect(formatCollectionDisplayName('{name} (local)', collectionOutsideGit)).toBe('Altinn Notifications (local)');
  });

  it('tidies whitespace left by empty tokens', () => {
    expect(formatCollectionDisplayName('{branch}  {name}', collectionOutsideGit)).toBe('Altinn Notifications');
  });

  it('does not touch brackets or token-like text inside values', () => {
    const tricky = { ...collection, gitHead: { branch: 'fix(api)-{name}', rootFolder: '' } };

    expect(formatCollectionDisplayName('{name} ({branch})', tricky)).toBe('Altinn Notifications (fix(api)-{name})');
  });

  it('leaves unknown tokens as literal text', () => {
    expect(formatCollectionDisplayName('{name} {unknown}', collection)).toBe('Altinn Notifications {unknown}');
  });

  it('falls back to the stored name when the template renders empty', () => {
    expect(formatCollectionDisplayName('({branch})', collectionOutsideGit)).toBe('Altinn Notifications');
  });
});
