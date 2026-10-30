/**
 * This file stores all the process.env variables under collection and workspace scope
 *
 * process.env variables are sourced from 4 places:
 * 1. the file passed with `--env-from-file` when launching the app
 * 2. .env file in the workspace root
 * 3. .env file in the collection root
 * 4. process.env variables set in the OS
 *
 * Priority (highest to lowest): --env-from-file > collection .env > workspace .env > OS process.env
 *
 * The --env-from-file values win so a file kept outside the repo can override what a
 * collection or workspace .env provides, without editing files under version control.
 *
 * Multiple collections can be opened in the same electron app.
 * Each collection's .env file can have different values for the same process.env variable.
 */

const dotEnvVars = {};
const workspaceDotEnvVars = {};
const collectionWorkspaceMap = {};
let envFromFileVars = {};

// collectionUid is a hash based on the collection path
const getProcessEnvVars = (collectionUid) => {
  const workspacePath = collectionWorkspaceMap[collectionUid];
  const workspaceEnvVars = workspacePath ? workspaceDotEnvVars[workspacePath] : {};

  return {
    ...process.env,
    ...workspaceEnvVars,
    ...dotEnvVars[collectionUid],
    ...envFromFileVars
  };
};

const setDotEnvVars = (collectionUid, envVars) => {
  dotEnvVars[collectionUid] = envVars;
};

const clearDotEnvVars = (collectionUid) => {
  delete dotEnvVars[collectionUid];
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

const setEnvFromFileVars = (envVars) => {
  envFromFileVars = envVars;
};

module.exports = {
  getProcessEnvVars,
  setEnvFromFileVars,
  setDotEnvVars,
  clearDotEnvVars,
  setWorkspaceDotEnvVars,
  clearWorkspaceDotEnvVars,
  setCollectionWorkspace,
  clearCollectionWorkspace
};
