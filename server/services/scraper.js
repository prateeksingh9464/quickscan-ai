import axios from 'axios';
import * as cheerio from 'cheerio';

export const scrapeText = async (url) => {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const $ = cheerio.load(data);
        
        // Strip out useless HTML tags
        $('script, style, nav, footer, header, aside').remove();
        
        // Extract text from headers and paragraphs
        const text = $('h1, h2, h3, p').map((i, el) => $(el).text()).get().join(' ');
        
        // Clean up excessive spacing
        return text.replace(/\s+/g, ' ').trim();
    } catch (error) {
        throw new Error(`Scraper failed: ${error.message}`);
    }
};