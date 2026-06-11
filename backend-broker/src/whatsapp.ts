import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Precisamos da chave de serviço para bypassar o RLS
const supabase = createClient(supabaseUrl, supabaseKey);

// Guardar sessões ativas na memória
const sessions = new Map<string, any>();

export async function startWhatsAppSession(tenantId: string, sessionName: string) {
  const sessionId = `${tenantId}-${sessionName}`;
  
  // Se a sessão já estiver rodando, não fazer nada ou reconectar?
  // Para agora, vamos prosseguir com a inicialização.
  
  console.log(`[Baileys] Inicializando sessão ${sessionId}...`);
  
  const authDir = path.join(__dirname, '..', 'auth_info', sessionId);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Apenas para debug local
    logger: pino({ level: 'silent' }), // Evitar muito log
    browser: ['Estate CRM', 'Chrome', '1.0.0']
  });

  sessions.set(sessionId, sock);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[Baileys] QR Code gerado para ${sessionId}`);
      // Converter QR Code para Base64 usando um truque simples
      // A biblioteca gera uma string, não uma imagem real, 
      // precisaremos do qrcode library se quisermos base64 puro, mas o Baileys manda o QR como string!
      // Nós vamos instalar 'qrcode' e gerar o data URL para jogar no Supabase!
      
      const QRCode = require('qrcode');
      const base64QR = await QRCode.toDataURL(qr);
      // Remove o prefixo "data:image/png;base64," para salvar apenas os dados se preferir,
      // ou salva com o prefixo e o front usa direto. Vamos deixar o prefixo ou o front já coloca?
      // No frontend: <img src={`data:image/png;base64,${session.qr_code}`} />
      // O front coloca o prefixo. Então vamos remover o prefixo.
      const pureBase64 = base64QR.split(',')[1];

      // Atualizar o banco de dados
      await supabase
        .from('whatsapp_sessions')
        .update({ status: 'qr_ready', qr_code: pureBase64, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('session_name', sessionName);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[Baileys] Conexão fechada. Reconectar? ${shouldReconnect}`);
      
      if (shouldReconnect) {
        startWhatsAppSession(tenantId, sessionName);
      } else {
        console.log(`[Baileys] Desconectado permanentemente (Logged out).`);
        // Deletar a pasta auth e atualizar banco
        fs.rmSync(authDir, { recursive: true, force: true });
        sessions.delete(sessionId);
        
        await supabase
          .from('whatsapp_sessions')
          .update({ status: 'disconnected', qr_code: null, updated_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('session_name', sessionName);
      }
    } else if (connection === 'open') {
      console.log(`[Baileys] Conexão aberta com sucesso para ${sessionId}!`);
      
      // Obter o número de telefone da conexão
      const phoneId = sock.user?.id.split(':')[0] || null;

      await supabase
        .from('whatsapp_sessions')
        .update({ 
          status: 'connected', 
          qr_code: null, 
          phone_number: phoneId,
          updated_at: new Date().toISOString() 
        })
        .eq('tenant_id', tenantId)
        .eq('session_name', sessionName);
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    // Quando uma nova mensagem chega
    for (const msg of m.messages) {
      if (!msg.message || msg.key.fromMe) continue; // Ignorar mensagens enviadas por mim mesmo no app original
      
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.includes('@g.us')) continue; // Ignorar grupos por enquanto
      
      const phone = remoteJid.split('@')[0];
      const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;
      
      if (!textMessage) continue;

      console.log(`[Baileys] Mensagem de ${phone}: ${textMessage}`);

      try {
        // Enviar Webhook para o n8n
        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        if (!webhookUrl) {
          console.error('[Baileys] N8N_WEBHOOK_URL não configurada no .env!');
          return;
        }

        const payload = {
          sender: phone,
          wook: 'RECEIVE_MESSAGE',
          type: 'text',
          content: textMessage,
          name: msg.pushName || 'Contato ' + phone,
          datetime: new Date().toISOString()
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          console.log(`[Baileys] Mensagem repassada com sucesso para o n8n!`);
        } else {
          console.error(`[Baileys] Erro ao repassar para n8n: Status ${response.status}`);
        }

      } catch (err) {
        console.error(`[Baileys] Erro ao repassar mensagem:`, err);
      }
    }
  });
}

// Função para enviar mensagem de texto para o WhatsApp do cliente
export async function sendOutboundMessage(tenantId: string, phone: string, content: string) {
  // Como só temos uma sessão por enquanto (default), podemos buscar pela primeira chave
  // Mas o certo em multi-tenant é buscar a chave do tenant correto
  const sessionId = `${tenantId}-default`;
  const sock = sessions.get(sessionId);

  if (!sock) {
    console.error(`[Baileys] Erro: Sessão não encontrada ou desconectada para ${sessionId}`);
    return false;
  }

  try {
    // Adiciona o sufixo @s.whatsapp.net necessário para o Baileys
    const jid = `${phone}@s.whatsapp.net`;
    
    await sock.sendMessage(jid, { text: content });
    console.log(`[Baileys] Mensagem enviada com sucesso para ${phone}`);
    return true;
  } catch (error) {
    console.error(`[Baileys] Falha ao enviar mensagem para ${phone}:`, error);
    return false;
  }
}

