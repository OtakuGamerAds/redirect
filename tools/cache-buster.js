import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const rootDir = path.resolve(__dirname, '..');
const assets = [
    { type: 'script', path: 'scripts/main.js', pattern: /src="([^"]*scripts\/main\.js)(?:\?v=[^"]*)?"/g },
    { type: 'style', path: 'styles/main.css', pattern: /href="([^"]*styles\/main\.css)(?:\?v=[^"]*)?"/g }
];

// Helper: Calculate content hash
function getFileHash(filePath) {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex').substring(0, 8); // Short hash
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e.message);
        return null;
    }
}

// Helper: Find all HTML files recursively
function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && file !== 'node_modules' && file !== '.git' && file !== '.agent') {
            findHtmlFiles(filePath, fileList);
        } else if (file.endsWith('.html')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

// Main Logic
console.log("🔒 Running Auto-Cache Buster...");

const hashes = {};
assets.forEach(asset => {
    const fullPath = path.join(rootDir, asset.path);
    hashes[asset.path] = getFileHash(fullPath);
    console.log(`Hash for ${asset.path}: ${hashes[asset.path]}`);
});

const htmlFiles = findHtmlFiles(rootDir);
let updatedCount = 0;

htmlFiles.forEach(htmlPath => {
    let content = fs.readFileSync(htmlPath, 'utf8');
    let hasChanges = false;

    assets.forEach(asset => {
        const hash = hashes[asset.path];
        if (!hash) return;

        content = content.replace(asset.pattern, (match, url) => {
            const newTag = match.replace(match, `${asset.type === 'script' ? 'src' : 'href'}="${url}?v=${hash}"`);
            if (match !== newTag) {
                hasChanges = true;
            }
            return newTag;
        });
    });

    if (hasChanges) {
        fs.writeFileSync(htmlPath, content, 'utf8');
        console.log(`✅ Updated: ${path.relative(rootDir, htmlPath)}`);
        updatedCount++;
    }
});

console.log(`\n🎉 Cache busting complete! Updated ${updatedCount} files.`);
console.log("Users will now instantly receive the latest updates.");
