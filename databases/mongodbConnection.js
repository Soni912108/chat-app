const mongoose = require('mongoose');
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

  const sanitizedUri = uri.replace(encodedPassword, '****'); // Redact sensitive parts

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: false,
      serverSelectionTimeoutMS: 5000, // Timeout for unreachable servers
      socketTimeoutMS: 45000, // Close idle sockets
    });
  } catch (error) {
    console.error('MongoDB connection error');
  }
};

module.exports = connectToMongoDB;
