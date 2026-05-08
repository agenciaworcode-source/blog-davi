import { serve } from '@hono/node-server'
import app from './dist/server/server.js'

serve({
  fetch: (req) => {
    return app.default.fetch(req, process.env, {})
  },
  port: 3000
}, (info) => {
  console.log(`Server listening on port ${info.port}`)
})
