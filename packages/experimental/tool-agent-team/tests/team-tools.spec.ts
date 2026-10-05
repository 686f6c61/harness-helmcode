/** The Team tool set over a recorded agentTeams double: delegation, defaults, filters, and mapping. */

import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TeamTaskId } from '@deepseek-ai/dsh-experimental-agent-team'
import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as teamTools from '../src/index.ts'

const contexts: Context[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

/** One Lead view as the roster would render it. */
function memberView(name: string, status: TeamMemberView['status'] = 'running'): TeamMemberView {
  return {
    id: SessionId(`${name}-1`), name, role: name === 'lead' ? 'lead' : 'teammate', status,
    description: `${name} description`, provider: 'spawn-probe', context: 'fresh',
    model: 'probe-model', diagnostics: [],
  }
}

function taskView(overrides: Partial<TeamTaskView> = {}): TeamTaskView {
  return {
    id: TeamTaskId('t-1'), revision: 3, subject: 'Ship it', description: 'Ship the thing',
    status: 'pending', blockedBy: [], writeScopes: ['src/**'], ready: true,
    writeScopeWarnings: [], ...overrides,
  }
}

/** Recording double of the AgentTeams service surface the tools call. */
function teamDouble(members: TeamMemberView[] = [], tasks: TeamTaskView[] = []) {
  const calls: Array<{ method: string; args: unknown }> = []
  const record = (method: string, args: unknown): void => { calls.push({ method, args }) }
  const currentTask = tasks[0] ?? taskView()
  return {
    calls,
    membership: { teamId: 'team-1', role: 'lead' as const },
    tryMembership: (): unknown => ({ teamId: 'team-1', role: 'lead' }),
    listMembers: (): TeamMemberView[] => members,
    spawnTeammate: async (_caller: Agent, request: unknown) => {
      record('spawnTeammate', request)
      return { member: memberView('crew-1', 'provisioning') }
    },
    sendMessage: async (_caller: Agent, request: unknown) => {
      record('sendMessage', request)
      return { messageId: 'm-1', status: 'accepted' as const }
    },
    waitForChange: async (_caller: Agent, timeoutMs: number, _signal: AbortSignal) => {
      record('waitForChange', { timeoutMs })
      return { timedOut: true }
    },
    interrupt: (_caller: Agent, target: string) => {
      record('interrupt', { target })
      return { previousStatus: 'inactive' as const }
    },
    createTask: async (_caller: Agent, request: unknown) => {
      record('createTask', request)
      return currentTask
    },
    getTask: (_caller: Agent, id: TeamTaskId) => {
      record('getTask', { id })
      return currentTask
    },
    listTasks: (): TeamTaskView[] => tasks,
    updateTask: async (_caller: Agent, request: unknown) => {
      record('updateTask', request)
      return currentTask
    },
  }
}

async function setup(options: { members?: TeamMemberView[]; tasks?: TeamTaskView[] } = {}): Promise<{
  ctx: Context
  lead: Agent
  team: ReturnType<typeof teamDouble>
}> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  const team = teamDouble(options.members, options.tasks)
  ctx.provide('agentTeams', team)
  const lead = { id: 'lead-1', name: 'lead', ctx } as unknown as Agent
  ctx.provide('agents', { list: (): Agent[] => [lead] })
  await ctx.plugin(teamTools, { freshProvider: 'spawn-probe', forkProvider: 'fork-probe' })
  return { ctx, lead, team }
}

describe('team tool installation', () => {
  it('registers the nine Team tools and the shared policy section in member scopes', async () => {
    const { ctx, lead } = await setup()
    for (const name of ['spawn_teammate', 'send_message', 'list_agents', 'wait_agent', 'interrupt_agent',
      'team_task_create', 'team_task_list', 'team_task_get', 'team_task_update']) {
      expect(ctx.tools.get(name), name).toBeDefined()
    }
    const { renderPrompt } = await import('@deepseek-ai/dsh-system-prompt')
    expect(renderPrompt(await ctx.systemPrompt.assemble())).toContain('Agent Teams is available')

    // Disposal of the member unmounts its policy section and tool set; an
    // unknown agent disposes nothing.
    const stranger = { id: 'stranger-1', name: 'stranger', ctx } as unknown as Agent
    ctx.emit('agent/disposed', { agent: stranger })
    expect(ctx.tools.get('spawn_teammate')).toBeDefined()
    ctx.emit('agent/disposed', { agent: lead })
    expect(ctx.tools.get('spawn_teammate')).toBeUndefined()
    await ctx.fiber.dispose()
  })

  it('declines non-members at mount time', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    const team = teamDouble()
    let membershipDefined = false
    Object.assign(team, { tryMembership: (): unknown => (membershipDefined ? team.membership : undefined) })
    ctx.provide('agentTeams', team)
    ctx.provide('agents', { list: (): Agent[] => [] })
    await ctx.plugin(teamTools)
    expect(ctx.tools.get('spawn_teammate')).toBeUndefined()
    membershipDefined = true
    const latecomer = { id: 'crew-9', name: 'crew', ctx } as unknown as Agent
    ctx.emit('agent/created', { agent: latecomer, source: 'startup' })
    await Promise.resolve()
    expect(ctx.tools.get('spawn_teammate')).toBeDefined()
    // A second creation event for an installed member changes nothing.
    ctx.emit('agent/created', { agent: latecomer, source: 'startup' })
  })
})

describe('member tools', () => {
  it('spawns with the fresh provider by default and the fork provider on demand', async () => {
    const { ctx, lead, team } = await setup()
    const fresh = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-spawn-fresh'),
      name: 'spawn_teammate',
      arguments: { name: 'crew', description: 'Helper', prompt: 'Do the work.' },
      agent: lead,
    })
    expect(fresh.isError).toBe(false)
    expect((fresh as { value: unknown }).value).toEqual({
      member: { target: 'crew-1', role: 'teammate', status: 'provisioning',
        description: 'crew-1 description', provider: 'spawn-probe', context: 'fresh', model: 'probe-model', diagnostics: [] },
    })
    const freshRequest = team.calls.find(call => call.method === 'spawnTeammate')!.args as {
      context: string
      provider: string
      prompt: { text: string }[]
    }
    expect(freshRequest.context).toBe('fresh')
    expect(freshRequest.provider).toBe('spawn-probe')
    expect(freshRequest.prompt[0]!.text).toContain('You are teammate "crew".')

    await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-spawn-fork'),
      name: 'spawn_teammate',
      arguments: { name: 'historian', description: 'Fork helper', prompt: 'Inherit.', context: 'fork' },
      agent: lead,
    })
    const forkRequest = team.calls.filter(call => call.method === 'spawnTeammate').at(-1)!.args as { provider: string }
    expect(forkRequest.provider).toBe('fork-probe')
  })

  it('sends durable messages and lists the roster without internal ids', async () => {
    const lead = memberView('lead')
    const crew = memberView('crew', 'inactive')
    const { ctx, team } = await setup({ members: [lead, crew] })
    const secondLead = { id: 'lead-1', name: 'lead', ctx } as unknown as Agent

    const sent = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-send'),
      name: 'send_message',
      arguments: { target: 'crew', message: 'begin the task' },
      agent: secondLead,
    })
    expect((sent as { value: unknown }).value).toEqual({ messageId: 'm-1', status: 'accepted' })
    const send = team.calls.find(call => call.method === 'sendMessage')!.args as {
      target: string
      content: { text: string }[]
    }
    expect(send.target).toBe('crew')
    expect(send.content[0]!.text).toBe('begin the task')

    const listed = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-list'),
      name: 'list_agents',
      arguments: {},
      agent: secondLead,
    })
    expect((listed as { value: unknown }).value).toEqual([
      { target: 'lead', role: 'lead', status: 'running', description: 'lead description',
        provider: 'spawn-probe', context: 'fresh', model: 'probe-model', diagnostics: [] },
      { target: 'crew', role: 'teammate', status: 'inactive', description: 'crew description',
        provider: 'spawn-probe', context: 'fresh', model: 'probe-model', diagnostics: [] },
    ])
  })

  it('wait_agent reports no progress without another active peer and otherwise waits', async () => {
    const lead = memberView('lead')
    const solo = await setup({ members: [lead] })
    const soloWait = await solo.ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-wait-solo'),
      name: 'wait_agent',
      arguments: {},
      agent: solo.lead,
    })
    expect((soloWait as { value: unknown }).value).toEqual({
      timedOut: false,
      noProgress: {
        reason: 'no-active-peer',
        message: expect.stringContaining('No other Team member is running or provisioning'),
      },
    })
    expect(solo.team.calls).toHaveLength(0)

    const crew = memberView('crew')
    const paired = await setup({ members: [lead, crew] })
    const waiting = await paired.ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-wait-paired'),
      name: 'wait_agent',
      arguments: {},
      agent: paired.lead,
    })
    expect((waiting as { value: unknown }).value).toEqual({ timedOut: true })
    expect(paired.team.calls[0]).toEqual({ method: 'waitForChange', args: { timeoutMs: 30_000 } })

    await paired.ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-wait-custom'),
      name: 'wait_agent',
      arguments: { timeout_ms: 45_000 },
      agent: paired.lead,
    })
    expect(paired.team.calls.at(-1)).toEqual({ method: 'waitForChange', args: { timeoutMs: 45_000 } })

    // Out-of-range values reach TeamService, which owns the authoritative validation.
    await paired.ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-wait-invalid'),
      name: 'wait_agent',
      arguments: { timeout_ms: 500 },
      agent: paired.lead,
    })
    expect(paired.team.calls.at(-1)).toEqual({ method: 'waitForChange', args: { timeoutMs: 500 } })
  })

  it('interrupts through the service and reports the previous status', async () => {
    const { ctx, lead, team } = await setup({ members: [memberView('lead'), memberView('crew')] })
    const done = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-interrupt'),
      name: 'interrupt_agent',
      arguments: { target: 'crew' },
      agent: lead,
    })
    expect((done as { value: unknown }).value).toEqual({ previousStatus: 'inactive' })
    expect(team.calls[0]).toEqual({ method: 'interrupt', args: { target: 'crew' } })
  })
})

describe('shared task tools', () => {
  it('creates tasks with optional dependencies and write scopes', async () => {
    const { ctx, lead, team } = await setup()
    await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-task-create-plain'),
      name: 'team_task_create',
      arguments: { subject: 'S', description: 'D' },
      agent: lead,
    })
    expect(team.calls[0]!.args).toEqual({ subject: 'S', description: 'D' })

    await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-task-create-full'),
      name: 'team_task_create',
      arguments: { subject: 'S2', description: 'D2', blocked_by: ['t-0'], write_scopes: ['web/**'] },
      agent: lead,
    })
    expect(team.calls.at(-1)!.args).toEqual({
      subject: 'S2', description: 'D2', blockedBy: [TeamTaskId('t-0')], writeScopes: ['web/**'],
    })
  })

  it('lists tasks with filters and pagination', async () => {
    const tasks = [
      taskView({ id: TeamTaskId('t-1'), status: 'pending', ready: true }),
      taskView({ id: TeamTaskId('t-2'), status: 'in_progress', ready: false, ownerName: 'crew' }),
      taskView({ id: TeamTaskId('t-3'), status: 'pending', ready: true, ownerName: 'crew' }),
    ]
    const { ctx, lead } = await setup({ tasks })
    const list = async (callId: string, args: Record<string, unknown>): Promise<unknown> => {
      const result = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId(callId),
        name: 'team_task_list',
        arguments: args,
        agent: lead,
      })
      if (result.isError) {
        throw new Error(result.content.filter(block => block.type === 'text').map(block => block.text).join(''))
      }
      return (result as { value: unknown }).value
    }

    await expect(list('team-task-list-all', {})).resolves.toEqual({ tasks, nextCursor: undefined })
    await expect(list('team-task-list-status', { status: 'pending' })).resolves.toMatchObject({
      tasks: [tasks[0], tasks[2]],
    })
    await expect(list('team-task-list-owner', { owner: 'crew' })).resolves.toMatchObject({
      tasks: [tasks[1], tasks[2]],
    })
    await expect(list('team-task-list-unowned', { owner: 'unowned' })).resolves.toMatchObject({
      tasks: [tasks[0]],
    })
    await expect(list('team-task-list-ready', { ready: false })).resolves.toMatchObject({
      tasks: [tasks[1]],
    })
    await expect(list('team-task-list-page', { cursor: 1, limit: 1 })).resolves.toEqual({
      tasks: [tasks[1]], nextCursor: 2,
    })
    await expect(list('team-task-list-tail', { cursor: 2, limit: 5 })).resolves.toEqual({
      tasks: [tasks[2]],
    })
    await expect(list('team-task-list-bad-cursor', { cursor: -1 })).rejects.toThrow(/cursor/)
    await expect(list('team-task-list-bad-limit', { limit: 0 })).rejects.toThrow(/limit/)
    await expect(list('team-task-list-big-limit', { limit: 101 })).rejects.toThrow(/limit/)
  })

  it('reads one task and compares-and-sets with mapped optional fields', async () => {
    const { ctx, lead, team } = await setup({ tasks: [taskView()] })
    const got = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-task-get'),
      name: 'team_task_get',
      arguments: { task_id: 't-9' },
      agent: lead,
    })
    expect((got as { value: unknown }).value).toMatchObject({ id: 't-1' })
    expect(team.calls.at(-1)!.args).toEqual({ id: TeamTaskId('t-9') })

    await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-task-update-full'),
      name: 'team_task_update',
      arguments: {
        task_id: 't-1', expected_revision: 3, action: 'edit',
        subject: 'New', description: 'New body', blocked_by: ['t-2'], write_scopes: ['docs/**'], owner: 'crew',
      },
      agent: lead,
    })
    expect(team.calls.at(-1)!.args).toEqual({
      taskId: TeamTaskId('t-1'), expectedRevision: 3, action: 'edit',
      subject: 'New', description: 'New body', blockedBy: [TeamTaskId('t-2')],
      writeScopes: ['docs/**'], owner: 'crew',
    })

    await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-task-update-plain'),
      name: 'team_task_update',
      arguments: { task_id: 't-1', expected_revision: 4, action: 'claim' },
      agent: lead,
    })
    expect(team.calls.at(-1)!.args).toEqual({ taskId: TeamTaskId('t-1'), expectedRevision: 4, action: 'claim' })
  })
})

describe('tool output rendering', () => {
  it('renders results as compact JSON text', async () => {
    const { ctx, lead } = await setup({ members: [memberView('lead')] })
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('team-render'),
      name: 'list_agents',
      arguments: {},
      agent: lead,
    })
    const text = result.content.filter(block => block.type === 'text').map(block => block.text).join('')
    expect(JSON.parse(text)).toEqual([expect.objectContaining({ target: 'lead' })])
  })
})
