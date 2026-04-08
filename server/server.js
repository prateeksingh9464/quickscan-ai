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

app.get('/', (req, res) => res.send('QuickScan Backend Live'));

app.post('/api/scan', async (req, res) => {
    const { inputType, content } = req.body; 

    if (!content || content.length < 5) {
        return res.status(400).json({ error: 'Please provide more text to analyze.' });
    }

    try {
        let textToAnalyze = content;
        let sourceToSave = "Raw Text";

        if (inputType === 'url') {
            textToAnalyze = await scrapeText(content);
            sourceToSave = content;
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
        res.status(500).json({ error: error.message });
    }
});

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    return mongoose.connect(process.env.MONGODB_URI);
};

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    connectDB().then(() => {
        app.listen(PORT);
    });
} else {
    connectDB();
}

export default app;