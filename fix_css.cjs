const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/\.hover:/g, '.hover\\:');
css = css.replace(/\.active:/g, '.active\\:');
css = css.replace(/\.focus:/g, '.focus\\:');

fs.writeFileSync('src/index.css', css);
