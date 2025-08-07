// Require .env and configure it
require('dotenv').config({ path: './.env' });

// Create variables for the DB environment variables using process.env
const atlasURI = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.DB_COLLECTION;

// Import mongodb using require, assign it a constant
const { MongoClient } = require('mongodb');

// Create a new instance of MongoClient
const client = new MongoClient(atlasURI);

// An async function to connect to the database
async function connectMongoDB() {
    try {
        // Connect to the MongoDB cluster
        await client.connect();
        console.log("Successfully connected to the database");
    } catch (e) {
        console.error("Failed to connect to the database", e);
    }
};

// Get a reference to our specific collection
const getCollection = () => {
    return client.db(dbName).collection(collectionName);
};

// Export both functions
module.exports = { connectMongoDB, getCollection };