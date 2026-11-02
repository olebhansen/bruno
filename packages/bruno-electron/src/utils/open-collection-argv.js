const path = require('path');

const OPEN_COLLECTION_SWITCH = '--open-collection';

// Accepts both `--open-collection=<path>` and `--open-collection <path>`, any number of times.
// Relative paths are resolved against `cwd`, the working directory of the launching process.
const getOpenCollectionPathsFromArgv = (argv, cwd) => {
  const collectionPaths = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    let value;
    if (arg.startsWith(`${OPEN_COLLECTION_SWITCH}=`)) {
      value = arg.slice(OPEN_COLLECTION_SWITCH.length + 1);
    } else if (arg === OPEN_COLLECTION_SWITCH) {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        value = next;
        i++;
      }
    } else {
      continue;
    }

    if (!value) {
      console.warn(`${OPEN_COLLECTION_SWITCH} needs the path of a collection folder`);
      continue;
    }
    collectionPaths.push(path.resolve(cwd, value));
  }
  return collectionPaths;
};

module.exports = { getOpenCollectionPathsFromArgv };
