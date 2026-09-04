const fs = require('fs');
const path = 'src/services/messageService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /const insertPayload = \{\n\s*couple_id: targetCoupleId,\n\s*sender_id: currentUserId,\n\s*content: cleanContent,\n\s*message_type: 'text',\n\s*is_ephemeral: false\n\s*\};/,
  `const insertPayload = {
    id: crypto.randomUUID(),
    couple_id: targetCoupleId,
    sender_id: currentUserId,
    content: cleanContent,
    message_type: 'text',
    is_ephemeral: false
  };`
);

fs.writeFileSync(path, code);
console.log('Fixed insertPayload');
