const Redis = require('ioredis');

// Connection setup 
// Support both REDIS_URL (common in cloud like Upstash) or host/port
const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
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

const redis = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL, { tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined })
    : new Redis(redisOptions);

redis.on('connect', () => {
    console.log('✅ Connected to Redis successfully');
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
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

module.exports = redis;