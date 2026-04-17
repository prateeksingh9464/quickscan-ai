import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeContent = async (text) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    // Truncate text to avoid token limits and speed up response
    const truncatedText = text.slice(0, 5000);

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

    // Race the Gemini call against a 25s timeout (stay within Vercel limits)
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timed out after 25 seconds')), 25000)
    );

    try {
        const result = await Promise.race([
            model.generateContent(truncatedText),
            timeoutPromise
        ]);

        const responseText = result.response.text();
        console.log('📝 Raw Gemini response length:', responseText.length);

        const parsed = JSON.parse(responseText);
        return parsed;
    } catch (error) {
        console.error('Gemini API error details:', error.message);

        // Detect quota exceeded errors
        if (error.message && error.message.includes('429')) {
            throw new Error('Gemini API quota exceeded. The free tier limit has been reached. Please try again later or upgrade to a paid plan.');
        }

        throw new Error(`Gemini API failed: ${error.message}`);
    }
};