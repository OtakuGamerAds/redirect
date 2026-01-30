import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const articlesDir = path.join(__dirname, '../src/assets/articles');
const jsonFile = path.join(__dirname, '../all_articles.json');

// Ensure articles directory exists
if (!fs.existsSync(articlesDir)) {
    console.error(`Articles directory not found: ${articlesDir}`);
    process.exit(1);
}

try {
    // Read the JSON file
    if (!fs.existsSync(jsonFile)) {
        console.error(`JSON file not found: ${jsonFile}`);
        process.exit(1);
    }

    const jsonData = fs.readFileSync(jsonFile, 'utf8');
    const data = JSON.parse(jsonData);

    if (!data.articles || !Array.isArray(data.articles)) {
        console.error('Invalid JSON structure: "articles" array is missing.');
        process.exit(1);
    }

    let updatedCount = 0;

    console.log(`Found ${data.articles.length} articles to process.`);

    data.articles.forEach(article => {
        if (!article.file_name || !article.content) {
            console.warn(`Skipping invalid article entry: ${JSON.stringify(article).substring(0, 50)}...`);
            return;
        }

        const filePath = path.join(articlesDir, article.file_name);
        
        try {
            fs.writeFileSync(filePath, article.content, 'utf8');
            updatedCount++;
        } catch (writeErr) {
            console.error(`Error writing to ${article.file_name}:`, writeErr);
        }
    });

    console.log(`Successfully updated ${updatedCount} markdown files from ${jsonFile}`);

} catch (err) {
    console.error('Error processing articles:', err);
    process.exit(1);
}
