const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript files
const files = glob.sync('src/**/*.ts', {
    ignore: ['node_modules/**', 'dist/**']
});

console.log(`Found ${files.length} TypeScript files`);

let totalRemoved = 0;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const newLines = [];
    let removed = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Skip JSDoc comments
        if (trimmed.startsWith('/**') || trimmed.startsWith('*')) {
            newLines.push(line);
            continue;
        }
        
        // Skip eslint-disable comments
        if (trimmed.includes('eslint-disable')) {
            newLines.push(line);
            continue;
        }
        
        // Skip TODO/FIXME/HACK comments (they are warnings)
        if (trimmed.match(/^\/\/\s*(TODO|FIXME|HACK)/)) {
            newLines.push(line);
            continue;
        }
        
        // Remove standalone line comments
        if (trimmed.match(/^\/\//) && !trimmed.startsWith('///')) {
            removed++;
            totalRemoved++;
            console.log(`Removing from ${file}:${i+1}: ${trimmed}`);
            // Skip this line
            continue;
        }
        
        newLines.push(line);
    }
    
    if (removed > 0) {
        fs.writeFileSync(file, newLines.join('\n'));
        console.log(`Removed ${removed} comments from ${file}`);
    }
});

console.log(`\nTotal comments removed: ${totalRemoved}`);