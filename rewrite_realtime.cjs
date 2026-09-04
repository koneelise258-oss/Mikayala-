const fs = require('fs');
const path = 'src/services/messageService.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /export function sAbonnerAuxMessages\([\s\S]*?\n  \};\n\}/;

const newCode = `export function sAbonnerAuxMessages(
  coupleId: string,
  onNewMessage: (message: Message) => void,
  onDeleteMessage?: (messageId: string) => void,
  onError?: (error: Error) => void
): () => void {
  const targetCoupleId = coupleId || getStoredPairingState().coupleId;
  if (!targetCoupleId || !isSupabaseConfigured()) {
    return () => {};
  }

  const channelName = \`msgs-\${targetCoupleId}\`;
  const channel = supabase.channel(channelName);

  channel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: \`couple_id=eq.\${targetCoupleId}\` },
      (payload) => {
        if (payload.new) onNewMessage(mapDbRecordToMessage(payload.new));
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: \`couple_id=eq.\${targetCoupleId}\` },
      (payload) => {
        if (payload.new) onNewMessage(mapDbRecordToMessage(payload.new));
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'messages', filter: \`couple_id=eq.\${targetCoupleId}\` },
      (payload) => {
        if (payload.old?.id && onDeleteMessage) onDeleteMessage(payload.old.id);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(\`[Realtime] Connecté au canal: \${channelName}\`);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn(\`[Realtime] Problème de canal (\${status}):\`, err);
        // Supabase Realtime se reconnecte automatiquement en cas de perte réseau.
        // Inutile de lancer un setTimeout manuel.
      } else if (status === 'CLOSED') {
        console.log(\`[Realtime] Canal fermé (\${status}).\`);
      }
    });

  return () => {
    console.log('[Realtime] Désabonnement demandé.');
    supabase.removeChannel(channel);
  };
}`;

code = code.replace(regex, newCode);
fs.writeFileSync(path, code);
console.log('Done');
