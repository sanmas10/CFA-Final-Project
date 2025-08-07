// Import the getCollection function from connect.js
const { getCollection } = require('../connect');

async function createNewTranslation(newTranslation) {
    // Translations collection from DB
    const collection = getCollection(); 
    
    // Try catch for error handling
    try {
        // Use the .insertOne() method to add the new object to the collection
        const result = await collection.insertOne(newTranslation);
        
        console.log("Successfully inserted translation:", result.insertedId);
        return result;
    } catch (e) {
     
        console.error("Error inserting translation:", e);
    }
}

// Export
module.exports = { createNewTranslation };