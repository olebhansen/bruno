const fs = require('fs');
const path = require('path');

const DOTENV_DIR_SWITCH = '--dotenv-dir';

const isDotEnvFile = (filename) => {
  return filename === '.env' || filename.startsWith('.env.');
};

// A --dotenv-dir file is either in the folder root, applying to every collection, or in a
// subfolder named after the collection it applies to. Anything deeper is ignored.
const locateUserDotEnvFile = (dirPath, pathname) => {
  const filename = path.basename(pathname);
  if (!isDotEnvFile(filename)) {
    return null;
  }

  const parentPath = path.dirname(pathname);
  if (parentPath === dirPath) {
    return { collectionName: null, filename };
  }
  if (path.dirname(parentPath) === dirPath) {
    return { collectionName: path.basename(parentPath), filename };
  }
  return null;
};

// Accepts both `--dotenv-dir=<path>` and `--dotenv-dir <path>`
const getDotEnvDirFromArgv = (argv) => {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith(`${DOTENV_DIR_SWITCH}=`)) {
      return arg.slice(DOTENV_DIR_SWITCH.length + 1) || null;
    }
    if (arg === DOTENV_DIR_SWITCH) {
      const next = argv[i + 1];
      return next && !next.startsWith('--') ? next : null;
    }
  }
  return null;
};

const isDirectory = (dirPath) => {
  try {
    return fs.statSync(path.resolve(dirPath)).isDirectory();
  } catch (err) {
    return false;
  }
};

module.exports = {
  DOTENV_DIR_SWITCH,
  getDotEnvDirFromArgv,
  isDirectory,
  isDotEnvFile,
  locateUserDotEnvFile
};
