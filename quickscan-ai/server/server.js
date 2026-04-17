import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeContent } from './services/gemini.js';
import { scrapeText } from './services/scraper.js';
import Scan from './models/Scan.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Cached MongoDB connection for serverless (Vercel)
let isConnected = false;

async function connectDB() {
    if (isConnected) return;
    if (mongoose.connection.readyState === 1) {
        isConnected = true;
        return;
    }
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            family: 4,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            bufferCommands: false,
        });
        isConnected = true;
        console.log('✅ Connected to MongoDB Atlas');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        // Don't throw — let the request proceed without DB (save is non-critical)
    }
}

// Warm-up route for Vercel
app.get('/', (req, res) => {
    res.send('QuickScan Backend Live');
});

// Main Scan Route
app.post('/api/scan', async (req, res) => {
    try {
        const { url, text } = req.body;
        console.log('📨 Received scan request:', { url: url || '(none)', textLength: text?.length || 0 });

        let contentToAnalyze = text;

        if (url) {
            console.log('🌐 Scraping URL:', url);
            contentToAnalyze = await scrapeText(url);
            console.log('✅ Scraped text length:', contentToAnalyze?.length || 0);
        }

        if (!contentToAnalyze || contentToAnalyze.length < 50) {
            return res.status(400).json({ error: "Text too short. Please provide at least a full paragraph." });
        }

        console.log('🤖 Calling Gemini API...');
        const analysis = await analyzeContent(contentToAnalyze);
        console.log('✅ Gemini analysis received');

        // Save to database BEFORE responding (serverless may freeze after res.json)
        try {
            await connectDB();
            const newScan = new Scan({
                sourceUrl: url || 'Raw Text Input',
                summary: analysis.summary,
                keyPoints: analysis.keyPoints,
                sentimentScore: analysis.sentimentScore,
                entities: analysis.entities
            });
            await newScan.save();
            console.log('💾 Scan saved to database');
        } catch (dbError) {
            console.error('⚠️ Failed to save to database (non-critical):', dbError.message);
        }

        res.json(analysis);

    } catch (error) {
        console.error('❌ Server Error:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: `Failed to process request: ${error.message}` });
    }
});

// Run locally if not on Vercel
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

export default app;