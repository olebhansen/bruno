/**
 * This file stores all the process.env variables under collection and workspace scope
 *
 * process.env variables are sourced from 4 places:
 * 1. .env.<environment name> file in the collection root, for the active environment
 * 2. .env file in the collection root
 * 3. .env file in the workspace root
 * 4. process.env variables set in the OS
 *
 * Priority (highest to lowest): collection .env.<environment name> > collection .env > workspace .env > OS process.env
 *
 * Variables are merged per key, so an environment specific file only needs the keys that differ.
 *
 * Multiple collections can be opened in the same electron app.
 * Each collection's .env file can have different values for the same process.env variable.
 */

const dotEnvVars = {};
const envSpecificDotEnvVars = {};
const workspaceDotEnvVars = {};
const collectionWorkspaceMap = {};

// collectionUid is a hash based on the collection path
const getProcessEnvVars = (collectionUid, environmentName) => {
  const workspacePath = collectionWorkspaceMap[collectionUid];
  const workspaceEnvVars = workspacePath ? workspaceDotEnvVars[workspacePath] : {};
  const collectionEnvSpecificVars = envSpecificDotEnvVars[collectionUid] || {};

  return {
    ...process.env,
    ...workspaceEnvVars,
    ...dotEnvVars[collectionUid],
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
  setDotEnvVars,
  clearDotEnvVars,
  setEnvSpecificDotEnvVars,
  clearEnvSpecificDotEnvVars,
  clearAllEnvSpecificDotEnvVars,
  setWorkspaceDotEnvVars,
  clearWorkspaceDotEnvVars,
  setCollectionWorkspace,
  clearCollectionWorkspace
};
