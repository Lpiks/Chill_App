const fs = require('fs');
const path = require('path');

// Base64 for a 1x1 transparent PNG
const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const outputPath = path.join(__dirname, '../assets/transparent.png');
fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));

console.log("Transparent PNG created at", outputPath);
