require('dotenv').config()
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const path = require('path')
const { handleMessage } = require('./handler')
const config = require('../config')

const logger = pino({ level: 'silent' })

async function startBot() {
  const authFolder = path.join(__dirname, '..', 'auth_info', config.sessionName)
  const { state, saveCreds } = await useMultiFileAuthState(authFolder)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: true,
    browser: [config.botName, 'Chrome', '1.0.0'],
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n[QR] Scan QR di atas dengan WhatsApp kamu.\n')
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('[Bot] Koneksi terputus.', shouldReconnect ? 'Reconnecting...' : 'Logged out.')
      if (shouldReconnect) {
        setTimeout(startBot, 3000)
      }
    } else if (connection === 'open') {
      console.log(`[Bot] ${config.botName} terhubung!`)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (!msg.message) continue
      if (msg.key.fromMe) continue
      try {
        await handleMessage(sock, msg)
      } catch (err) {
        console.error('[Handler Error]', err.message)
      }
    }
  })
}

startBot().catch((err) => {
  console.error('[Fatal]', err)
  process.exit(1)
})
