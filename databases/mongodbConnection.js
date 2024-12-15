const mongoose = require('mongoose');
require('dotenv').config();

const connectToMongoDB = async () => {
  const password = process.env.PASSWORD; 
  const encodedPassword = encodeURIComponent(password);
  const username = process.env.USER;
  const database = process.env.DB;
  const appName = process.env.APP_NAME;
  const MONGODB_URI = process.env.MONGODB_URI;

  // Replace placeholders with actual values
  const uri = MONGODB_URI
    .replace('USERNAME_PLACEHOLDER', username)
    .replace('PASSWORD_PLACEHOLDER', encodedPassword)
    .replace('DATABASE_PLACEHOLDER', database);
    .replace('APP_NAME_PLACEHOLDER', appName);

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
    console.log(uri);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

module.exports = connectToMongoDB;
