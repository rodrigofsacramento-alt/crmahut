const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const { updateSessionStatus, saveIncomingMessage } = require('./lib/supabase');

let sock;
let isConnected = false;
let sessionName = 'default';

async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session_auth_${sessionName}`);

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            const currentQr = await qrcode.toDataURL(qr);
            isConnected = false;
            await updateSessionStatus(sessionName, 'qr_ready', currentQr);
        }

        if (connection === 'close') {
            isConnected = false;
            await updateSessionStatus(sessionName, 'disconnected', null);
            
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Reconectando...');
                startWhatsApp();
            } else {
                console.log('Sessão encerrada (Desconectado do Celular).');
            }
        } else if (connection === 'open') {
            isConnected = true;
            await updateSessionStatus(sessionName, 'connected', null);
            console.log('API WhatsApp Conectada e Pronta! (Supabase Atualizado)');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '[Mídia]';
            const telefone = msg.key.remoteJid.replace('@s.whatsapp.net', '');

            await saveIncomingMessage(sessionName, {
                telefone: telefone,
                nome: msg.pushName || 'Lead',
                texto: texto,
                timestamp: msg.messageTimestamp
            });
        }
    });
}

async function sendMessage(telefone, texto) {
    if (!isConnected) throw new Error('WhatsApp Desconectado');
    const jid = telefone.includes('@s.whatsapp.net') ? telefone : `${telefone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: texto });
}

module.exports = { startWhatsApp, sendMessage };
