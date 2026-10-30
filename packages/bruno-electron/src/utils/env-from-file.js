const fs = require('fs');
const path = require('path');
const { parseDotEnv } = require('@usebruno/filestore');

const ENV_FROM_FILE_SWITCH = '--env-from-file';

// Accepts both `--env-from-file=<path>` and `--env-from-file <path>`
const getEnvFromFilePathFromArgv = (argv) => {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith(`${ENV_FROM_FILE_SWITCH}=`)) {
      return arg.slice(ENV_FROM_FILE_SWITCH.length + 1) || null;
    }
    if (arg === ENV_FROM_FILE_SWITCH) {
      const next = argv[i + 1];
      return next && !next.startsWith('--') ? next : null;
    }
  }
  return null;
};

const readEnvFromFile = (filePath) => {
  const absolutePath = path.resolve(filePath);
  return {
    absolutePath,
    envVars: parseDotEnv(fs.readFileSync(absolutePath, 'utf8'))
  };
};

module.exports = {
  ENV_FROM_FILE_SWITCH,
  getEnvFromFilePathFromArgv,
  readEnvFromFile
};
