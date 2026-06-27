const mongoose = require('mongoose');
const logger = require('../utils/logger');
require('dotenv').config();

let cached = global.mongooseConnection;
if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null };
}

const connectToMongoDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('Missing required environment variable: MONGODB_URI');
  }

  try {
    if (cached.conn) {
      return cached.conn;
    }

    if (!cached.promise) {
      let uri = MONGODB_URI;
      if (uri.includes('USERNAME_PLACEHOLDER') || uri.includes('PASSWORD_PLACEHOLDER') || uri.includes('DATABASE_PLACEHOLDER') || uri.includes('APP_NAME_PLACEHOLDER')) {
        const password = process.env.PASSWORD;
        const username = process.env.USER;
        const database = process.env.DB;
        const appName = process.env.APP_NAME;

        const missingVars = ['PASSWORD', 'USER', 'DB', 'APP_NAME'].filter((envVar) => !process.env[envVar]);
        if (missingVars.length > 0) {
          throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        uri = uri
          .replace('USERNAME_PLACEHOLDER', username)
          .replace('PASSWORD_PLACEHOLDER', encodeURIComponent(password))
          .replace('DATABASE_PLACEHOLDER', database)
          .replace('APP_NAME_PLACEHOLDER', appName);
      }

      cached.promise = mongoose.connect(uri, {
      autoIndex: false,
      serverSelectionTimeoutMS: 5000, // Timeout for unreachable servers
      socketTimeoutMS: 45000, // Close idle sockets
      family: 4, // Force IPv4 to avoid some DNS issues
      }).then(mongooseInstance => {
        logger.info('db/mongo', 'MongoDB connection successful');
        return mongooseInstance;
      });
    }

    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    logger.error('db/mongo', error.message);
    throw error;
  }
};


module.exports = connectToMongoDB;
