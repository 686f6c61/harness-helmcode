/**
 * Drift gate for the Helmcode CI: the four GitHub workflows and the local
 * simulator manifest (`scripts/ci-simulate.ts`) must describe the same jobs
 * running the same commands, and every `pnpm run` alias a workflow names must
 * exist in the owning package.json. This is what makes a green simulator run
 * a real predictor of a green Actions run.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { JOBS, WORKFLOW_FILES } from './ci-simulate.ts'

const root = resolve(import.meta.dirname, '..')

function loadWorkflow(path: string): Record<string, unknown> {
  const workflow: unknown = yaml.load(readFileSync(resolve(root, path), 'utf8'))
  if (typeof workflow !== 'object' || workflow === null || Array.isArray(workflow)) {
    throw new TypeError(`${path} must define a workflow`)
  }
  return workflow as Record<string, unknown>
}

function jobOf(workflow: Record<string, unknown>, job: string): Record<string, unknown> {
  const jobs = workflow.jobs
  if (typeof jobs !== 'object' || jobs === null || Array.isArray(jobs)) {
    throw new TypeError('workflow must define jobs')
  }
  const record = (jobs as Record<string, unknown>)[job]
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    throw new TypeError(`workflow must define the ${job} job`)
  }
  return record as Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Every literal `run:` string in a job, in order. */
function runBlocks(job: Record<string, unknown>): string[] {
  const steps = job.steps
  if (!Array.isArray(steps)) return []
  return steps.flatMap(step => isRecord(step) && typeof step.run === 'string' ? [step.run] : [])
}

function eventKeys(workflow: Record<string, unknown>): string[] {
  const on = workflow.on
  if (typeof on !== 'object' || on === null || Array.isArray(on)) {
    throw new TypeError('workflow must define on')
  }
  return Object.keys(on).sort()
}

describe('CI simulator manifest', () => {
  it('lists exactly the workflows it lints', () => {
    expect(WORKFLOW_FILES).toEqual([...new Set(JOBS.map(entry => join('.github', 'workflows', entry.workflow)))])
  })

  it('covers every workflow job exactly once, in both directions', () => {
    for (const file of WORKFLOW_FILES) {
      const workflow = loadWorkflow(file)
      const jobs = workflow.jobs
      if (typeof jobs !== 'object' || jobs === null || Array.isArray(jobs)) {
        throw new TypeError(`${file} must define jobs`)
      }
      const workflowJobIds = Object.keys(jobs).sort()
      const name = file.replaceAll('.github/workflows/', '')
      const manifestJobIds = JOBS.filter(entry => entry.workflow === name).map(entry => entry.job).sort()
      expect(manifestJobIds, `${file} jobs must all appear in the simulator manifest`).toEqual(workflowJobIds)
    }
    const manifestKeys = JOBS.map(entry => `${entry.workflow}:${entry.job}`)
    expect(new Set(manifestKeys).size).toBe(manifestKeys.length)
  })

  it('runs, per job, exactly the commands the workflow declares', () => {
    for (const entry of JOBS) {
      const file = join('.github', 'workflows', entry.workflow)
      const runs = runBlocks(jobOf(loadWorkflow(file), entry.job)).join('\n')
      for (const command of entry.workflowCommands) {
        expect(runs, `${entry.workflow}:${entry.job} must run "${command}"`).toContain(command)
      }
    }
  })

  it('names only package scripts that exist', () => {
    const rootScripts = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>
    }
    const desktopScripts = JSON.parse(readFileSync(resolve(root, 'apps/desktop/package.json'), 'utf8')) as {
      scripts?: Record<string, string>
    }
    for (const entry of JOBS) {
      for (const line of entry.workflowCommands) {
        const rootRun = line.match(/^pnpm run ([a-z:.-]+)$/u)
        if (rootRun !== null) {
          expect(rootScripts.scripts, `${line} must exist in the root package.json`)
            .toHaveProperty(rootRun[1]!)
          continue
        }
        const filtered = line.match(/^pnpm --filter [\w@\/-]+ run ([a-z:.-]+)$/u)
        if (filtered !== null) {
          expect(desktopScripts.scripts, `${line} must exist in apps/desktop/package.json`)
            .toHaveProperty(filtered[1]!)
        }
      }
    }
  })
})

describe('CI workflow', () => {
  it('runs pull requests with cancellation, telemetry off, and a shared test budget', () => {
    const workflow = loadWorkflow('.github/workflows/ci.yml')
    expect(eventKeys(workflow)).toEqual(['pull_request'])
    expect(workflow.concurrency).toMatchObject({ 'cancel-in-progress': true })
    expect(workflow.permissions).toEqual({ 'contents': 'read' })
    expect(workflow.env).toMatchObject({
      DSH_TELEMETRY_DISABLED: '1',
      DSH_COVERAGE_TEST_TIMEOUT_MS: '60000',
    })
    const unit = jobOf(workflow, 'unit')
    expect(unit.strategy).toMatchObject({ 'fail-fast': false, matrix: { shard: [1, 2, 3, 4] } })
    expect(runBlocks(unit).join('\n')).toContain('vitest run --shard=')
    const summary = jobOf(workflow, 'summary')
    expect(summary.needs).toEqual(['static', 'typecheck', 'lint', 'unit'])
  })

  it('bounds every CI job with a timeout on hosted runners', () => {
    for (const file of WORKFLOW_FILES) {
      const workflow = loadWorkflow(file)
      const jobs = workflow.jobs as Record<string, Record<string, unknown>>
      for (const [id, job] of Object.entries(jobs)) {
        expect(typeof job['timeout-minutes'], `${file}:${id} must set timeout-minutes`).toBe('number')
        expect(job['runs-on'], `${file}:${id} must use a hosted runner`).toBeTypeOf('string')
      }
    }
  })

  it('adds the expensive gates and both packaging platforms on main', () => {
    const workflow = loadWorkflow('.github/workflows/ci-master.yml')
    expect(eventKeys(workflow)).toEqual(['push', 'workflow_dispatch'])
    const on = workflow.on as Record<string, unknown>
    expect(on.push).toMatchObject({ branches: ['main'] })
    const summary = jobOf(workflow, 'summary')
    expect(summary.needs).toEqual(['coverage', 'artifacts', 'snapshot', 'windows', 'mac-package'])
    expect(jobOf(workflow, 'windows')['runs-on']).toBe('windows-latest')
    expect(jobOf(workflow, 'mac-package')['runs-on']).toBe('macos-latest')
  })

  it('drafts a release only from desktop tags, with checksums and least privilege', () => {
    const workflow = loadWorkflow('.github/workflows/desktop-packages.yml')
    expect(eventKeys(workflow)).toEqual(['push', 'workflow_dispatch'])
    const on = workflow.on as Record<string, unknown>
    expect(on.push).toMatchObject({ tags: ['desktop-v*'] })
    expect(workflow.permissions).toEqual({ 'contents': 'read' })

    const release = jobOf(workflow, 'release')
    expect(release.if).toBe("startsWith(github.ref, 'refs/tags/desktop-v')")
    expect(release.needs).toEqual(['windows', 'macos'])
    expect(release.permissions).toEqual({ 'contents': 'write' })
    const runs = runBlocks(release).join('\n')
    expect(runs).toContain('sha256sum')
    expect(runs).toContain('gh release create')
    expect(runs).toContain('--draft')
  })

  it('smokes the NaN route nightly only when the key secret exists', () => {
    const workflow = loadWorkflow('.github/workflows/nightly.yml')
    expect(eventKeys(workflow)).toEqual(['schedule', 'workflow_dispatch'])
    const smoke = jobOf(workflow, 'nan-smoke')
    const steps = smoke.steps as unknown[]
    const smokeStep = steps.find(step => isRecord(step) && isRecord(step.env)
      && step.env.NAN_BUILDERS_API_KEY === '${{ secrets.NAN_BUILDERS_API_KEY }}')
    expect(smokeStep, 'the live smoke must map the key secret into its env').toBeDefined()
    const runs = runBlocks(smoke).join('\n')
    expect(runs).toContain('[ -z "$NAN_BUILDERS_API_KEY" ]')
    expect(runs).toContain('https://api.nan.builders/v1/chat/completions')
    // Advisory lanes stay advisory: an audit hit must not redden the night.
    expect(jobOf(workflow, 'audit')['continue-on-error']).toBe(true)
  })
})

describe('Git hooks', () => {
  it('leaves frozen Agent Note sidecars to the archive verifier', () => {
    const lefthook = loadWorkflow('lefthook.yml')

    for (const hookName of ['pre-commit', 'pre-merge-commit']) {
      const hook = lefthook[hookName]
      if (!isRecord(hook) || !Array.isArray(hook.jobs)) {
        throw new TypeError(`lefthook must define ${hookName} jobs`)
      }
      const pairing: unknown = hook.jobs.find(
        (job: unknown) => isRecord(job) && job.name === 'translation pairing (staged records)',
      )

      expect(pairing).toMatchObject({ exclude: ['.agents/notes/archived/**'] })
    }
  })
})
