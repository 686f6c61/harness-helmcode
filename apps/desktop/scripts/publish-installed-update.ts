/** Operator entry for separate test binary uploads and fixed-feed publication; default mode is local-only. */
import { parseArgs } from 'node:util'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { verifiedInstalledUpdateDistribution, executeInstalledUpdatePublication } from './installed-update-publication.ts'
import { createInstalledUpdateCos } from './installed-update-cos.ts'

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    execute: { type: 'boolean', default: false }, journals: { type: 'string' },
  } })
  const [action, manifest, version, receipt, ...extra] = positionals
  if ((action !== 'upload-binaries' && action !== 'publish-feed') || !manifest || !version || !receipt || extra.length) {
    throw new Error('invalid invocation')
  }
  const prepared = await verifiedInstalledUpdateDistribution(manifest, version, receipt)
  console.log(JSON.stringify({ action, version, runId: prepared.run.id, destination: prepared.distribution,
    mode: values.execute ? 'awaiting-operator' : 'local-check', networkStarted: false }, null, 2))
  if (!values.execute) return
  if (!stdin.isTTY || !stdout.isTTY) throw new Error('operator terminal required')
  const expected = `${action === 'upload-binaries' ? 'UPLOAD' : 'PUBLISH'} ${version} ${prepared.run.id}`
  const terminal = createInterface({ input: stdin, output: stdout })
  let confirmed = false
  try {
    console.log(action === 'upload-binaries'
      ? 'Autoriza únicamente la subida de binarios de prueba de este lote. Confirma que no haya otros publicadores; el paquete de instalación se leerá de vuelta por completo, lo que puede generar un tráfico de descarga considerable.'
      : 'Autoriza únicamente la publicación del manifiesto de prueba de este lote. Confirma que no haya otros publicadores; se reutiliza el recibo de subida exitosa, solo se lee de vuelta el manifiesto y no se vuelve a descargar el paquete de instalación.')
    if (action === 'publish-feed' && version === prepared.run.versions[1]) {
      console.log('Confirma que la versión 1 se inició mediante el punto de entrada instalado y sigue en ejecución; debes proporcionar el directorio de journals de ese lote.')
    }
    confirmed = (await terminal.question(`Escribe ${expected}: `)) === expected
  } finally { terminal.close() }
  if (!confirmed) throw new Error('operator declined')
  console.log(await executeInstalledUpdatePublication(manifest, version, receipt, action, createInstalledUpdateCos(), values.journals))
}

main().catch(() => {
  console.error('installed update: upload/publication stopped. Review local prerequisites and any retained operation record; no automatic retry.')
  process.exitCode = 1
})
