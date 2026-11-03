const path = require('path');

const OPEN_COLLECTION_SWITCH = '--open-collection';

// A second launch only ever reaches a running instance with the same user data dir (the
// single-instance lock lives there), and its collections are opened separately, so neither
// switch can conflict with the running instance.
const SWITCHES_HANDLED_ON_SECOND_LAUNCH = new Set([OPEN_COLLECTION_SWITCH, '--user-data-dir']);

// The arguments the user gave, without the executable (and without the app path under `electron .`)
const getUserArgs = (argv, isDefaultApp) => argv.slice(isDefaultApp ? 2 : 1);

// Splits the arguments, in order, into switches and bare paths:
// - `--name=value` and `--name value` give the switch a value, so a bare path right after a
//   switch without `=` is that switch's value, not a path of its own
// - a switch with neither gets a null value
// - everything after `--` is a path
// - URLs (`bruno://` deeplinks) are neither
const parseLaunchArgs = (args) => {
  const entries = [];
  let switchesEnded = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!switchesEnded && arg === '--') {
      switchesEnded = true;
    } else if (!switchesEnded && arg.startsWith('-')) {
      const separatorIndex = arg.indexOf('=');
      if (separatorIndex !== -1) {
        entries.push({ name: arg.slice(0, separatorIndex), value: arg.slice(separatorIndex + 1) });
      } else if (args[i + 1] !== undefined && !args[i + 1].startsWith('-')) {
        entries.push({ name: arg, value: args[i + 1] });
        i++;
      } else {
        entries.push({ name: arg, value: null });
      }
    } else if (!arg.includes('://')) {
      entries.push({ name: null, value: arg });
    }
  }
  return entries;
};

// Collections come from `--open-collection <path>` / `--open-collection=<path>` (any number of
// times) and from bare paths, as given by `Bruno <folder>` or by dropping a folder on the
// executable. Relative paths are resolved against `cwd`, the working directory of the launch.
const getOpenCollectionPaths = (args, cwd) => {
  const collectionPaths = [];
  for (const { name, value } of parseLaunchArgs(args)) {
    if (name !== null && name !== OPEN_COLLECTION_SWITCH) {
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

// The switches of a second launch that the running instance did not start with, as written.
// They only take effect at startup, so the running instance cannot apply them.
const getConflictingSwitches = (runningArgs, launchArgs) => {
  const runningSwitches = parseLaunchArgs(runningArgs).filter(({ name }) => name !== null);
  return parseLaunchArgs(launchArgs)
    .filter(({ name }) => name !== null && !SWITCHES_HANDLED_ON_SECOND_LAUNCH.has(name))
    .filter(({ name, value }) => !runningSwitches.some((running) => running.name === name && running.value === value))
    .map(({ name, value }) => ({
      name,
      value,
      runningValues: runningSwitches.filter((running) => running.name === name).map((running) => running.value)
    }));
};

module.exports = {
  getUserArgs,
  getOpenCollectionPaths,
  getConflictingSwitches
};
