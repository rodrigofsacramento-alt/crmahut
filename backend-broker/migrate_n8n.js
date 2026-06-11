const fs = require('fs');

const path = './n8n/workflow_antigo.json';
const outPath = './n8n/workflow_novo.json';
let wf = JSON.parse(fs.readFileSync(path, 'utf8'));

wf.nodes.forEach(node => {
  if (node.type.includes('supabase')) {
    const params = node.parameters;
    const table = params.tableId || params.table;

    // 1. Map leads_sync_2_0 (and profiles)
    if (table === 'leads_sync_2_0' || node.name === 'Create a row base da dados teste') {
      params.tableId = 'profiles';
      if (params.table) params.table = 'profiles';
      
      // Map filters if any
      if (params.filters && params.filters.conditions) {
        params.filters.conditions.forEach(cond => {
          if (cond.keyName === 'name') cond.keyName = 'phone'; // name was phone? Wait.
          if (cond.keyName === 'telefone') cond.keyName = 'phone';
        });
      }

      // Map fields if any
      if (params.fieldsUi && params.fieldsUi.fieldValues) {
        params.fieldsUi.fieldValues.forEach(f => {
          if (f.fieldId === 'name') f.fieldId = 'full_name';
          if (f.fieldId === 'telefone') f.fieldId = 'phone';
        });
        
        // Se for create, força role='client'
        if (node.name.includes('Create a row')) {
          params.fieldsUi.fieldValues.push({
            fieldId: 'role',
            fieldValue: 'client'
          });
        }
      }
    }

    // 2. Map chats -> conversations
    if (table === 'chats' || node.name === 'Adiciona CHAT supabase') {
      params.tableId = 'conversations';
      if (params.table) params.table = 'conversations';

      // Map fields
      if (params.fieldsUi && params.fieldsUi.fieldValues) {
        // Remove 'phone', add 'client_id' and 'status' and 'ai_enabled'
        params.fieldsUi.fieldValues = params.fieldsUi.fieldValues.filter(f => f.fieldId !== 'phone');
        
        // Aqui o nó anterior que criou/buscou o lead se chama "Create a row base da dados teste"
        // Então pegamos o id de lá
        params.fieldsUi.fieldValues.push({
          fieldId: 'client_id',
          fieldValue: "={{ $('Create a row base da dados teste').item.json.id || $('Busca Telefone').item.json.id }}"
        });
        params.fieldsUi.fieldValues.push({
          fieldId: 'status',
          fieldValue: "open"
        });
        params.fieldsUi.fieldValues.push({
          fieldId: 'ai_enabled',
          fieldValue: "true"
        });
      }
    }

    // 3. Map chat_messages -> messages
    if (table === 'chat_messages' || node.name === 'Cria Histórico Supabase' || node.name === 'ListMessages-Supabase2') {
      params.tableId = 'messages';
      if (params.table) params.table = 'messages';

      // Remove phone and nomewpp, add conversation_id, content, sender_id
      if (params.fieldsUi && params.fieldsUi.fieldValues) {
        let contentExp = "";
        const userMsg = params.fieldsUi.fieldValues.find(f => f.fieldId === 'user_message');
        const botMsg = params.fieldsUi.fieldValues.find(f => f.fieldId === 'bot_message');
        
        if (userMsg && userMsg.fieldValue) contentExp = userMsg.fieldValue;
        if (botMsg && botMsg.fieldValue) contentExp = botMsg.fieldValue;

        params.fieldsUi.fieldValues = params.fieldsUi.fieldValues.filter(f => !['phone', 'nomewpp', 'user_message', 'bot_message'].includes(f.fieldId));

        params.fieldsUi.fieldValues.push({
          fieldId: 'conversation_id',
          fieldValue: "={{ $('Adiciona CHAT supabase').item.json.id }}"
        });
        params.fieldsUi.fieldValues.push({
          fieldId: 'content',
          fieldValue: contentExp
        });
      }
      
      if (params.filters && params.filters.conditions) {
        params.filters.conditions = params.filters.conditions.filter(c => c.keyName !== 'phone' && c.keyName !== 'active');
        params.filters.conditions.push({
          keyName: 'conversation_id',
          condition: 'eq',
          keyValue: "={{ $('Adiciona CHAT supabase').item.json.id }}"
        });
      }
    }
  }
});

fs.writeFileSync(outPath, JSON.stringify(wf, null, 2));
console.log('JSON modificado salvo com sucesso!');
