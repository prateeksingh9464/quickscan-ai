import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema({
    sourceUrl: { type: String, required: true },
    summary: { type: String, required: true },
    keyPoints: [{ type: String }],
    sentimentScore: { type: Number },
    entities: [{ type: String }]
}, { timestamps: true }); // This automatically adds 'createdAt' and 'updatedAt'

export default mongoose.model('Scan', scanSchema);