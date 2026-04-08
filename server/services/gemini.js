import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeContent = async (text) => {
    // FIXED: Using the current 2026 model, gemini-2.5-flash
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "You are a data extraction engine. Analyze the text and return a structured JSON response. You must provide a 3-sentence summary, exactly five key bullet points, a sentiment score (0-100), and top 3 entities (People/Companies/Tech). Do not use markdown blocks like ```json.",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    keyPoints: { type: "array", items: { type: "string" } },
                    sentimentScore: { type: "integer" },
                    entities: { type: "array", items: { type: "string" } }
                },
                required: ["summary", "keyPoints", "sentimentScore", "entities"]
            }
        }
    });

    const prompt = `Analyze this text:\n\n${text}`;
    const result = await model.generateContent(prompt);
    
    return JSON.parse(result.response.text());
};