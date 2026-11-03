const { ipcMain, dialog } = require('electron');
const { getOpenCollectionPaths, getConflictingSwitches } = require('../utils/launch-args');

// Collections from the launch arguments are handed to the renderer only once the startup
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

const formatSwitch = (name, value) => (value === null ? name : `${name}=${value}`);

const describeConflict = ({ name, value, runningValues }) => {
  const running = runningValues.length
    ? `running with ${runningValues.map((runningValue) => formatSwitch(name, runningValue)).join(', ')}`
    : 'not set in the running Bruno';
  return `${formatSwitch(name, value)} (${running})`;
};

// A second launch reaches the running instance through the single-instance lock. Its collections
// open there, unless it asks for startup switches the running instance was not started with:
// opening them without those (say another --dotenv-dir) would quietly use the wrong settings.
const handleSecondLaunch = (win, runningArgs, { args, cwd }) => {
  const conflicts = getConflictingSwitches(runningArgs, args);
  if (conflicts.length) {
    dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Bruno is already running',
      message: 'Bruno is already running with other launch options, so this launch was not applied.',
      detail: [
        ...conflicts.map(describeConflict),
        '',
        'Close Bruno and start it again with these options, or start a separate Bruno with its own --user-data-dir.'
      ].join('\n')
    });
    return;
  }

  openLaunchCollections(getOpenCollectionPaths(args, cwd));
};

module.exports = { openLaunchCollections, handleSecondLaunch };
