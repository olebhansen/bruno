/**
 * This file stores all the process.env variables under collection and workspace scope
 *
 * process.env variables are sourced from these places, each overriding the ones before it per key:
 * 1. process.env variables set in the OS
 * 2. .env in the folder passed with `--dotenv-dir`
 * 3. .env in that folder's subfolder named after the collection
 * 4. .env file in the workspace root
 * 5. .env file in the collection root
 * 6. .env.<environment name> in the `--dotenv-dir` folder, for the active environment
 * 7. .env.<environment name> in that folder's subfolder named after the collection
 * 8. .env.<environment name> file in the collection root
 *
 * Environment specific files win over general ones, and within each group the files next to the
 * collection win over the user's own folder. The folder keeps values outside the repo, such as
 * secrets shared by every clone or worktree of a collection, while a file in the collection
 * root, such as one generated for a local stack, can still override them.
 *
 * The subfolder is matched against the collection name from bruno.json / opencollection.yml,
 * which is the same in every clone or worktree of the collection.
 *
 * Multiple collections can be opened in the same electron app.
 * Each collection's .env file can have different values for the same process.env variable.
 */

const { getBrunoConfig } = require('./bruno-config');

const dotEnvVars = {};
const envSpecificDotEnvVars = {};
const workspaceDotEnvVars = {};
const collectionWorkspaceMap = {};

// --dotenv-dir files by filename: the folder root, and each subfolder by collection name
const userDotEnvVars = {};
const userCollectionDotEnvVars = {};

const getUserDotEnvVars = (collectionName, filename) => {
  const collectionFiles = (collectionName && userCollectionDotEnvVars[collectionName]) || {};

  return {
    ...userDotEnvVars[filename],
    ...collectionFiles[filename]
  };
};

// The --dotenv-dir files that apply to a collection, by filename, with its subfolder merged over the root
const getUserDotEnvFiles = (collectionName) => {
  const collectionFiles = (collectionName && userCollectionDotEnvVars[collectionName]) || {};
  const filenames = new Set([...Object.keys(userDotEnvVars), ...Object.keys(collectionFiles)]);

  const files = {};
  for (const filename of filenames) {
    files[filename] = getUserDotEnvVars(collectionName, filename);
  }
  return files;
};

// collectionUid is a hash based on the collection path
const getProcessEnvVars = (collectionUid, environmentName) => {
  const workspacePath = collectionWorkspaceMap[collectionUid];
  const workspaceEnvVars = workspacePath ? workspaceDotEnvVars[workspacePath] : {};
  const collectionEnvSpecificVars = envSpecificDotEnvVars[collectionUid] || {};
  const collectionName = getBrunoConfig(collectionUid).name;

  return {
    ...process.env,
    ...getUserDotEnvVars(collectionName, '.env'),
    ...workspaceEnvVars,
    ...dotEnvVars[collectionUid],
    ...(environmentName ? getUserDotEnvVars(collectionName, `.env.${environmentName}`) : {}),
    ...(environmentName ? collectionEnvSpecificVars[environmentName] : {})
  };
};

const setDotEnvVars = (collectionUid, envVars) => {
  dotEnvVars[collectionUid] = envVars;
};

const clearDotEnvVars = (collectionUid) => {
  delete dotEnvVars[collectionUid];
};

const setEnvSpecificDotEnvVars = (collectionUid, environmentName, envVars) => {
  if (!envSpecificDotEnvVars[collectionUid]) {
    envSpecificDotEnvVars[collectionUid] = {};
  }
  envSpecificDotEnvVars[collectionUid][environmentName] = envVars;
};

const clearEnvSpecificDotEnvVars = (collectionUid, environmentName) => {
  if (envSpecificDotEnvVars[collectionUid]) {
    delete envSpecificDotEnvVars[collectionUid][environmentName];
  }
};

const clearAllEnvSpecificDotEnvVars = (collectionUid) => {
  delete envSpecificDotEnvVars[collectionUid];
};

// collectionName is null for a file in the root of the --dotenv-dir folder
const setUserDotEnvVars = (collectionName, filename, envVars) => {
  if (!collectionName) {
    userDotEnvVars[filename] = envVars;
    return;
  }
  if (!userCollectionDotEnvVars[collectionName]) {
    userCollectionDotEnvVars[collectionName] = {};
  }
  userCollectionDotEnvVars[collectionName][filename] = envVars;
};

const clearUserDotEnvVars = (collectionName, filename) => {
  if (!collectionName) {
    delete userDotEnvVars[filename];
    return;
  }
  if (userCollectionDotEnvVars[collectionName]) {
    delete userCollectionDotEnvVars[collectionName][filename];
  }
};

const setWorkspaceDotEnvVars = (workspacePath, envVars) => {
  workspaceDotEnvVars[workspacePath] = envVars;
};

const clearWorkspaceDotEnvVars = (workspacePath) => {
  delete workspaceDotEnvVars[workspacePath];
};

const setCollectionWorkspace = (collectionUid, workspacePath) => {
  collectionWorkspaceMap[collectionUid] = workspacePath;
};

const clearCollectionWorkspace = (collectionUid) => {
  delete collectionWorkspaceMap[collectionUid];
};

module.exports = {
  getProcessEnvVars,
  getUserDotEnvFiles,
  setDotEnvVars,
  clearDotEnvVars,
  setEnvSpecificDotEnvVars,
  clearEnvSpecificDotEnvVars,
  clearAllEnvSpecificDotEnvVars,
  setUserDotEnvVars,
  clearUserDotEnvVars,
  setWorkspaceDotEnvVars,
  clearWorkspaceDotEnvVars,
  setCollectionWorkspace,
  clearCollectionWorkspace
};
