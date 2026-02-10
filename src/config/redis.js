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

module.exports = redis;