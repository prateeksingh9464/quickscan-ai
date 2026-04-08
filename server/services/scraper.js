import axios from 'axios';
import * as cheerio from 'cheerio';

export const scrapeText = async (url) => {
    try {
        const { data } = await axios.get(url, { 
            timeout: 3000,
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        const $ = cheerio.load(data);

        $('script, style, nav, footer, header, ads, iframe, .sidebar').remove();

        const text = $('p, h1, h2, h3').text().replace(/\s+/g, ' ').trim();
        
        return text.slice(0, 8000);
    } catch (error) {
        throw new Error('Failed to scrape the website within the time limit.');
    }
};