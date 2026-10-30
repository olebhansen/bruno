const fs = require('fs');
const os = require('os');
const path = require('path');
const { getEnvFromFilePathFromArgv, readEnvFromFile } = require('./env-from-file');

describe('getEnvFromFilePathFromArgv', () => {
  const exe = 'C:\\Program Files\\Bruno\\Bruno.exe';

  it('returns null when the switch is absent', () => {
    expect(getEnvFromFilePathFromArgv([exe])).toBeNull();
    expect(getEnvFromFilePathFromArgv([exe, '--user-data-dir=C:\\tmp'])).toBeNull();
  });

  it('reads the --env-from-file=<path> form', () => {
    expect(getEnvFromFilePathFromArgv([exe, '--env-from-file=C:\\secrets\\.env'])).toBe('C:\\secrets\\.env');
  });

  it('reads the --env-from-file <path> form', () => {
    expect(getEnvFromFilePathFromArgv([exe, '--env-from-file', '/home/me/secrets.env'])).toBe('/home/me/secrets.env');
  });

  it('keeps an = inside the path', () => {
    expect(getEnvFromFilePathFromArgv([exe, '--env-from-file=/tmp/a=b.env'])).toBe('/tmp/a=b.env');
  });

  it('returns null when no path is given', () => {
    expect(getEnvFromFilePathFromArgv([exe, '--env-from-file='])).toBeNull();
    expect(getEnvFromFilePathFromArgv([exe, '--env-from-file'])).toBeNull();
    expect(getEnvFromFilePathFromArgv([exe, '--env-from-file', '--user-data-dir=C:\\tmp'])).toBeNull();
  });

  it('does not match a switch that only shares the prefix', () => {
    expect(getEnvFromFilePathFromArgv([exe, '--env-from-file-x=/tmp/.env'])).toBeNull();
  });
});

describe('readEnvFromFile', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-env-from-file-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('parses the file and returns its absolute path', () => {
    const filePath = path.join(dir, 'secrets.env');
    fs.writeFileSync(filePath, '# comment\r\nAPI_KEY=abc123\r\nHOST="https://example.com"\r\n');

    const { absolutePath, envVars } = readEnvFromFile(filePath);

    expect(absolutePath).toBe(path.resolve(filePath));
    expect(envVars).toEqual({ API_KEY: 'abc123', HOST: 'https://example.com' });
  });

  it('throws when the file does not exist', () => {
    expect(() => readEnvFromFile(path.join(dir, 'missing.env'))).toThrow(/ENOENT/);
  });
});
