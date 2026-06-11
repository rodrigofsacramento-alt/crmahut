import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { startWhatsAppSession, sendOutboundMessage } from './whatsapp';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Broker do WhatsApp iniciado!');
console.log('📡 Escutando pedidos de conexão no Supabase...');

// Reconecta sessões que já estavam conectadas antes do servidor reiniciar
async function reconnectActiveSessions() {
  console.log('🔄 Verificando sessões ativas para reconectar...');
  const { data: activeSessions } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('status', 'connected');
    
  if (activeSessions && activeSessions.length > 0) {
    for (const session of activeSessions) {
      console.log(`[Startup] Reconectando sessão: ${session.tenant_id}-${session.session_name}`);
      startWhatsAppSession(session.tenant_id, session.session_name)
        .catch(err => console.error(`Erro ao reconectar sessão:`, err));
    }
  } else {
    console.log('Nenhuma sessão ativa encontrada para reconectar.');
  }
}
reconnectActiveSessions();

// Inscreve-se no canal Realtime para escutar a tabela whatsapp_sessions
supabase
  .channel('broker-whatsapp-sessions')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'whatsapp_sessions',
      filter: 'status=eq.connecting', // Só escuta quando o status mudar para 'connecting'
    },
    (payload) => {
      const sessionData = payload.new;
      console.log(`\n[Realtime] Pedido de conexão detectado para tenant: ${sessionData.tenant_id}`);
      
      // Inicia a sessão do Baileys e gera o QR Code
      startWhatsAppSession(sessionData.tenant_id, sessionData.session_name)
        .catch(err => console.error(`Erro ao iniciar sessão:`, err));
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Conectado ao Supabase Realtime com sucesso!');
    }
  });

// Mantém o processo vivo
process.on('SIGINT', () => {
  console.log('Encerrando broker...');
  process.exit();
});

// Novo Event Listener: Disparo instantâneo sem polling!
supabase
  .channel('broker-outbound-messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'whatsapp_messages',
      filter: 'status=eq.pending', // Só escuta se nascer como pending
    },
    async (payload) => {
      const msg = payload.new;
      console.log(`\n[Realtime] Nova mensagem para enviar ao número: ${msg.remote_jid}`);
      
      const phone = msg.remote_jid.replace('@s.whatsapp.net', '');
      
      // Envia a mensagem via Baileys instantaneamente
      const success = await sendOutboundMessage(msg.tenant_id, phone, msg.content);
      
      if (success) {
        // Atualiza o banco dizendo que foi enviada (para não duplicar se reiniciar)
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('id', msg.id);
      } else {
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'error', updated_at: new Date().toISOString() })
          .eq('id', msg.id);
      }
    }
  )
  .subscribe();

