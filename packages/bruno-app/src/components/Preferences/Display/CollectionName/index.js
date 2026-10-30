import React, { useEffect, useMemo, useRef } from 'react';
import get from 'lodash/get';
import debounce from 'lodash/debounce';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { DEFAULT_COLLECTION_NAME_TEMPLATE } from 'utils/collections/displayName';
import StyledWrapper from './StyledWrapper';

const CollectionName = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const saveTemplate = useMemo(() => debounce((template) => {
    const latestPreferences = preferencesRef.current;
    dispatch(
      savePreferences({
        ...latestPreferences,
        display: {
          ...get(latestPreferences, 'display', {}),
          collectionNameTemplate: template
        }
      })
    ).catch(() => {
      toast.error('Failed to save preferences');
    });
  }, 500), [dispatch]);

  // Closing preferences right after typing must not drop the pending save
  useEffect(() => () => saveTemplate.flush(), [saveTemplate]);

  return (
    <StyledWrapper>
      <label className="block" htmlFor="collection-name-template">Collection Name</label>
      <input
        id="collection-name-template"
        data-testid="collection-name-template"
        type="text"
        className="block textbox mt-2 w-full"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        maxLength={200}
        placeholder={DEFAULT_COLLECTION_NAME_TEMPLATE}
        defaultValue={get(preferences, 'display.collectionNameTemplate', DEFAULT_COLLECTION_NAME_TEMPLATE)}
        onChange={(event) => saveTemplate(event.target.value)}
      />
      <div className="text-xs mt-1 text-muted">
        How collections are named in the sidebar and tabs. Tokens: <code>{'{name}'}</code>, <code>{'{branch}'}</code>,{' '}
        <code>{'{gitRoot}'}</code> (git root folder, e.g. a worktree), <code>{'{folder}'}</code> (collection folder).
        Example: <code>{'{name} ({branch})'}</code>
      </div>
    </StyledWrapper>
  );
};

export default CollectionName;
