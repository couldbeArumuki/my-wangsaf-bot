require('dotenv').config()
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')
const qrcodeTerminal = require('qrcode-terminal')
const QRCode = require('qrcode')
const open = require('open')
const fs = require('fs')
const path = require('path')
const pino = require('pino')
const { handleMessage } = require('./handler')
const config = require('../config')

const logger = pino({ level: 'silent' })

async function startBot() {
  console.log('[BOOT] startBot jalan')

  const authFolder = path.join(__dirname, '..', 'auth_info', config.sessionName)
  const { state, saveCreds } = await useMultiFileAuthState(authFolder)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: [config.botName, 'Chrome', '1.0.0'],
  })

  console.log('[BOOT] socket kebentuk')

  sock.ev.on('creds.update', saveCreds)

  let lastQr = null

  sock.ev.on('connection.update', async (update) => {
    console.log('[DEBUG]', { connection: update.connection, hasQr: !!update.qr })
    const { connection, lastDisconnect, qr } = update

    if (connection === 'open') {
      console.log('[WA] Connected ✅')
      lastQr = null
      return
    }

    if (connection === 'close') {
      // reset biar kalau reconnect minta QR lagi, dia mau print
      lastQr = null
    }

    // QR hanya diproses kalau memang ada qr dan belum open
    if (qr && qr !== lastQr) {
      lastQr = qr

      qrcodeTerminal.generate(qr, { small: true })

      const outDir = path.join(process.cwd(), 'tmp')
      const outPath = path.join(outDir, 'qr.png')
      fs.mkdirSync(outDir, { recursive: true })

      await QRCode.toFile(outPath, qr, { scale: 8 })
      console.log(`[QR] QR disimpan di: ${outPath}`)
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

  // Keep-alive mechanism to prevent process exit
  setInterval(() => { }, 1000 * 60)
}

startBot().catch((e) => console.error('[FATAL]', e))