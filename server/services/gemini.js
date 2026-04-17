import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeContent = async (text) => {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: "You are a data extraction engine. Analyze text and return JSON. Provide 3-sentence summary, 5 key points, sentiment score (0-100), and top 3 entities. No markdown.",
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

    const result = await model.generateContent(text);
    return JSON.parse(result.response.text());
};