import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { installProxyFromEnvironment } from '@deepseek-ai/dsh-http-proxy'
import { DuckDuckGoSearchProvider } from '../src/provider.ts'

let seen: string[] = []
let proxy: Server
let proxyUrl: string

beforeAll(async () => {
  proxy = createServer((request, response) => {
    seen.push(`REQ ${request.url ?? ''}`)
    response.writeHead(502); response.end('fake-proxy')
  })
  proxy.on('connect', (request, socket) => {
    seen.push(`CONNECT ${request.url ?? ''}`)
    socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n'); socket.end()
  })
  const address = await new Promise<AddressInfo>((resolve) => { proxy.listen(0, '127.0.0.1', () => { resolve(proxy.address() as AddressInfo) }) })
  proxyUrl = `http://127.0.0.1:${String(address.port)}`
})
afterAll(async () => { await new Promise<void>((resolve) => { proxy.close(() => { resolve() }) }) })

/** The launch environment of a user who exported one proxy for both schemes. */
function proxyEnv(): { get(name: string): { value: string } | undefined } {
  return { get: name => (name === 'HTTP_PROXY' || name === 'HTTPS_PROXY' ? { value: proxyUrl } : undefined) }
}
async function observe(run: () => Promise<unknown>): Promise<string[]> {
  seen = []
  const dispose = await installProxyFromEnvironment(proxyEnv(), () => undefined)
  try { await run().catch(() => undefined) } finally { await dispose() }
  return seen
}

describe('duckduckgo egress', () => {
  it('goes through the proxy', async () => {
    const provider = new DuckDuckGoSearchProvider({ baseURL: 'http://ddg-probe.invalid' })
    const seenRequests = await observe(() => provider.search({ query: 'probe' }))
    expect(seenRequests[0]).toBe('REQ http://ddg-probe.invalid/lite/?q=probe')
  })
})
