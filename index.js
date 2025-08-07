const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config({ path: './.env' });

// Import the model functions
const { connectMongoDB } = require('./connect');
const { createNewTranslation } = require('./models/create-message');
const { getAllTranslations } = require('./models/read-message');
const { deleteTranslationById } = require('./models/delete-message');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('./')); 

app.post('/api/gemini', async (req, res) => {
    try {
        const { prompt: userInput } = req.body;
        if (!userInput) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Fetch a corporate buzzword
        const bsResponse = await fetch('https://corporatebs-generator.sameerkumar.website/');
        const bsData = await bsResponse.json();
        const buzzwordPhrase = bsData.phrase;

        // Create the detailed Gemini prompt
        const corporatePrompt = `
            Take this input phrase: "${userInput}"
            Corporate buzzword phrase to integrate: "${buzzwordPhrase}"
            Your task: Rewrite the input phrase by seamlessly incorporating the corporate buzzword phrase while preserving the original meaning. The result should sound professional and corporate.
            Rules:
            // - Keep the original meaning intact
            // - Make it sound naturally corporate/business-like
            // - Integrate the buzzword phrase smoothly (don't just append it)
            // - Return ONLY the rewritten phrase, nothing else
            // - No explanations or additional text
            
            Output:`;

        const apiKey = process.env.VITE_GEMINI_API_KEY;

        if (apiKey) {
            const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: corporatePrompt }] }]
                })
            });

            if (!geminiResponse.ok) {
                const errorData = await geminiResponse.json();
                return res.status(geminiResponse.status).json({ error: errorData.error?.message || 'Gemini API error' });
            }

            const geminiData = await geminiResponse.json();
            const translatedText = geminiData.candidates[0].content.parts[0].text;

            // Save to database
            await createNewTranslation({
                original: userInput,
                jargon: translatedText,
                createdAt: new Date()
            });

            // Send the final result back to the frontend
            return res.json(geminiData);
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ROUTES

// Route to get all saved translations
app.get('/api/translations', async (req, res) => {
    try {
        const translations = await getAllTranslations();
        res.json(translations);
    } catch (error) {
        console.error('Error fetching translations:', error);
        res.status(500).json({ error: 'Failed to fetch translations' });
    }
});

// Route to delete translation by ID
app.delete('/api/translations/:id', async (req, res) => {
    try {
        const translationId = req.params.id;
        const result = await deleteTranslationById(translationId);
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Translation not found' });
        }

        res.status(200).json({ message: 'Translation deleted successfully' });
    } catch (error) {
        console.error('Error deleting translation:', error);
        res.status(500).json({ error: 'Failed to delete translation' });
    }
});

// Endpoints
app.get('/', (req, res) => {
    res.json({ 
        message: 'Local testing server is running!',
        endpoints: {
            gemini: 'POST /api/gemini',
            get_all_translations: 'GET /api/translations', // new
            delete_translation: 'DELETE /api/translations/:id', // new
            health: 'GET /'
        }
    });
});

// Initializes the application by connecting to MongoDB and starting the Express server
const start = async () => {
    try {
        // Connect to the database
        await connectMongoDB();

        // Start the server
        app.listen(port, () => {
            console.log(`Local testing server running on http://localhost:${port}`);
            console.log('Available endpoints:');
            console.log(`  GET  http://localhost:${port}/`);
            console.log(`  POST http://localhost:${port}/api/gemini`);
            console.log('');
            console.log('API Key status:', process.env.VITE_GEMINI_API_KEY ? 'Found' : 'Not found');
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

start();
