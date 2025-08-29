#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple SVG icon generator for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#3B82F6"/>
  <rect x="64" y="156" width="384" height="200" fill="none" stroke="white" stroke-width="20"/>
  <line x1="64" y1="256" x2="448" y2="256" stroke="white" stroke-width="20"/>
  <rect x="120" y="196" width="20" height="120" fill="white"/>
  <rect x="160" y="196" width="10" height="120" fill="white"/>
  <rect x="180" y="196" width="20" height="120" fill="white"/>
  <rect x="210" y="196" width="10" height="120" fill="white"/>
  <rect x="230" y="196" width="30" height="120" fill="white"/>
  <rect x="270" y="196" width="10" height="120" fill="white"/>
  <rect x="290" y="196" width="20" height="120" fill="white"/>
  <rect x="320" y="196" width="10" height="120" fill="white"/>
  <rect x="340" y="196" width="30" height="120" fill="white"/>
  <rect x="380" y="196" width="20" height="120" fill="white"/>
</svg>`;

// Create a simple SVG icon for now
const publicDir = path.join(__dirname, '..', 'public');

// Save SVG
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

// Create placeholder PNG message
console.log('SVG icon created at public/icon.svg');
console.log('To generate PNG icons, install a tool like sharp or use an online converter');
console.log('Required sizes:', sizes.join(', '));

// Create a simple HTML file to test the icon
const testHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Icon Test</title>
  <style>
    body { display: flex; flex-wrap: wrap; gap: 20px; padding: 20px; background: #f0f0f0; }
    .icon { background: white; padding: 10px; border-radius: 8px; text-align: center; }
  </style>
</head>
<body>
  ${sizes.map(size => `
    <div class="icon">
      <img src="/icon.svg" width="${size}" height="${size}" alt="${size}x${size}">
      <p>${size}x${size}</p>
    </div>
  `).join('')}
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'icon-test.html'), testHtml);

console.log('Icon test page created at public/icon-test.html');