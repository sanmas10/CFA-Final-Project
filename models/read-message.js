// Import the getCollection function
const { getCollection } = require('../connect');

// Fetch all translation documents from the database.
async function getAllTranslations() {
    // Translations collection from DB
    const collection = getCollection();
    
    // Try catch for error handling
    try {
        // Use the .find() method with an empty object {} to get all documents
        // and .toArray() to convert the results into a JavaScript array
        const results = await collection.find({}).toArray();
        
        console.log("Successfully fetched all translations.");
        return results;
    } catch (e) {
        console.error("Error fetching translations:", e);
    }
}

// Export
module.exports = { getAllTranslations };