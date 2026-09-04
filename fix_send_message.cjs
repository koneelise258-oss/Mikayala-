const fs = require('fs');
const path = 'src/services/messageService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /const basePayload: Record<string, any> = \{\n\s*couple_id: coupleId,\n\s*sender_id: senderId,\n\s*message_type: payload.type \|\| 'text',\n\s*content: payload.content \|\| ''\n\s*\};/,
  `const basePayload: Record<string, any> = {
    id: crypto.randomUUID(),
    couple_id: coupleId,
    sender_id: senderId,
    message_type: payload.type || 'text',
    content: payload.content || ''
  };`
);

fs.writeFileSync(path, code);
console.log('Fixed basePayload');
