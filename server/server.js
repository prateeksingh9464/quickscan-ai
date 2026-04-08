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

app.get('/', (req, res) => res.send('QuickScan Backend is Live!'));

app.post('/api/scan', async (req, res) => {
    const { inputType, content } = req.body; 

    if (!content) return res.status(400).json({ error: 'Content is required' });

    try {
        let textToAnalyze = content;
        let sourceToSave = "Raw Text Input";

        if (inputType === 'url') {
            textToAnalyze = await scrapeText(content);
            sourceToSave = content;
        }

        if (textToAnalyze.length < 50) {
            return res.status(400).json({ error: 'Not enough content found to summarize.' });
        }

        const aiResult = await analyzeContent(textToAnalyze);

        const newScan = await Scan.create({
            sourceUrl: sourceToSave,
            summary: aiResult.summary,
            keyPoints: aiResult.keyPoints,
            sentimentScore: aiResult.sentimentScore,
            entities: aiResult.entities
        });

        res.status(200).json(newScan);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Something went wrong on the server.' });
    }
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            app.listen(PORT);
        })
        .catch(err => console.error(err));
} else {
    mongoose.connect(process.env.MONGODB_URI)
        .catch(err => console.error(err));
}

export default app;