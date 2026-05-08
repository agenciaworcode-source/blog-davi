import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import app from './dist/server/server.js'

const honoApp = new Hono()

// Serve static assets from the client build directory
honoApp.use('/*', serveStatic({ root: './dist/client' }))

// Pass all other requests to the TanStack Start SSR handler
honoApp.all('*', async (c) => {
  try {
    return await app.fetch(c.req.raw, process.env, {})
  } catch (e) {
    console.error('CRITICAL ERROR:', e)
    return new Response(e.stack || e.message, { status: 500 })
  }
})

serve({
  fetch: honoApp.fetch,
  port: 3000
}, (info) => {
  console.log(`Server listening on port ${info.port}`)
})
