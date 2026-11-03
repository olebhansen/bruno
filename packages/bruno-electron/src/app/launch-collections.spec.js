const path = require('path');

const listeners = {};
const mockShowMessageBox = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    on: (channel, listener) => {
      listeners[channel] = listener;
    }
  },
  dialog: {
    showMessageBox: (...args) => mockShowMessageBox(...args)
  }
}));

const { openLaunchCollections, handleSecondLaunch } = require('./launch-collections');

describe('launch collections', () => {
  const win = { webContents: { send: jest.fn() } };

  it('holds paths until the workspaces are ready, then sends them as they arrive', () => {
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

  it('opens the collections of a second launch, resolved against its working directory', () => {
    const cwd = path.resolve('/elsewhere');
    win.webContents.send.mockClear();

    handleSecondLaunch(win, ['--dotenv-dir=/secrets'], { args: ['--dotenv-dir=/secrets', 'api'], cwd });

    expect(mockShowMessageBox).not.toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith('main:open-launch-collections', [path.join(cwd, 'api')]);
  });

  it('opens nothing and warns when a second launch asks for other startup switches', () => {
    win.webContents.send.mockClear();

    handleSecondLaunch(win, ['--dotenv-dir=/secrets'], { args: ['--dotenv-dir=/other', '/api'], cwd: '/' });

    expect(win.webContents.send).not.toHaveBeenCalled();
    expect(mockShowMessageBox).toHaveBeenCalledWith(win, expect.objectContaining({
      type: 'warning',
      detail: expect.stringContaining('--dotenv-dir=/other (running with --dotenv-dir=/secrets)')
    }));
  });
});
