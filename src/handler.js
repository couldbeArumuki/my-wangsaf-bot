const path = require('path')
const fs = require('fs')
const config = require('../config')

// Load semua plugin dari folder plugins/
const plugins = {}
const pluginsDir = path.join(__dirname, 'plugins')
const pluginFiles = fs.readdirSync(pluginsDir).filter((f) => f.endsWith('.js'))

for (const file of pluginFiles) {
  try {
    const commands = require(path.join(pluginsDir, file))
    for (const [cmd, fn] of Object.entries(commands)) {
      plugins[cmd.toLowerCase()] = fn
    }
  } catch (err) {
    console.error(`[Loader] Gagal load plugin ${file}:`, err.message)
  }
}

console.log(`[Loader] Loaded ${Object.keys(plugins).length} command(s): ${Object.keys(plugins).join(', ')}`)

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

  if (!text.startsWith(prefix)) return

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

module.exports = { handleMessage }
