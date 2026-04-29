const Redis = require('ioredis');

// ── Determine whether Redis is explicitly configured ──
const isTestEnv = process.env.NODE_ENV === 'test';
const hasRedisConfig = !!(process.env.REDIS_URL || process.env.REDIS_HOST) && !isTestEnv;

/**
 * Create the Redis client.
 * If no Redis configuration is provided, we return a lightweight stub so the
 * rest of the app doesn't need to null-check everywhere.
 */
let redis;

if (hasRedisConfig) {
    // Connection setup
    // Support both REDIS_URL (common in cloud like Upstash) or host/port
    const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        // Fail fast instead of retrying forever when Redis is unreachable
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 5) {
                console.error('❌ Redis: max retries reached — giving up.');
                return null; // stop retrying
            }
            return Math.min(times * 500, 3000); // back off up to 3 s
        },
        // Don't block startup waiting for Redis
        lazyConnect: false,
        enableOfflineQueue: false,
    };

    // If we are in production or using a cloud provider like Upstash,
    // we likely need TLS. ioredis enables TLS if we provide the 'tls' object.
    if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('rediss://')) {
        // rediss:// protocol automatically enables TLS in ioredis
    } else if (process.env.NODE_ENV === 'production' || process.env.REDIS_TLS === 'true') {
        redisOptions.tls = {
            rejectUnauthorized: false // Often needed for cloud providers
        };
    }

    redis = process.env.REDIS_URL
        ? new Redis(process.env.REDIS_URL, {
              tls: process.env.REDIS_URL.startsWith('rediss://')
                  ? { rejectUnauthorized: false }
                  : undefined,
              maxRetriesPerRequest: 3,
              enableOfflineQueue: false,
          })
        : new Redis(redisOptions);

    redis.on('connect', () => {
        console.log('✅ Connected to Redis successfully');
    });

    redis.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
    });

    /**
     * Helper to delete keys by pattern (e.g., "school:1:members:*")
     * Uses SCAN to avoid blocking the server.
     */
    redis.delByPattern = async (pattern) => {
        let cursor = '0';
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== '0');
    };

} else {
    // No Redis configured — provide a safe stub
    console.warn('⚠️ Redis not configured — caching and rate limiting will use in-memory fallbacks or no-ops');
    
    // Create a dummy redis object so services don't crash when calling redis.get / redis.set
    redis = {
        status: 'end',
        get: async () => null,
        set: async () => 'OK',
        del: async () => 0,
        delByPattern: async () => {},
        scan: async () => ['0', []],
        call: undefined, // Rate limiter checks for typeof redis.call === 'function'
        on: () => {}
    };
}

module.exports = redis;