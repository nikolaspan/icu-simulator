// Uses the system Firefox/geckodriver only. Run geckodriver --port 4444 first.
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root = 'http://127.0.0.1:4444'
const sessionFile = '/tmp/icu-browser-session.json'
const downloadDirectory = fileURLToPath(new URL('../dist/validation-downloads/', import.meta.url))
try {
  const previous = JSON.parse(await fs.readFile(sessionFile, 'utf8')).value
  if (previous?.sessionId) await fetch(`${root}/session/${previous.sessionId}`, { method: 'DELETE' })
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
if (process.argv.includes('--close')) {
  console.log('Firefox test session closed.')
  process.exit(0)
}
await fs.mkdir(downloadDirectory, { recursive: true })
const response = await fetch(`${root}/session`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ capabilities: { alwaysMatch: {
    browserName: 'firefox', webSocketUrl: true,
    'moz:firefoxOptions': { args: ['-headless'], prefs: {
      'browser.download.folderList': 2,
      'browser.download.dir': downloadDirectory,
      'browser.download.useDownloadDir': true,
      'browser.helperApps.neverAsk.saveToDisk': 'application/json,text/csv',
      'webgl.force-enabled': true,
      'ui.prefersReducedMotion': process.argv.includes('--reduced-motion') ? 1 : 0,
    } },
  } } }),
})
const result = await response.json()
if (!response.ok) throw new Error(JSON.stringify(result))
await fs.writeFile(sessionFile, JSON.stringify(result))
console.log('Firefox test session ready. Downloads:', downloadDirectory)
