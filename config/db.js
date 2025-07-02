const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Connected to MongoDB');
      break;
    } catch (err) {
      console.error('MongoDB connection error:', err);
      retries -= 1;
      if (retries === 0) {
        console.error('MongoDB connection failed after retries');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

module.exports = connectDB;