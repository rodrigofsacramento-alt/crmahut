import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { startWhatsAppSession } from './whatsapp';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Broker do WhatsApp iniciado!');
console.log('📡 Escutando pedidos de conexão no Supabase...');

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
