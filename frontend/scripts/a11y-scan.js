import fs from 'fs'
import path from 'path'
import { JSDOM } from 'jsdom'
import axe from 'axe-core'

async function run() {
  const distDir = path.resolve(process.cwd(), 'dist')
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8')

  const dom = new JSDOM(indexHtml, { runScripts: 'dangerously', resources: 'usable' })
  // wait for scripts to load
  await new Promise(resolve => {
    dom.window.addEventListener('load', () => setTimeout(resolve, 2000))
    setTimeout(resolve, 5000)
  })

  // Inject axe into the jsdom window and run it there
  dom.window.eval(axe.source)

  const results = await dom.window.axe.run(dom.window.document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })

  console.log(JSON.stringify(results, null, 2))
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
