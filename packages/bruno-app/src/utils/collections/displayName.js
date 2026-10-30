import { normalizePath } from 'utils/common/path';

export const DEFAULT_COLLECTION_NAME_TEMPLATE = '{name}';

const TOKEN_PATTERN = /\{(name|branch|gitRoot|folder)\}/g;
const INNERMOST_BRACKET_GROUP_PATTERN = /[([]([^()[\]]*)[)\]]/g;

const getTokenValues = (collection) => ({
  name: collection.name || '',
  branch: collection.gitHead?.branch || '',
  gitRoot: collection.gitHead?.rootFolder || '',
  folder: normalizePath(collection.pathname).split('/').pop() || ''
});

/**
 * Renders the user's collection name template, e.g. `{name} ({branch})`.
 * Empty tokens, and bracket groups left empty by them, are dropped so a collection
 * outside git shows `My API` rather than `My API ()`. Whitespace is tidied in the
 * template only, never inside token values, so `{name}` renders the stored name as is.
 */
export const formatCollectionDisplayName = (template, collection) => {
  const values = getTokenValues(collection);
  const fillTokens = (text) => text.replace(TOKEN_PATTERN, (_, token) => values[token]);

  const displayName = fillTokens(
    (template || DEFAULT_COLLECTION_NAME_TEMPLATE)
      .replace(INNERMOST_BRACKET_GROUP_PATTERN, (group, inner) => (fillTokens(inner).trim() ? group : ''))
      .replace(TOKEN_PATTERN, (token, name) => (values[name] ? token : ''))
      .replace(/\s+/g, ' ')
      .replace(/([([]) | ([)\]])/g, '$1$2')
      .trim()
  );

  return displayName || values.name;
};
