const fs = require('fs');
let content = fs.readFileSync('src/sw.js', 'utf8');
content = content.replace(/const ignored = self\.__WB_MANIFEST;/, "console.log('Precaching:', self.__WB_MANIFEST);");
fs.writeFileSync('src/sw.js', content);
