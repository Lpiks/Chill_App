const Jimp = require('jimp');
const path = require('path');

const inputPath = path.resolve(__dirname, '../App/assets/téléchargement__3_-removebg-preview.png');
const outputPath = path.resolve(__dirname, '../App/assets/notification-icon.png');

console.log('Reading image from:', inputPath);

Jimp.read(inputPath)
  .then(image => {
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const alpha = this.bitmap.data[idx + 3];
      // If the pixel is not fully transparent, make it solid white
      if (alpha > 10) {
        this.bitmap.data[idx + 0] = 255; // R
        this.bitmap.data[idx + 1] = 255; // G
        this.bitmap.data[idx + 2] = 255; // B
        // Optionally keep the original alpha so anti-aliasing edges remain smooth
      }
    });
    
    // Notification icons are typically small, 96x96 is a safe bet for Android
    return image.resize(96, 96).writeAsync(outputPath);
  })
  .then(() => {
    console.log('✅ Notification silhouette icon generated successfully at:', outputPath);
  })
  .catch(err => {
    console.error('❌ Error generating icon:', err);
  });
