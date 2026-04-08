import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { scrapeText } from './services/scraper.js';
import { analyzeContent } from './services/gemini.js';
import Scan from './models/Scan.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// The Updated Scan Route handling both URL and Text
app.post('/api/scan', async (req, res) => {
    const { inputType, content } = req.body; 

    if (!content) return res.status(400).json({ error: 'Content is required' });

    try {
        let textToAnalyze = content;
        let sourceToSave = "Raw Text Input";

        // Only use the scraper if the user selected 'url'
        if (inputType === 'url') {
            console.log(`Step 1: Scraping text from ${content}...`);
            textToAnalyze = await scrapeText(content);
            sourceToSave = content;
        }

        if (textToAnalyze.length < 50) {
            return res.status(400).json({ error: 'Not enough content found to summarize.' });
        }

        console.log(`Step 2: Sending to Gemini for analysis...`);
        const aiResult = await analyzeContent(textToAnalyze);

        console.log(`Step 3: Saving results to MongoDB...`);
        const newScan = await Scan.create({
            sourceUrl: sourceToSave,
            summary: aiResult.summary,
            keyPoints: aiResult.keyPoints,
            sentimentScore: aiResult.sentimentScore,
            entities: aiResult.entities
        });

        console.log('Success!');
        res.status(200).json(newScan);
    } catch (error) {
        console.error('SERVER ERROR:', error);
        res.status(500).json({ error: error.message || 'Something went wrong on the server.' });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));