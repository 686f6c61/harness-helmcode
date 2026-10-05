import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
try {
  console.log('resolved:', require.resolve('@deepseek-ai/dsh/package.json'))
} catch (e) {
  console.log('ERR', e.code)
}
console.log('meta:', import.meta.url)
