const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function disconnect() {
  console.log('Apagando sessões do banco de dados...');
  await supabase.from('whatsapp_sessions').update({ status: 'disconnected', qr_code: null, phone_number: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  
  const authDir = path.join(__dirname, '..', 'auth_info');
  if (fs.existsSync(authDir)) {
    console.log('Deletando pasta auth_info...');
    fs.rmSync(authDir, { recursive: true, force: true });
  }
  
  console.log('Tudo limpo!');
}

disconnect();
