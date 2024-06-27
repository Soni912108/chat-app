const redis = require('redis');
require('dotenv').config();

function connectToRedis() {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;
  const password = process.env.REDIS_PASSWORD;
  
  const url = `redis://${host}:${port}`;
  const redisClient = redis.createClient({ url, password });

  redisClient.on('connect', () => {
    console.log('Redis Connected');
  });

  redisClient.on('ready', () => {
    console.log('Redis Client Ready');
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  redisClient.on('reconnecting', (delay) => {
    console.log(`Redis reconnecting in ${delay}ms`);
  });

  redisClient.on('end', () => {
    console.log('Redis connection closed');
  });

  return redisClient;
}

module.exports = connectToRedis;
