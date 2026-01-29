import { createClient } from 'redis'

/** In-memory stub when Redis is unavailable (no REDIS_URL or connect failed). */
function createStubClient() {
  const store = new Map()
  return {
    async get(key) {
      const entry = store.get(key)
      if (!entry) return null
      if (entry.expiry && Date.now() > entry.expiry) {
        store.delete(key)
        return null
      }
      return entry.value
    },
    async set(key, value, options = {}) {
      const expiry = options.EX ? Date.now() + options.EX * 1000 : null
      store.set(key, { value, expiry })
      return 'OK'
    },
    async del(key) {
      store.delete(key)
      return 1
    },
    async incr(key) {
      const entry = store.get(key)
      const v = (entry ? parseInt(entry.value, 10) : 0) + 1
      store.set(key, { value: String(v), expiry: entry?.expiry })
      return v
    },
    async decr(key) {
      const entry = store.get(key)
      const v = (entry ? parseInt(entry.value, 10) : 0) - 1
      store.set(key, { value: String(v), expiry: entry?.expiry })
      return v
    },
    async expire(key, seconds) {
      const entry = store.get(key)
      if (entry) entry.expiry = Date.now() + seconds * 1000
      return 1
    },
    get status() {
      return 'ready'
    },
    async quit() {
      store.clear()
    }
  }
}

/** Initialize Redis and set the exported redisClient. Call once at server startup. */
export async function initRedis() {
  const url = process.env.REDIS_URL
  if (!url) {
    console.warn('REDIS_URL not set; using in-memory stub. Set REDIS_URL for production.')
    redisClient = createStubClient()
    return redisClient
  }

  const client = createClient({ url })
  client.on('error', (err) => console.error('Redis error:', err))

  try {
    await client.connect()
    redisClient = client
    return redisClient
  } catch (err) {
    console.error('Redis connect failed, using stub:', err.message)
    redisClient = createStubClient()
    return redisClient
  }
}

/** Set by initRedis(). Auth and routes import this. */
export let redisClient = null
