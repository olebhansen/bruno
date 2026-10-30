const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { getCollectionGitRootPath } = require('../utils/git');

// Linked worktrees and submodules have a `.git` file pointing at the real git directory
const resolveGitDir = (gitRootPath) => {
  const dotGitPath = path.join(gitRootPath, '.git');
  if (fs.statSync(dotGitPath).isDirectory()) {
    return dotGitPath;
  }

  const match = fs.readFileSync(dotGitPath, 'utf8').match(/^gitdir:\s*(.+)$/m);
  return match ? path.resolve(gitRootPath, match[1].trim()) : null;
};

// HEAD holds `ref: refs/heads/<branch>`, or a bare commit hash when detached
const parseGitHead = (content) => {
  const head = content.trim();
  const ref = head.match(/^ref:\s*(?:refs\/heads\/)?(.+)$/);
  if (ref) {
    return ref[1];
  }

  return /^[0-9a-f]{40,64}$/i.test(head) ? head.slice(0, 7) : null;
};

const readGitHead = (headPath) => {
  try {
    return parseGitHead(fs.readFileSync(headPath, 'utf8'));
  } catch (err) {
    return null;
  }
};

const findGitHead = (collectionPath) => {
  const gitRootPath = getCollectionGitRootPath(collectionPath);
  if (!gitRootPath) {
    return null;
  }

  try {
    const gitDir = resolveGitDir(gitRootPath);
    if (!gitDir) {
      return null;
    }

    return {
      headPath: path.join(gitDir, 'HEAD'),
      rootFolder: path.basename(path.resolve(gitRootPath))
    };
  } catch (err) {
    return null;
  }
};

class GitHeadWatcher {
  constructor() {
    this.watchers = new Map();
  }

  addCollectionWatcher(win, collectionPath, collectionUid) {
    this.removeCollectionWatcher(collectionUid);

    const gitHead = findGitHead(collectionPath);
    if (!gitHead) {
      return null;
    }

    const getGitHead = () => ({ branch: readGitHead(gitHead.headPath), rootFolder: gitHead.rootFolder });
    const sendGitHead = () => {
      if (!win.isDestroyed()) {
        win.webContents.send('main:collection-git-head-update', { collectionUid, gitHead: getGitHead() });
      }
    };

    const watcher = chokidar.watch(gitHead.headPath, {
      ignoreInitial: true,
      persistent: true,
      ignorePermissionErrors: true,
      disableGlobbing: true
    });
    watcher.on('add', sendGitHead).on('change', sendGitHead);
    this.watchers.set(collectionUid, watcher);

    return getGitHead();
  }

  removeCollectionWatcher(collectionUid) {
    const watcher = this.watchers.get(collectionUid);
    if (watcher) {
      watcher.close();
      this.watchers.delete(collectionUid);
    }
  }

  closeAllWatchers() {
    const pending = [...this.watchers.values()].map((watcher) => watcher.close());
    this.watchers.clear();
    return Promise.allSettled(pending);
  }
}

const gitHeadWatcher = new GitHeadWatcher();

module.exports = gitHeadWatcher;
module.exports.parseGitHead = parseGitHead;
module.exports.findGitHead = findGitHead;
