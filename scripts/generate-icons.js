import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generatePngIcons() {
  const publicDir = path.resolve('public');
  const iconSvgPath = path.join(publicDir, 'icon.svg');
  const maskableSvgPath = path.join(publicDir, 'icon-maskable.svg');

  const iconSvgBuffer = fs.readFileSync(iconSvgPath);
  const maskableSvgBuffer = fs.readFileSync(maskableSvgPath);

  const targets = [
    { name: 'icon-192.png', size: 192, source: iconSvgBuffer },
    { name: 'icon-512.png', size: 512, source: iconSvgBuffer },
    { name: 'apple-touch-icon.png', size: 180, source: iconSvgBuffer },
    { name: 'favicon.png', size: 48, source: iconSvgBuffer },
    { name: 'icon-maskable-512.png', size: 512, source: maskableSvgBuffer },
  ];

  console.log('Generating PNG icons from SVG with Sharp...');

  for (const target of targets) {
    const outputPath = path.join(publicDir, target.name);
    await sharp(target.source)
      .resize(target.size, target.size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath);
    console.log(`Generated: ${target.name} (${target.size}x${target.size})`);
  }

  console.log('All icons generated successfully!');
}

generatePngIcons().catch((err) => {
  console.error('Failed to generate PNG icons:', err);
  process.exit(1);
});
