const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key must be provided in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSessionStatus(sessionName, status, qrCodeBase64 = null) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .upsert({ 
        session_name: sessionName, 
        status: status, 
        qr_code: qrCodeBase64,
        updated_at: new Date().toISOString()
      }, { onConflict: 'session_name' });

    if (error) throw error;
    console.log(`Supabase Session [${sessionName}] updated to: ${status}`);
  } catch (err) {
    console.error('Error updating session status in Supabase:', err.message);
  }
}

async function saveIncomingMessage(sessionName, messageData) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        session_name: sessionName,
        telefone_cliente: messageData.telefone,
        nome_cliente: messageData.nome,
        texto: messageData.texto,
        enviado_por: 'cliente',
        timestamp: messageData.timestamp
      });

    if (error) throw error;
    console.log(`Saved incoming message from ${messageData.telefone} to Supabase.`);
  } catch (err) {
    console.error('Error saving message in Supabase:', err.message);
  }
}

module.exports = { supabase, updateSessionStatus, saveIncomingMessage };
