import { loadConfig } from './config'
import { connect } from './db/client'
import { createApp } from './app'
import { mountStatic } from './static'

const config = loadConfig()
const handle = await connect(config.mongoUri)
const app = createApp(config, handle)

// In the Docker image the web bundle is copied next to the BFF and served from
// the same process. WEB_DIST points at it; absent in dev, where Vite serves the UI.
const webDist = process.env.WEB_DIST
if (webDist) {
  mountStatic(app, webDist)
}

export default {
  port: config.port,
  fetch: app.fetch,
}
