const mongoose = require('mongoose');
const logger = require('../utils/logger');
require('dotenv').config();

const connectToMongoDB = async () => {
  const password = process.env.PASSWORD; 
  const encodedPassword = encodeURIComponent(password);
  const username = process.env.USER;
  const database = process.env.DB;
  const appName = process.env.APP_NAME;
  const MONGODB_URI = process.env.MONGODB_URI;

  // Validate environment variables
  const requiredEnvVars = ['PASSWORD', 'USER', 'DB', 'APP_NAME', 'MONGODB_URI'];
  const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Replace placeholders with actual values
  const uri = MONGODB_URI
    .replace('USERNAME_PLACEHOLDER', username)
    .replace('PASSWORD_PLACEHOLDER', encodedPassword)
    .replace('DATABASE_PLACEHOLDER', database)
    .replace('APP_NAME_PLACEHOLDER', appName);

  // const sanitizedUri = uri.replace(encodedPassword, '****'); // Redact sensitive parts
  // console.log('MongoDB URI updated:', sanitizedUri);
  try {
    await mongoose.connect(uri, {
      autoIndex: false,
      serverSelectionTimeoutMS: 5000, // Timeout for unreachable servers
      socketTimeoutMS: 45000, // Close idle sockets
      family: 4, // Force IPv4 to avoid some DNS issues
    }).then(() => {
      logger.info('db/mongo', 'MongoDB connection successful');
    })
  } catch (error) {
    logger.error('db/mongo', error.message);
  }
};


module.exports = connectToMongoDB;
