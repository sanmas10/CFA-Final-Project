// Import getCollection and ObjectId
const { getCollection } = require('../connect');
const { ObjectId } = require('mongodb');


// Deletes a single translation document from the database by its ID.
async function deleteTranslationById(id) {
    // Translation collection from DB
    const collection = getCollection();
    
    // Try catch for error handling
    try {
        // Convert the id string from the request into a MongoDB ObjectId
        const documentId = new ObjectId(id);
        // Use the .deleteOne() method to remove the matching document
        const result = await collection.deleteOne({ _id: documentId });
        console.log("Deletion result:", result);
        return result;
    } catch (e) {
        console.error("Error deleting translation:", e);
    }
}

// Export
module.exports = { deleteTranslationById };