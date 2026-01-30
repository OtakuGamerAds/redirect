import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const articlesDir = path.join(__dirname, '../src/assets/articles');
const outputFile = path.join(__dirname, '../all_articles.json');

// Ensure articles directory exists
if (!fs.existsSync(articlesDir)) {
    console.error(`Articles directory not found: ${articlesDir}`);
    process.exit(1);
}

try {
    // Read all files in the directory
    const files = fs.readdirSync(articlesDir);
    const articles = [];

    // Filter for markdown files and read content
    files.filter(file => file.endsWith('.md')).forEach(file => {
        const filePath = path.join(articlesDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            articles.push({
                file_name: file,
                content: content
            });
        } catch (readErr) {
            console.error(`Error reading file ${file}:`, readErr);
        }
    });

    // Create the output JSON structure
    const outputData = {
        articles: articles
    };

    // Write to the output file
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`Successfully aggregated ${articles.length} articles into ${outputFile}`);

} catch (err) {
    console.error('Error processing articles:', err);
    process.exit(1);
}
