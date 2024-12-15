const mongoose = require('mongoose');
require('dotenv').config();

const connectToMongoDB = async () => {
  const password = process.env.PASSWORD; // Access password from environment variables
  const encodedPassword = encodeURIComponent(password); // Encode the password to handle special characters
  const username = process.env.USER; // Access username from environment variables
  const MONGODB_URI = process.env.MONGODB_URI // Access the full URI with placeholders to replace

    // Replace the placeholders with actual values
    .replace('USERNAME_PLACEHOLDER', username)
    .replace('PASSWORD_PLACEHOLDER', encodedPassword);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log(MONGODB_URI);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

module.exports = connectToMongoDB;
