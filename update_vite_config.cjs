const fs = require('fs');
const filePath = 'vite.config.ts';
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('strategies:')) {
  // Add strategies: 'injectManifest' to VitePWA config
  content = content.replace(
    /VitePWA\(\{/,
    "VitePWA({\n        strategies: 'injectManifest',\n        srcDir: 'public',\n        filename: 'sw.js',"
  );
  
  // Remove workbox config because it's not valid for injectManifest
  content = content.replace(/workbox:\s*\{[\s\S]*?\},/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log('vite.config.ts updated to injectManifest');
} else {
  console.log('strategies already defined');
}
