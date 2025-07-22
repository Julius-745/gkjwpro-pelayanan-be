import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono with Node.js!')
})

app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from Hono API' })
})

serve({
  fetch: app.fetch,
  port: 3000,
})
