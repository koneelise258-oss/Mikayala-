const fs = require('fs');
const path = 'src/services/messageService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /const insertPayload: Record<string, any> = \{\n\s*couple_id: targetCoupleId,\n\s*sender_id: currentUserId,\n\s*message_type: 'image',\n\s*content: cleanCaption,\n\s*storage_path: storagePath,\n\s*media_url: null\n\s*\};/,
  `const insertPayload: Record<string, any> = {
    id: crypto.randomUUID(),
    couple_id: targetCoupleId,
    sender_id: currentUserId,
    message_type: 'image',
    content: cleanCaption,
    storage_path: storagePath,
    media_url: null
  };`
);

code = code.replace(
  /const fallbackPayload = \{\n\s*couple_id: targetCoupleId,\n\s*sender_id: currentUserId,\n\s*message_type: 'image',\n\s*content: cleanCaption,\n\s*storage_path: storagePath\n\s*\};/,
  `const fallbackPayload = {
    id: crypto.randomUUID(),
    couple_id: targetCoupleId,
    sender_id: currentUserId,
    message_type: 'image',
    content: cleanCaption,
    storage_path: storagePath
  };`
);

fs.writeFileSync(path, code);
console.log('Fixed envoyerMessagePhoto payloads');
