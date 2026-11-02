import toast from 'react-hot-toast';
import { newHttpRequest, tryResponseExample, selectCollection, openLaunchCollections } from './actions';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() }
}));

const mockUuid = jest.fn();

jest.mock('utils/common', () => ({
  uuid: () => mockUuid(),
  waitForNextTick: () => Promise.resolve(),
  safeParseJSON: (value) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  },
  safeStringifyJSON: (value) => JSON.stringify(value)
}));

describe('collection actions', () => {
  beforeEach(() => {
    mockUuid
      .mockReturnValueOnce('request-uid')
      .mockReturnValueOnce('task-uid');

    window.ipcRenderer = {
      invoke: jest.fn().mockResolvedValue()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('newHttpRequest', () => {
    it('should pass requestPaneTab into the queued open request task', async () => {
      const dispatch = jest.fn();
      const getState = () => ({
        collections: {
          tempDirectories: {
            'collection-uid': 'C:\\bruno\\tmp\\transient\\collection'
          },
          collections: [
            {
              uid: 'collection-uid',
              pathname: 'C:\\bruno\\collection',
              format: 'bru',
              items: []
            }
          ]
        }
      });

      await newHttpRequest({
        requestName: 'demo.pdf',
        filename: 'demo.pdf',
        requestType: 'http-request',
        requestUrl: 'https://example-bucket.s3.amazonaws.com/demo.pdf?x-id=PutObject',
        requestMethod: 'PUT',
        collectionUid: 'collection-uid',
        itemUid: null,
        isTransient: true,
        requestPaneTab: 'body',
        auth: {
          mode: 'none'
        },
        settings: {
          encodeUrl: false
        }
      })(dispatch, getState);

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:new-request',
        expect.stringContaining('demo.pdf.bru'),
        expect.objectContaining({
          uid: 'request-uid',
          isTransient: true,
          request: expect.objectContaining({
            method: 'PUT',
            url: 'https://example-bucket.s3.amazonaws.com/demo.pdf?x-id=PutObject',
            auth: {
              mode: 'none'
            }
          }),
          settings: {
            encodeUrl: false
          }
        })
      );

      expect(dispatch).toHaveBeenCalledWith({
        type: 'app/insertTaskIntoQueue',
        payload: expect.objectContaining({
          uid: 'task-uid',
          type: 'OPEN_REQUEST',
          collectionUid: 'collection-uid',
          preview: false,
          requestPaneTab: 'body'
        })
      });
    });
  });

  describe('tryResponseExample', () => {
    const exampleRequest = {
      url: 'http://localhost:8081/api/echo/anything/:id?verbose=true',
      method: 'POST',
      headers: [{ uid: 'h1', name: 'Content-Type', value: 'application/json', enabled: true }],
      params: [
        { uid: 'p1', name: 'verbose', value: 'true', type: 'query', enabled: true },
        { uid: 'p2', name: 'id', value: '42', type: 'path', enabled: true }
      ],
      body: { mode: 'json', json: '{"name":"bruno"}' }
    };

    const buildState = ({ transientNames = [] } = {}) => ({
      collections: {
        tempDirectories: { 'collection-uid': '/tmp/transient/collection' },
        collections: [
          {
            uid: 'collection-uid',
            pathname: '/bruno/collection',
            format: 'yml',
            items: [
              {
                uid: 'item-uid',
                type: 'http-request',
                name: 'Get User',
                pathname: '/bruno/collection/get-user.yml',
                request: { method: 'GET', url: exampleRequest.url, auth: { mode: 'bearer', bearer: { token: 'abc' } } },
                examples: [{ uid: 'example-uid', name: 'Success', type: 'http-request', request: exampleRequest }]
              },
              ...transientNames.map((name, index) => ({
                uid: `transient-${index}`,
                type: 'http-request',
                name,
                isTransient: true,
                pathname: `/tmp/transient/collection/${name}.yml`,
                request: { method: 'GET', url: '' }
              }))
            ]
          }
        ]
      }
    });

    it('creates a transient request from the example and queues an auto-sent open task', async () => {
      const getState = () => buildState();
      const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch, getState) : action));

      await tryResponseExample({ itemUid: 'item-uid', collectionUid: 'collection-uid', exampleUid: 'example-uid' })(dispatch, getState);

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:new-request',
        expect.stringContaining('Untitled 1.yml'),
        expect.objectContaining({
          name: 'Untitled 1',
          isTransient: true,
          request: expect.objectContaining({
            method: 'POST',
            url: exampleRequest.url,
            headers: exampleRequest.headers,
            params: exampleRequest.params,
            body: exampleRequest.body,
            auth: { mode: 'inherit' }
          })
        })
      );

      const queuedTask = dispatch.mock.calls.map(([action]) => action).find((action) => action?.type === 'app/insertTaskIntoQueue');
      expect(queuedTask.payload).toEqual(
        expect.objectContaining({
          type: 'OPEN_REQUEST',
          collectionUid: 'collection-uid',
          preview: false,
          autoSend: true
        })
      );
    });

    it('numbers the request after the transient requests already open', async () => {
      const getState = () => buildState({ transientNames: ['Untitled 1', 'Untitled 2'] });
      const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch, getState) : action));

      await tryResponseExample({ itemUid: 'item-uid', collectionUid: 'collection-uid', exampleUid: 'example-uid' })(dispatch, getState);

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:new-request',
        expect.stringContaining('Untitled 3.yml'),
        expect.objectContaining({ name: 'Untitled 3' })
      );
    });
  });

  describe('selectCollection', () => {
    const buildGetState = (collection) => () => ({
      app: { preferences: {} },
      collections: {
        collections: [{ uid: 'collection-uid', pathname: 'C:\bruno\collection', brunoConfig: {}, items: [], ...collection }]
      }
    });
    const dispatchedTypes = (dispatch) => dispatch.mock.calls.map(([action]) => action?.type);

    it('mounts, expands and opens the settings tab of a collection that is not loaded yet', () => {
      const dispatch = jest.fn((action) => (typeof action === 'function' ? Promise.resolve() : action));

      selectCollection('collection-uid')(dispatch, buildGetState({ mountStatus: 'unmounted', collapsed: true }));

      expect(dispatch.mock.calls.some(([action]) => typeof action === 'function')).toBe(true);
      expect(dispatchedTypes(dispatch)).toEqual(expect.arrayContaining(['collections/toggleCollection', 'tabs/addTab']));
      const tab = dispatch.mock.calls.map(([action]) => action).find((action) => action?.type === 'tabs/addTab');
      expect(tab.payload).toEqual(expect.objectContaining({ uid: 'collection-uid', collectionUid: 'collection-uid', type: 'collection-settings' }));
    });

    it('only opens the settings tab of a collection that is already mounted and expanded', () => {
      const dispatch = jest.fn((action) => action);

      selectCollection('collection-uid')(dispatch, buildGetState({ mountStatus: 'mounted', collapsed: false }));

      expect(dispatchedTypes(dispatch)).toEqual(['tabs/addTab']);
    });

    it('does nothing for an unknown collection', () => {
      const dispatch = jest.fn();

      selectCollection('other-uid')(dispatch, buildGetState({}));

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('openLaunchCollections', () => {
    it('opens the collections with select and reports each one that failed', async () => {
      window.ipcRenderer.invoke.mockResolvedValue({
        opened: ['C:\collections\a'],
        failed: [{ path: 'C:\collections\b', error: 'The collection is not valid' }],
        invalid: ['C:\collections\missing']
      });

      await openLaunchCollections(['C:\collections\a', 'C:\collections\b', 'C:\collections\missing'])();

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:open-multiple-collections',
        ['C:\collections\a', 'C:\collections\b', 'C:\collections\missing'],
        { silent: true, select: true, dontSendDisplayErrors: true }
      );
      expect(toast.error).toHaveBeenCalledWith('Cannot open collection "C:\collections\b": The collection is not valid');
      expect(toast.error).toHaveBeenCalledWith('Cannot open collection "C:\collections\missing": no such folder');
      expect(toast.error).toHaveBeenCalledTimes(2);
    });
  });
});
