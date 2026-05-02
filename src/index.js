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
const { spawn } = require('child_process')
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
    child.unref()
  } catch (err) {
    console.warn('[QR] Gagal membuat/membuka gambar QR:', err.message)
  }
}

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

  sock.ev.on('connection.update', async (update) => {
    console.log('[DEBUG]', { connection: update.connection, hasQr: !!update.qr })
    const { connection, lastDisconnect, qr } = update

  if (connection === 'open') {
    console.log('[WA] Connected ✅')
    lastQr = null
    return
  }

  if (qr) {
    await showQR(qr).catch((err) => console.warn('[QR] Error:', err.message))
  }

  if (connection === 'close') {
    // reset biar kalau reconnect minta QR lagi, dia mau print
    lastQr = null
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