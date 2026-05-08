import { serve } from '@hono/node-server'
import app from './dist/server/server.js'

serve({
  fetch: async (req) => {
    try {
      console.log('Incoming request:', req.url);
      const res = await app.fetch(req, process.env, {});
      console.log('Response status:', res.status);
      return res;
    } catch (e) {
      console.error('CRITICAL ERROR:', e);
      return new Response(e.stack || e.message, { status: 500 });
    }
  },
  port: 3000
}, (info) => {
  console.log(`Server listening on port ${info.port}`)
})
