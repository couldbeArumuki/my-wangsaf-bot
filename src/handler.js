const path = require('path')
const fs = require('fs')
const config = require('../config')
const { autoAI } = require('./plugins/autoai')

// Load semua plugin dari folder plugins/
const plugins = {}
const pluginsDir = path.join(__dirname, 'plugins')
const pluginFiles = fs.readdirSync(pluginsDir).filter((f) => f.endsWith('.js'))

for (const file of pluginFiles) {
  try {
    const commands = require(path.join(pluginsDir, file))
    for (const [cmd, fn] of Object.entries(commands)) {
      // Ignorar keys dengan awalan _ (helpers internal, bukan command pengguna)
      if (typeof fn === 'function' && !cmd.startsWith('_') && cmd.toLowerCase() !== 'autoai') {
        plugins[cmd.toLowerCase()] = fn
      }
    }
  } catch (err) {
    console.error(`[Loader] Gagal load plugin ${file}:`, err.message)
  }
}

console.log(`[Loader] Loaded ${Object.keys(plugins).length} command(s): ${Object.keys(plugins).join(', ')}`)

// Ambil afkMap dari plugin interaktif (opsional, tidak wajib ada)
let afkMap
try {
  afkMap = require('./plugins/interactive')._afkMap
} catch (_) { /* abaikan jika plugin tidak ada */ }

/**
 * Ambil teks dari pesan (support text, image caption, quoted, dll)
 */
function getMessageText(msg) {
  const m = msg.message
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    ''
  )
}

/**
 * Helper: reply teks ke pengirim
 */
async function reply(sock, msg, text) {
  await sock.sendMessage(
    msg.key.remoteJid,
    { text },
    { quoted: msg }
  )
}

/**
 * Entry point untuk setiap pesan masuk
 */
async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid
  const isGroup = jid.endsWith('@g.us')
  const text = getMessageText(msg).trim()
  const prefix = config.prefix

  // Auto-cancel AFK jika pengirim sedang AFK dan mengirim pesan apapun
  if (afkMap) {
    const senderJid = msg.key.participant || msg.key.remoteJid
    if (afkMap.has(senderJid)) {
      const afkData = afkMap.get(senderJid)
      afkMap.delete(senderJid)
      const dur = formatDuration(Date.now() - afkData.since)
      try {
        await reply(sock, msg, `✅ *AFK dinonaktifkan otomatis*\nAlasan tadi: ${afkData.reason}\nDurasi: ${dur}`)
      } catch (_) { /* abaikan */ }
    }
  }

  if (!text.startsWith(prefix)) {
    if (!isGroup && typeof autoAI === 'function') {
      await autoAI({ sock, msg, text })
    }
    return
  }

  const body = text.slice(prefix.length).trim()
  const [rawCmd, ...argArr] = body.split(/\s+/)
  const command = rawCmd.toLowerCase()
  const args = argArr
  const fullArgs = argArr.join(' ')

  // Konteks yang dikirim ke setiap plugin
  const ctx = {
    sock,
    msg,
    jid,
    isGroup,
    args,
    fullArgs,
    command,
    prefix,
    reply: (text) => reply(sock, msg, text),
    config,
  }

  if (!plugins[command]) return

  try {
    await plugins[command](ctx)
  } catch (err) {
    console.error(`[Command Error] .${command}:`, err.message)
    await reply(sock, msg, `❌ Terjadi error saat menjalankan .${command}`)
  }
}

/**
 * Helper durasi (dipakai untuk pesan AFK)
 */
function formatDuration(ms) {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s} detik`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} menit`
  const h = Math.floor(m / 60)
  return `${h} jam ${m % 60} menit`
}

module.exports = { handleMessage }
