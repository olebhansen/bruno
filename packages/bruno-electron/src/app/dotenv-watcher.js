const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { parseDotEnv } = require('@usebruno/filestore');
const { getBrunoConfig } = require('../store/bruno-config');
const { isDotEnvFile, locateUserDotEnvFile } = require('../utils/dotenv-dir');
const {
  getUserDotEnvFiles,
  setUserDotEnvVars,
  clearUserDotEnvVars,
  setDotEnvVars,
  clearDotEnvVars,
  setEnvSpecificDotEnvVars,
  clearEnvSpecificDotEnvVars,
  clearAllEnvSpecificDotEnvVars,
  setWorkspaceDotEnvVars,
  clearWorkspaceDotEnvVars
} = require('../store/process-env');

// `.env.<environment name>` holds the process.env variables for that environment
const getEnvironmentNameFromDotEnvFilename = (filename) => filename.slice('.env.'.length);

const parseVariablesToArray = (envObject) => {
  return Object.entries(envObject).map(([name, value]) => ({
    name,
    value,
    enabled: true,
    secret: false
  }));
};

const DEFAULT_WATCHER_OPTIONS = {
  ignoreInitial: false,
  persistent: true,
  ignorePermissionErrors: true,
  depth: 0
};

const createFileHandler = (win, options) => (pathname) => {
  const { type, uid, uidKey, pathKey, basePath, setEnvVars, setEnvSpecificVars } = options;
  const filename = path.basename(pathname);

  if (!isDotEnvFile(filename)) {
    return;
  }

  try {
    const content = fs.readFileSync(pathname, 'utf8');
    const jsonData = parseDotEnv(content);

    if (filename === '.env') {
      setEnvVars(jsonData);
    } else if (setEnvSpecificVars) {
      setEnvSpecificVars(getEnvironmentNameFromDotEnvFilename(filename), jsonData);
    }

    const variables = parseVariablesToArray(jsonData);

    if (!win.isDestroyed()) {
      const payload = {
        type,
        [uidKey]: uid,
        filename,
        variables,
        exists: true,
        processEnvVariables: { ...jsonData }
      };
      if (pathKey) {
        payload[pathKey] = basePath;
      }
      win.webContents.send('main:dotenv-file-update', payload);
    }
  } catch (err) {
    console.error(`Error processing dotenv file ${pathname}:`, err);
  }
};

const createUnlinkHandler = (win, options) => (pathname) => {
  const { type, uid, uidKey, pathKey, basePath, clearEnvVars, clearEnvSpecificVars } = options;
  const filename = path.basename(pathname);

  if (!isDotEnvFile(filename)) {
    return;
  }

  if (filename === '.env') {
    clearEnvVars();
  } else if (clearEnvSpecificVars) {
    clearEnvSpecificVars(getEnvironmentNameFromDotEnvFilename(filename));
  }

  if (!win.isDestroyed()) {
    const payload = {
      type,
      [uidKey]: uid,
      filename,
      variables: [],
      exists: false,
      processEnvVariables: {}
    };
    if (pathKey) {
      payload[pathKey] = basePath;
    }
    win.webContents.send('main:dotenv-file-update', payload);
  }
};

const sendUserDotEnvFiles = (win, collectionUid) => {
  if (win.isDestroyed()) {
    return;
  }
  win.webContents.send('main:user-dotenv-update', {
    collectionUid,
    files: getUserDotEnvFiles(getBrunoConfig(collectionUid).name)
  });
};

class DotEnvWatcher {
  constructor() {
    this.collectionWatchers = new Map();
    this.collectionUids = new Map();
    this.workspaceWatchers = new Map();
    this.userDirWatcher = null;
  }

  addCollectionWatcher(win, collectionPath, collectionUid) {
    if (this.collectionWatchers.has(collectionPath)) {
      this.collectionWatchers.get(collectionPath).close();
    }

    const watcher = chokidar.watch(collectionPath, {
      ...DEFAULT_WATCHER_OPTIONS,
      disableGlobbing: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 100
      }
    });

    const handlerOptions = {
      type: 'collection',
      uid: collectionUid,
      uidKey: 'collectionUid',
      basePath: collectionPath,
      setEnvVars: (data) => setDotEnvVars(collectionUid, data),
      clearEnvVars: () => clearDotEnvVars(collectionUid),
      setEnvSpecificVars: (environmentName, data) => setEnvSpecificDotEnvVars(collectionUid, environmentName, data),
      clearEnvSpecificVars: (environmentName) => clearEnvSpecificDotEnvVars(collectionUid, environmentName)
    };

    const handleFile = createFileHandler(win, handlerOptions);
    const handleUnlink = createUnlinkHandler(win, handlerOptions);

    watcher.on('add', handleFile);
    watcher.on('change', handleFile);
    watcher.on('unlink', handleUnlink);
    watcher.on('error', (err) => {
      console.error(`Collection watcher error for ${collectionPath}:`, err);
    });

    this.collectionWatchers.set(collectionPath, watcher);
    this.collectionUids.set(collectionPath, collectionUid);

    if (this.userDirWatcher) {
      sendUserDotEnvFiles(win, collectionUid);
    }
  }

  removeCollectionWatcher(collectionPath, collectionUid) {
    if (this.collectionWatchers.has(collectionPath)) {
      this.collectionWatchers.get(collectionPath).close();
      this.collectionWatchers.delete(collectionPath);
    }
    this.collectionUids.delete(collectionPath);
    if (collectionUid) {
      clearDotEnvVars(collectionUid);
      clearAllEnvSpecificDotEnvVars(collectionUid);
    }
  }

  hasCollectionWatcher(collectionPath) {
    return this.collectionWatchers.has(collectionPath);
  }

  addWorkspaceWatcher(win, workspacePath, workspaceUid) {
    if (this.workspaceWatchers.has(workspacePath)) {
      this.workspaceWatchers.get(workspacePath).close();
    }

    const watcher = chokidar.watch(workspacePath, {
      ...DEFAULT_WATCHER_OPTIONS,
      disableGlobbing: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 250
      }
    });

    const handlerOptions = {
      type: 'workspace',
      uid: workspaceUid,
      uidKey: 'workspaceUid',
      pathKey: 'workspacePath',
      basePath: workspacePath,
      setEnvVars: (data) => setWorkspaceDotEnvVars(workspacePath, data),
      clearEnvVars: () => clearWorkspaceDotEnvVars(workspacePath)
    };

    const handleFile = createFileHandler(win, handlerOptions);
    const handleUnlink = createUnlinkHandler(win, handlerOptions);

    watcher.on('add', handleFile);
    watcher.on('change', handleFile);
    watcher.on('unlink', handleUnlink);
    watcher.on('error', (err) => {
      console.error(`Workspace watcher error for ${workspacePath}:`, err);
    });

    this.workspaceWatchers.set(workspacePath, watcher);
  }

  removeWorkspaceWatcher(workspacePath) {
    if (this.workspaceWatchers.has(workspacePath)) {
      this.workspaceWatchers.get(workspacePath).close();
      this.workspaceWatchers.delete(workspacePath);
    }
    clearWorkspaceDotEnvVars(workspacePath);
  }

  hasWorkspaceWatcher(workspacePath) {
    return this.workspaceWatchers.has(workspacePath);
  }

  addUserDirWatcher(win, dirPath) {
    const resolvedDirPath = path.resolve(dirPath);

    const sendToAllCollections = () => {
      for (const collectionUid of this.collectionUids.values()) {
        sendUserDotEnvFiles(win, collectionUid);
      }
    };

    const handleFile = (pathname) => {
      const location = locateUserDotEnvFile(resolvedDirPath, pathname);
      if (!location) {
        return;
      }
      try {
        const jsonData = parseDotEnv(fs.readFileSync(pathname, 'utf8'));
        setUserDotEnvVars(location.collectionName, location.filename, jsonData);
        sendToAllCollections();
      } catch (err) {
        console.error(`Error processing dotenv file ${pathname}:`, err);
      }
    };

    const handleUnlink = (pathname) => {
      const location = locateUserDotEnvFile(resolvedDirPath, pathname);
      if (!location) {
        return;
      }
      clearUserDotEnvVars(location.collectionName, location.filename);
      sendToAllCollections();
    };

    const watcher = chokidar.watch(resolvedDirPath, {
      ...DEFAULT_WATCHER_OPTIONS,
      depth: 1,
      disableGlobbing: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 100
      }
    });

    watcher.on('add', handleFile);
    watcher.on('change', handleFile);
    watcher.on('unlink', handleUnlink);
    watcher.on('error', (err) => {
      console.error(`Dotenv folder watcher error for ${resolvedDirPath}:`, err);
    });

    this.userDirWatcher = watcher;
  }

  closeAll() {
    const pending = [];
    const collect = (watcher) => {
      try {
        const result = watcher?.close();
        if (result && typeof result.then === 'function') pending.push(result);
      } catch (err) {}
    };

    for (const [path, watcher] of this.collectionWatchers) collect(watcher);
    this.collectionWatchers.clear();

    for (const [path, watcher] of this.workspaceWatchers) collect(watcher);
    this.workspaceWatchers.clear();

    if (this.userDirWatcher) {
      collect(this.userDirWatcher);
      this.userDirWatcher = null;
    }

    return Promise.allSettled(pending);
  }
}

const dotEnvWatcher = new DotEnvWatcher();

module.exports = dotEnvWatcher;
