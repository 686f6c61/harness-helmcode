/**
 * Local CI simulator: replays, on this host, exactly the commands the GitHub
 * workflows run, so a green simulator run means a green Actions run.
 *
 * Each workflow job is a thin wrapper over repository scripts (the gate
 * runner, tsc, vitest, electron-builder); this script owns the job-to-command
 * manifest and executes the entries this host can run, skipping GitHub-only
 * lanes (Windows gates, release publishing, secret-gated smokes) with an
 * explicit notice instead of silently passing them. The companion spec
 * (`ci-workflow.spec.ts`) fails when a workflow job and this manifest drift
 * apart, which is what keeps "simulator green" a real guarantee.
 *
 * Usage:
 *   tsx scripts/ci-simulate.ts            # PR parity: static, typecheck, lint, unit
 *   tsx scripts/ci-simulate.ts --quick    # static gates plus workflow lint only
 *   tsx scripts/ci-simulate.ts --all      # PR parity plus the master lanes
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

interface SimJob {
  /** Workflow file under .github/workflows, without the directory. */
  workflow: string
  /** Job id inside that workflow, as Actions names it. */
  job: string
  /** Commands the workflow runs for this job (matched by the drift spec). */
  workflowCommands: readonly string[]
  /** Arguments for the fixed `pnpm` invocation this host runs instead. */
  localPnpmArgs: readonly (readonly [string, ...string[]])[]
  /** `local` jobs execute here; `remote` jobs are reported and skipped. */
  host: 'local' | 'remote'
  /** Default lanes run without flags; `all` needs --all; `quick` needs nothing extra. */
  lane: 'quick' | 'default' | 'all'
}

/** The single source of truth the drift spec checks the workflows against. */
export const JOBS: readonly SimJob[] = [
  {
    workflow: 'ci.yml', job: 'static', host: 'local', lane: 'quick',
    workflowCommands: ['pnpm run check:ci:static'],
    localPnpmArgs: [['run', 'check:ci:static']],
  },
  {
    workflow: 'ci.yml', job: 'typecheck', host: 'local', lane: 'default',
    workflowCommands: ['pnpm run typecheck'],
    localPnpmArgs: [['run', 'typecheck']],
  },
  {
    workflow: 'ci.yml', job: 'lint', host: 'local', lane: 'default',
    workflowCommands: ['pnpm run check:ci:lint:contracts-ready'],
    localPnpmArgs: [['run', 'check:ci:lint:contracts-ready']],
  },
  {
    // Four shards partition one inventory: locally the aggregate runs once.
    workflow: 'ci.yml', job: 'unit', host: 'local', lane: 'default',
    workflowCommands: ['pnpm run build:native-system', 'pnpm exec vitest run --shard='],
    localPnpmArgs: [['run', 'build:native-system'], ['exec', 'vitest', 'run']],
  },
  {
    workflow: 'ci.yml', job: 'summary', host: 'remote', lane: 'quick',
    workflowCommands: [],
    localPnpmArgs: [],
  },
  {
    workflow: 'ci-master.yml', job: 'coverage', host: 'local', lane: 'all',
    workflowCommands: ['pnpm run check:ci:coverage'],
    localPnpmArgs: [['run', 'check:ci:coverage']],
  },
  {
    workflow: 'ci-master.yml', job: 'artifacts', host: 'local', lane: 'all',
    workflowCommands: ['pnpm run check:ci:artifacts'],
    localPnpmArgs: [['run', 'check:ci:artifacts']],
  },
  {
    workflow: 'ci-master.yml', job: 'snapshot', host: 'local', lane: 'all',
    workflowCommands: ['pnpm run check:ci:snapshot'],
    localPnpmArgs: [['run', 'check:ci:snapshot']],
  },
  {
    workflow: 'ci-master.yml', job: 'windows', host: 'remote', lane: 'all',
    workflowCommands: ['pnpm run check:ci:windows-blocking'],
    localPnpmArgs: [],
  },
  {
    workflow: 'ci-master.yml', job: 'mac-package', host: 'local', lane: 'all',
    workflowCommands: ['pnpm run package:desktop:mac:arm64:dir'],
    localPnpmArgs: [['run', 'package:desktop:mac:arm64:dir']],
  },
  {
    workflow: 'ci-master.yml', job: 'summary', host: 'remote', lane: 'all',
    workflowCommands: [],
    localPnpmArgs: [],
  },
  {
    workflow: 'desktop-packages.yml', job: 'windows', host: 'remote', lane: 'all',
    workflowCommands: ['pnpm --filter @deepseek-ai/dsh-desktop run package:win:x64:unsigned'],
    localPnpmArgs: [],
  },
  {
    workflow: 'desktop-packages.yml', job: 'macos', host: 'local', lane: 'all',
    workflowCommands: ['pnpm run package:desktop:mac:arm64:dir'],
    localPnpmArgs: [['run', 'package:desktop:mac:arm64:dir']],
  },
  {
    workflow: 'desktop-packages.yml', job: 'release', host: 'remote', lane: 'all',
    workflowCommands: [],
    localPnpmArgs: [],
  },
  {
    workflow: 'nightly.yml', job: 'full-suite', host: 'local', lane: 'all',
    workflowCommands: ['pnpm run check:ci:unit'],
    localPnpmArgs: [['run', 'check:ci:unit']],
  },
  {
    workflow: 'nightly.yml', job: 'audit', host: 'remote', lane: 'all',
    workflowCommands: ['pnpm audit --prod --audit-level critical'],
    localPnpmArgs: [],
  },
  {
    workflow: 'nightly.yml', job: 'nan-smoke', host: 'remote', lane: 'all',
    workflowCommands: [],
    localPnpmArgs: [],
  },
]

/** Workflow files the simulator knows, kept literal for the fixed spawn below. */
export const WORKFLOW_FILES: readonly string[] = [
  '.github/workflows/ci.yml',
  '.github/workflows/ci-master.yml',
  '.github/workflows/desktop-packages.yml',
  '.github/workflows/nightly.yml',
]

interface JobOutcome {
  label: string
  status: 'passed' | 'failed' | 'skipped'
  ms: number
}

function runPnpm(args: readonly [string, ...string[]], env: NodeJS.ProcessEnv): number {
  const result = spawnSync('pnpm', [...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  return result.status ?? 1
}

function actionlintVersion(): number {
  return spawnSync('actionlint', ['--version'], { encoding: 'utf8' }).status ?? 1
}

function actionlintWorkflows(): number {
  // `--` terminates actionlint's options: everything after it is a file path.
  // The file list is the literal WORKFLOW_FILES above, pinned by the drift spec.
  return spawnSync('actionlint', ['-no-color', '--',
    '.github/workflows/ci.yml',
    '.github/workflows/ci-master.yml',
    '.github/workflows/desktop-packages.yml',
    '.github/workflows/nightly.yml',
  ], { cwd: ROOT, stdio: 'inherit' }).status ?? 1
}

export function main(): number {
  const wantsAll = process.argv.includes('--all')
  const quick = process.argv.includes('--quick')
  const lanes: SimJob['lane'][] = quick ? ['quick'] : wantsAll ? ['quick', 'default', 'all'] : ['quick', 'default']

  const env: NodeJS.ProcessEnv = {
    DSH_TELEMETRY_DISABLED: '1',
    // Pin the compile cache off the repo tree, mirroring the workflow steps.
    NODE_COMPILE_CACHE: mkdtempSync(join(tmpdir(), 'ci-sim-node-cache-')),
    // The workflows grant this per-test budget to every vitest lane; without
    // it the local simulation runs tighter timeouts than the real CI does.
    DSH_COVERAGE_TEST_TIMEOUT_MS: '60000',
  }

  const outcomes: JobOutcome[] = []

  const lintLabel = '(simulator):actionlint'
  if (actionlintVersion() === 0) {
    const start = performance.now()
    const code = actionlintWorkflows()
    outcomes.push({ label: lintLabel, status: code === 0 ? 'passed' : 'failed', ms: performance.now() - start })
  } else {
    console.log(`${lintLabel}  SKIP  actionlint not installed (brew install actionlint)`)
    outcomes.push({ label: lintLabel, status: 'skipped', ms: 0 })
  }

  for (const entry of JOBS) {
    if (!lanes.includes(entry.lane)) continue
    const label = `${entry.workflow}:${entry.job}`
    if (entry.host === 'remote') {
      console.log(`${label}  SKIP  GitHub-only lane (runner OS, secrets or publishing)`)
      outcomes.push({ label, status: 'skipped', ms: 0 })
      continue
    }
    console.log(`\n=== ${label} ===`)
    const start = performance.now()
    let failed = false
    for (const args of entry.localPnpmArgs) {
      const code = runPnpm(args, env)
      if (code !== 0) {
        console.error(`\n${label}: pnpm ${args.join(' ')} failed with exit ${code}`)
        failed = true
        break
      }
    }
    outcomes.push({ label, status: failed ? 'failed' : 'passed', ms: performance.now() - start })
    if (failed) break
  }

  console.log('\n=== CI simulation summary ===')
  let red = false
  for (const { label, status, ms } of outcomes) {
    const mark = status === 'passed' ? 'PASS' : status === 'skipped' ? 'SKIP' : 'FAIL'
    if (status === 'failed') red = true
    console.log(`${mark.padEnd(5)} ${(ms / 1000).toFixed(1).padStart(8)}s  ${label}`)
  }
  console.log(red ? '\nSIMULATION RED: fix before pushing.' : '\nSIMULATION GREEN: Actions will run the same commands.')
  return red ? 1 : 0
}

// Only the CLI entry executes the lanes; importing this module (the drift
// spec) must stay side-effect free.
const entry = process.argv[1]
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  process.exitCode = main()
}
