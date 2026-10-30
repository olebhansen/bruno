import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import get from 'lodash/get';
import { formatCollectionDisplayName } from 'utils/collections/displayName';

const useCollectionDisplayName = () => {
  const template = useSelector((state) => get(state.app.preferences, 'display.collectionNameTemplate'));

  return useCallback((collection) => formatCollectionDisplayName(template, collection), [template]);
};

export default useCollectionDisplayName;
