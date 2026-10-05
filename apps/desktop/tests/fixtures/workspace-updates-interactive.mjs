/** Operator-controlled qualification using the real workspace; synthetic payloads never execute. */
import { app, BrowserWindow, Menu, dialog } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Keep the private workspace open until the operator closes the control window or exits the application.
 * @param {object} options Real workspace and fixture-owned delivery, task, and installation controls.
 * @returns {Promise<void>} Resolves after operator exit and removal of control listeners.
 */
export async function runInteractiveUpdates({ mainWindow, server, fixture, checkMenu, control, root }) {
  const panel = new BrowserWindow({ title: 'Control de aceptación de actualización local', width: 640, height: 460,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } })
  const finished = Promise.withResolvers()
  const finish = () => finished.resolve()
  panel.once('closed', finish)
  app.once('before-quit', finish)
  let closing = false
  const originalInstall = fixture.updater.quitAndInstall
  fixture.updater.quitAndInstall = (...args) => {
    fixture.installations.push(args)
    void dialog.showMessageBox(panel, { type: 'info', title: 'Aceptación local finalizada',
      message: 'Descarga, verificación, confirmación de instalación y cierre de tareas completados.',
      detail: 'La llamada al instalador se interceptó; no se instaló ni se reinició a la nueva versión. Confirma para finalizar esta ronda; vuelve a ejecutar el comando para empezar otra.',
      buttons: ['Finalizar ejercicio'] }).then(finish).catch(finish)
  }
  const action = (label, operation) => ({ label, click: () => {
    if (closing) return
    void Promise.resolve().then(operation).catch(error => {
      console.error(error)
      if (!panel.isDestroyed()) dialog.showErrorBox('Error en la operación de aceptación local', String(error))
    })
  } })
  const select = mode => server.select(mode, '0.1.6-nightly.1')
  select('hold-download')
  const check = () => checkMenu.click()
  panel.setMenu(Menu.buildFromTemplate([
    { label: 'Escenarios de actualización', submenu: [
      action('Actualización normal (mantener progreso tras pulsar descargar)', () => { server.policy('clear'); select('hold-download'); check() }),
      action('Actualización obligatoria (mantener progreso tras pulsar descargar)', () => { server.policy('force'); select('hold-download'); check() }),
      action('Liberar descarga actual → verificación y confirmación de instalación', () => server.release()),
      { type: 'separator' },
      action('Próxima descarga: error de verificación', () => select('corrupt')),
      action('Próxima descarga: error 404', () => select('download-404')),
      action('Próxima descarga: volver a la normalidad', () => select('healthy')),
      action('Error de comprobación', () => { select('feed-404'); check() }),
      action('Sin actualizaciones disponibles (usar antes de descargar)', () => { server.select('healthy', '0.1.5-rc.1'); check() }),
      action('Levantar bloqueo de actualización obligatoria', () => { server.policy('clear'); check() }),
    ] },
    { label: 'Estado de tareas', submenu: [
      action('Añadir tarea en cola', () => control('queue')),
      action('Vaciar tareas en cola', () => control('clear')),
      action('Simular fallo al detener tareas (válido esta ronda)', () => control('hold-shutdown')),
    ] },
    { label: 'Ventana', submenu: [
      action('Volver a la aplicación', () => { mainWindow.restore(); mainWindow.show(); mainWindow.focus() }),
      action('Finalizar ejercicio', finish),
    ] },
  ]))
  try {
    await panel.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html lang="es">
      <meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
      <style>body{font:16px/1.8 system-ui;padding:24px;color:#222}h2{margin-top:0}strong{color:#165dff}</style>
      <h2>Aceptación manual de actualización · no se ejecuta el instalador</h2>
      <p>Usa el menú <strong>Escenarios de actualización</strong> de esta ventana para elegir actualización normal u obligatoria, y luego pulsa descargar en la aplicación.</p>
      <p>La descarga mantendrá el progreso para que lo revises. Vuelve aquí y elige <strong>Liberar descarga actual</strong> para pasar a la verificación y la confirmación de instalación.</p>
      <p>Usa el menú <strong>Estado de tareas</strong> para añadir tareas en cola y ver el aviso de tareas antes de instalar. Los modos de fallo deben elegirse antes de descargar.</p>
      <p>Los datos y el servidor de actualizaciones son pruebas locales aisladas. La URL de descarga es de ejemplo. Cierra esta ventana para finalizar el ejercicio; volver a ejecutar el comando restablece el estado.</p>
      </html>`)}`)
    console.log(`Interactive updater ready: ${root}`)
    await finished.promise
    closing = true
    await writeFile(join(root, 'interactive-result.json'), JSON.stringify({ installerExecuted: false,
      interceptedInstallations: fixture.installations.length, phases: fixture.states.map(state => state.phase) }, null, 2) + '\n')
  } finally {
    closing = true
    fixture.updater.quitAndInstall = originalInstall
    app.off('before-quit', finish)
    panel.off('closed', finish)
    if (!panel.isDestroyed()) panel.destroy()
  }
}
