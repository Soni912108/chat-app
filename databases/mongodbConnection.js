const mongoose = require('mongoose');
require('dotenv').config();


const connectToMongoDB = () => {
  const password = process.env.PASSWORD;
  const encodedPassword = encodeURIComponent(password);

  mongoose.connect(
    `mongodb+srv://sonimailfortestuse:${encodedPassword}@backenddb.yf5ipol.mongodb.net/chat-app?retryWrites=true&w=majority&appName=BackendDB`
  ).then(() => {
    console.info("Connected to MongoDB");
  }).catch((error) => {
    console.error("Connection failed!", error);
  });
};

module.exports = connectToMongoDB;
