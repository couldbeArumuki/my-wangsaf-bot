require('dotenv').config()
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const QRCode = require('qrcode')
const qrTerminal = require('qrcode-terminal')
const { handleMessage } = require('./handler')
const config = require('../config')

const logger = pino({ level: 'silent' })

const QR_IMAGE_PATH = path.join(__dirname, '..', 'tmp', 'qr.png')

async function showQR(qr) {
  // Print ASCII QR in terminal as fallback
  qrTerminal.generate(qr, { small: true })
  console.log('\n[QR] Scan QR di atas dengan WhatsApp kamu.\n')

  // Generate PNG and auto-open it
  try {
    fs.mkdirSync(path.dirname(QR_IMAGE_PATH), { recursive: true })
    await QRCode.toFile(QR_IMAGE_PATH, qr)
    console.log(`[QR] Gambar QR disimpan di: ${QR_IMAGE_PATH}`)
    let child
    if (process.platform === 'win32') {
      // Use explorer.exe to avoid cmd.exe shell parsing
      child = spawn('explorer', [QR_IMAGE_PATH], { stdio: 'ignore', detached: true })
    } else if (process.platform === 'darwin') {
      child = spawn('open', [QR_IMAGE_PATH], { stdio: 'ignore', detached: true })
    } else {
      child = spawn('xdg-open', [QR_IMAGE_PATH], { stdio: 'ignore', detached: true })
    }
    child.on('error', (err) => console.warn('[QR] Gagal membuka gambar QR:', err.message))
  } catch (err) {
    console.warn('[QR] Gagal membuat/membuka gambar QR:', err.message)
  }
}

async function startBot() {
  const authFolder = path.join(__dirname, '..', 'auth_info', config.sessionName)
  const { state, saveCreds } = await useMultiFileAuthState(authFolder)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: [config.botName, 'Chrome', '1.0.0'],
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      showQR(qr).catch((err) => console.warn('[QR] Error:', err.message))
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
