require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { startWhatsApp, sendMessage } = require('./whatsapp');

const app = express();
app.use(cors());
app.use(express.json());

startWhatsApp();

app.get('/status', (req, res) => {
    res.json({ online: true, message: "API Light Operacional (Supabase Sync)" });
});

app.post('/send', async (req, res) => {
    const { telefone, texto } = req.body;

    try {
        await sendMessage(telefone, texto);
        res.status(200).json({ success: true, message: 'Mensagem enviada!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`API Light rodando na porta ${PORT}`);
});
