const fs = require('fs');
const os = require('os');
const path = require('path');
const { getDotEnvDirFromArgv, isDirectory, locateUserDotEnvFile } = require('./dotenv-dir');

describe('getDotEnvDirFromArgv', () => {
  const exe = 'C:\\Program Files\\Bruno\\Bruno.exe';

  it('returns null when the switch is absent', () => {
    expect(getDotEnvDirFromArgv([exe, '--user-data-dir=C:\\tmp'])).toBeNull();
  });

  it('reads the --dotenv-dir=<path> form', () => {
    expect(getDotEnvDirFromArgv([exe, '--dotenv-dir=C:\\secrets'])).toBe('C:\\secrets');
  });

  it('reads the --dotenv-dir <path> form', () => {
    expect(getDotEnvDirFromArgv([exe, '--dotenv-dir', '/home/me/bruno-secrets'])).toBe('/home/me/bruno-secrets');
  });

  it('returns null when no path is given', () => {
    expect(getDotEnvDirFromArgv([exe, '--dotenv-dir='])).toBeNull();
    expect(getDotEnvDirFromArgv([exe, '--dotenv-dir'])).toBeNull();
    expect(getDotEnvDirFromArgv([exe, '--dotenv-dir', '--user-data-dir=C:\\tmp'])).toBeNull();
  });

  it('does not match a switch that only shares the prefix', () => {
    expect(getDotEnvDirFromArgv([exe, '--dotenv-dir-x=/tmp'])).toBeNull();
  });
});

describe('isDirectory', () => {
  it('is true for a folder and false for a file or a missing path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-dotenv-dir-'));
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, 'A=1');

    try {
      expect(isDirectory(dir)).toBe(true);
      expect(isDirectory(file)).toBe(false);
      expect(isDirectory(path.join(dir, 'missing'))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  });
});

describe('locateUserDotEnvFile', () => {
  const dir = path.resolve('/secrets');

  it('places files in the folder root under no collection', () => {
    expect(locateUserDotEnvFile(dir, path.join(dir, '.env'))).toEqual({ collectionName: null, filename: '.env' });
    expect(locateUserDotEnvFile(dir, path.join(dir, '.env.prod'))).toEqual({ collectionName: null, filename: '.env.prod' });
  });

  it('places files in a subfolder under the collection named by the subfolder', () => {
    expect(locateUserDotEnvFile(dir, path.join(dir, 'Altinn Notifications', '.env.v2 aspire'))).toEqual({
      collectionName: 'Altinn Notifications',
      filename: '.env.v2 aspire'
    });
  });

  it('ignores files that are not dotenv files', () => {
    expect(locateUserDotEnvFile(dir, path.join(dir, 'notes.txt'))).toBeNull();
    expect(locateUserDotEnvFile(dir, path.join(dir, 'my.env'))).toBeNull();
  });

  it('ignores files nested deeper than one subfolder', () => {
    expect(locateUserDotEnvFile(dir, path.join(dir, 'a', 'b', '.env'))).toBeNull();
  });
});
