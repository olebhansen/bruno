const { ipcMain } = require('electron');

// Collections passed with --open-collection are handed to the renderer only once the startup
// workspaces are loaded, so they are added to the workspace the user ends up in. Paths from a
// second launch while Bruno is running go out right away.
let pendingCollectionPaths = [];
let readyWindow = null;

const sendPendingCollections = () => {
  if (!readyWindow || !pendingCollectionPaths.length) {
    return;
  }
  readyWindow.webContents.send('main:open-launch-collections', pendingCollectionPaths);
  pendingCollectionPaths = [];
};

ipcMain.on('main:workspaces-ready', (win) => {
  readyWindow = win;
  sendPendingCollections();
});

const openLaunchCollections = (collectionPaths) => {
  pendingCollectionPaths.push(...collectionPaths);
  sendPendingCollections();
};

module.exports = { openLaunchCollections };
