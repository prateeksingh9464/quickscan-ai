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

// Diagnostic endpoint to check env vars are set (values hidden)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `set (${process.env.GEMINI_API_KEY.length} chars)` : 'NOT SET',
            MONGODB_URI: process.env.MONGODB_URI ? 'set' : 'NOT SET',
            NODE_ENV: process.env.NODE_ENV || 'not set',
        }
    });
});

// Main Scan Route
app.post('/api/scan', async (req, res) => {
    const startTime = Date.now();
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
        console.log(`✅ Gemini analysis received in ${Date.now() - startTime}ms`);

        // Save to database in background (don't block response)
        // Use .then/.catch so we don't await it
        connectDB()
            .then(() => {
                const newScan = new Scan({
                    sourceUrl: url || 'Raw Text Input',
                    summary: analysis.summary,
                    keyPoints: analysis.keyPoints,
                    sentimentScore: analysis.sentimentScore,
                    entities: analysis.entities
                });
                return newScan.save();
            })
            .then(() => console.log('💾 Scan saved to database'))
            .catch((dbError) => console.error('⚠️ Failed to save to database (non-critical):', dbError.message));

        res.json(analysis);

    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error(`❌ Server Error after ${elapsed}ms:`, error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: `Failed to process request: ${error.message}`,
            elapsed: `${elapsed}ms`
        });
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