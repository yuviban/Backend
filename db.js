const mongoose = require("mongoose");

const mongoURI = process.env.MONGO_URI;

const connectToMongo = async () => {
  try {
    await mongoose.connect(mongoURI, {
    });
    console.log("Connected to Mongo Successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
};

module.exports = connectToMongo;
