const listeners = {};

jest.mock('electron', () => ({
  ipcMain: {
    on: (channel, listener) => {
      listeners[channel] = listener;
    }
  }
}));

const { openLaunchCollections } = require('./launch-collections');

describe('openLaunchCollections', () => {
  it('holds paths until the workspaces are ready, then sends them as they arrive', () => {
    const win = { webContents: { send: jest.fn() } };

    openLaunchCollections(['/collections/a']);
    openLaunchCollections(['/collections/b']);
    expect(win.webContents.send).not.toHaveBeenCalled();

    listeners['main:workspaces-ready'](win);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);
    expect(win.webContents.send).toHaveBeenCalledWith('main:open-launch-collections', ['/collections/a', '/collections/b']);

    openLaunchCollections(['/collections/c']);
    expect(win.webContents.send).toHaveBeenLastCalledWith('main:open-launch-collections', ['/collections/c']);

    openLaunchCollections([]);
    listeners['main:workspaces-ready'](win);
    expect(win.webContents.send).toHaveBeenCalledTimes(2);
  });
});
