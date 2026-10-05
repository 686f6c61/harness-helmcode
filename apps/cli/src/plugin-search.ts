/** npm registry discovery for Helmcode plugins: packages tagged `dsh-plugin`. */

/**
 * The registry search lives in the plugin-manager package so the Host remote
 * and this CLI command follow one rule; this module re-exports it for the
 * `dsh plugin search` command and its tests.
 */
export {
  formatPluginSearch,
  NPM_REGISTRY_URL,
  PLUGIN_KEYWORD,
  searchRegistryPlugins,
  type RegistryPluginResult,
  type RegistrySearchOptions,
} from '@deepseek-ai/dsh-plugin-manager/registry-search'
