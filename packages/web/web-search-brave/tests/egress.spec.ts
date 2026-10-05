import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { installProxyFromEnvironment } from '@deepseek-ai/dsh-http-proxy'
import { BraveSearchProvider } from '../src/provider.ts'

// Test tokens are assembled, never written as literals, so no plausible
// credential string ever lands in source control.
const keyOf = (label: string): string => ['test-token', label].join('-')

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

describe('brave egress', () => {
  it('goes through the proxy', async () => {
    const provider = new BraveSearchProvider(() => ({ apiKey: keyOf('probe'), baseURL: 'http://brave-probe.invalid' }))
    const seenRequests = await observe(() => provider.search({ query: 'probe' }))
    expect(seenRequests[0])
      .toBe('REQ http://brave-probe.invalid/res/v1/web/search?q=probe&safesearch=moderate')
  })
})
