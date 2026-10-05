/** Operator-only signed packaging; default checks do not launch children, sign, install, or publish. */
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { InstalledUpdateSigningHoldError, packageInstalledUpdate } from './installed-update-packaging.ts'

async function main(): Promise<void> {
  const [manifest, version, mode, ...extra] = process.argv.slice(2)
  if (!manifest || !version || extra.length !== 0 || (mode !== undefined && mode !== '--check' && mode !== '--execute')) {
    throw new Error('invalid invocation')
  }
  const result = await packageInstalledUpdate(manifest, version, { execute: mode === '--execute',
    confirm: async (id, selectedVersion) => {
      if (!stdin.isTTY || !stdout.isTTY) return false
      const terminal = createInterface({ input: stdin, output: stdout })
      try {
        console.log('Continúa solo cuando un administrador haya revisado y restablecido la protección de firma. Confirma que el token esté cerrado, que queden 5/5 usos, que el PIN sea correcto y que no haya otras tareas de firma.')
        console.log('Este empaquetado realizará varias firmas; no reintentes operaciones fallidas, el número de autenticaciones internas del controlador no está garantizado. Si aparece un diálogo de contraseña, cancélalo; no la escribas después.')
        console.log('El PIN solo se lee desde .env.windows; la interfaz de firma requiere que aparezca brevemente en los argumentos de SignTool. No se instalará ni se subirá nada.')
        const expected = `PACKAGE ${selectedVersion} ${id}`
        return (await terminal.question(`Autoriza únicamente esta versión; escribe ${expected}: `)) === expected
      } finally { terminal.close() }
    } })
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof InstalledUpdateSigningHoldError ? error.message
    : 'installed update packaging stopped. Check prepared files and the retained record; do not retry or remove protection automatically.')
  process.exitCode = 1
})
