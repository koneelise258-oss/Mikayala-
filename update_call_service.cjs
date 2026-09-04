const fs = require('fs');
const filePath = 'src/services/callService.ts';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /this\.localStream = await navigator\.mediaDevices\.getUserMedia\(\{\s*audio: true,\s*video: type === 'video'\s*\}\);/g;

const updatedGetUserMediaCall = `try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 20 },
          facingMode: 'user'
        } : false
      });
    } catch (error: any) {
      console.error(\`[CallService] getUserMedia error: \${error.name} - \${error.message}\`);
      throw error;
    }`;

content = content.replace(regex, updatedGetUserMediaCall);

fs.writeFileSync(filePath, content);
