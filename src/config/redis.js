const Redis = require('ioredis');

// Connection setup 
// We use the service name "redis" as defined in docker-compose
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost', // 'redis' if running in docker network
    port: process.env.REDIS_PORT || 6379,
});

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