const axios = require('axios')

/**
 * Ambil teks dari command (prioritaskan quoted message, lalu arg)
 */
function extractText(msg, fullArgs) {
  const quotedText =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text
  return quotedText || fullArgs
}

// ─────────────────────────────────────────────────────────────────────────────
// .tts — Text-to-Speech menggunakan Google Translate TTS (gratis, tidak resmi)
// ─────────────────────────────────────────────────────────────────────────────
async function tts({ sock, jid, msg, reply, fullArgs }) {
  const text = extractText(msg, fullArgs)
  if (!text) return reply('❓ Contoh: `.tts Halo semua!` atau reply pesan teks.')

  if (text.length > 200) return reply('❌ Teks maksimal 200 karakter untuk TTS.')

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=id&client=tw-ob`
    const resp = await axios.get(ttsUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        Referer: 'https://translate.google.com/',
      },
    })

    const buffer = Buffer.from(resp.data)
    await sock.sendMessage(
      jid,
      { audio: buffer, mimetype: 'audio/mpeg', ptt: true },
      { quoted: msg }
    )
  } catch (err) {
    await reply(`❌ TTS tidak tersedia saat ini. Coba lagi nanti.`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// .say — sama seperti .tts tapi dikirim sebagai pesan suara biasa (ptt: false)
// ─────────────────────────────────────────────────────────────────────────────
async function say({ sock, jid, msg, reply, fullArgs }) {
  const text = extractText(msg, fullArgs)
  if (!text) return reply('❓ Contoh: `.say Halo semua!` atau reply pesan teks.')

  if (text.length > 200) return reply('❌ Teks maksimal 200 karakter.')

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=id&client=tw-ob`
    const resp = await axios.get(ttsUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        Referer: 'https://translate.google.com/',
      },
    })

    const buffer = Buffer.from(resp.data)
    await sock.sendMessage(
      jid,
      { audio: buffer, mimetype: 'audio/mpeg', ptt: false },
      { quoted: msg }
    )
  } catch (err) {
    await reply(`❌ Say gagal: ${err.message}`)
  }
}

module.exports = { tts, say }
