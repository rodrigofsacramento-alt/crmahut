require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Buscando conversas de Chris Racanelli...');
  // Find profiles matching Chris Racanelli
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', '%Chris%Racanelli%');
    
  if (pErr) console.error('Error fetching profiles:', pErr);
  
  if (!profiles || profiles.length === 0) {
    console.log('Nenhum perfil "Chris Racanelli" encontrado.');
    // Let's try to search by conversations subject or messages
    const { data: convs, error: cErr } = await supabase
      .from('conversations')
      .select('*, client:client_id(full_name)')
      .or('subject.ilike.%Chris%, subject.ilike.%Racanelli%');
      
    if (convs && convs.length > 0) {
      console.log('Encontradas conversas pelo subject:', convs.map(c => c.id));
      for (const c of convs) {
        const { error: delErr } = await supabase.from('conversations').delete().eq('id', c.id);
        if (delErr) console.error('Erro deletando:', delErr);
        else console.log('Deletado:', c.id);
      }
    } else {
        console.log('Tentando deletar qualquer conversa com nome Chris Racanelli (ou onde client name match)...');
        // Let's just do a soft delete or hard delete using a join if possible
        // Let's list all conversations and their clients to debug
        const { data: allConvs } = await supabase
            .from('conversations')
            .select('*, client:client_id(full_name)');
        
        const targetConvs = allConvs.filter(c => c.client && c.client.full_name && c.client.full_name.toLowerCase().includes('chris'));
        if (targetConvs.length > 0) {
            console.log('Encontrados targets via client join:', targetConvs.map(c => c.id));
            for (const c of targetConvs) {
                const { error: delErr } = await supabase.from('conversations').delete().eq('id', c.id);
                if (delErr) console.error('Erro deletando:', delErr);
                else console.log('Deletado:', c.id);
            }
        } else {
            console.log('Nenhuma conversa encontrada.');
        }
    }
    return;
  }
  
  console.log(`Encontrados ${profiles.length} perfis.`);
  const profileIds = profiles.map(p => p.id);
  
  const { data: conversations, error: cErr } = await supabase
    .from('conversations')
    .select('*')
    .in('client_id', profileIds);
    
  if (cErr) console.error('Error fetching conversations:', cErr);
  
  if (conversations && conversations.length > 0) {
    console.log(`Encontradas ${conversations.length} conversas. Deletando...`);
    const { error: dErr } = await supabase
      .from('conversations')
      .delete()
      .in('id', conversations.map(c => c.id));
      
    if (dErr) console.error('Error deleting conversations:', dErr);
    else console.log('Conversas deletadas com sucesso!');
  } else {
    console.log('Nenhuma conversa encontrada para os perfis.');
  }
}

run();
