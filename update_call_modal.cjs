const fs = require('fs');
const filePath = 'src/components/CallModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const stream = await navigator\.mediaDevices\.getUserMedia\(\{\s*video: \{ facingMode: isFrontCamera \? 'user' : 'environment' \},\s*audio: true\s*\}\);/g;

const updatedGetUserMediaCall = `let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: isFrontCamera ? 'user' : 'environment',
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 20 }
            },
            audio: true
          });
        } catch (error: any) {
          console.error(\`[CallModal] getUserMedia error: \${error.name} - \${error.message}\`);
          throw error;
        }`;

content = content.replace(regex, updatedGetUserMediaCall);
fs.writeFileSync(filePath, content);
