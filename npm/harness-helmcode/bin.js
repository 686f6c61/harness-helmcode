#!/usr/bin/env node
/**
 * `harness-helmcode` — the public entry for Helmcode, the NaN Builders
 * zero-log agent harness. This wrapper installs the harness CLI
 * (`@deepseek-ai/dsh`, the internal scope of the same project) and hands
 * execution to its `runCli()` in-process, so `npx harness-helmcode web`
 * boots the local Web UI and `npx harness-helmcode --help` prints the CLI.
 * No shell, no spawn: the arguments `runCli()` parses are this process's
 * own `process.argv`, exactly as the `dsh` binary would see them.
 * @module harness-helmcode/bin
 */
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

let cliBin
try {
  const manifest = require.resolve('@deepseek-ai/dsh/package.json')
  cliBin = join(dirname(manifest), 'lib', 'bin.js')
} catch (debugError) {
  process.stderr.write('DEBUG ' + String(debugError?.code) + ' ' + String(debugError?.message?.split('\n')[0]) + '\n')
  process.stderr.write('harness-helmcode: the @deepseek-ai/dsh harness CLI is not installed next to this wrapper; reinstall with `npm install -g harness-helmcode`.\n')
  process.exit(1)
}

try {
  const bin = await import(pathToFileURL(cliBin).href)
  await bin.runCli()
} catch (error) {
  process.stderr.write(`harness-helmcode: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
