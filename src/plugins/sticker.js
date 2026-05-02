const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

/**
 * Cek apakah ffmpeg tersedia di sistem
 */
function hasFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Ambil quoted message dari msg
 */
function getQuoted(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null
}

// ─────────────────────────────────────────────────────────────────────────────
// .sticker — buat sticker dari gambar/video
// ─────────────────────────────────────────────────────────────────────────────
async function sticker({ sock, jid, msg, reply, config }) {
  const quoted = getQuoted(msg)
  const targetMsg = quoted
    ? { message: quoted, key: msg.message.extendedTextMessage.contextInfo }
    : msg

  const msgType = Object.keys(targetMsg.message || {})[0]
  const isImage = msgType === 'imageMessage'
  const isVideo = msgType === 'videoMessage'
  const isSticker = msgType === 'stickerMessage'

  if (!isImage && !isVideo && !isSticker) {
    return reply('❓ Reply gambar atau video pendek (< 10 detik) untuk membuat sticker.')
  }

  if (isVideo) {
    if (!hasFfmpeg()) {
      return reply('❌ ffmpeg tidak tersedia di server. Tidak bisa buat sticker dari video.')
    }
    const dur = targetMsg.message.videoMessage?.seconds || 0
    if (dur > 10) return reply('❌ Video maksimal 10 detik untuk dijadikan sticker.')
  }

  await reply('⏳ Membuat sticker...')

  try {
    const buffer = await downloadMediaMessage(
      { key: targetMsg.key, message: targetMsg.message },
      'buffer',
      {}
    )

    let stickerBuffer

    if (isImage) {
      stickerBuffer = await sharp(buffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp()
        .toBuffer()
    } else if (isVideo) {
      const tmpIn = path.join(os.tmpdir(), `sticker_in_${Date.now()}.mp4`)
      const tmpOut = path.join(os.tmpdir(), `sticker_out_${Date.now()}.webp`)
      fs.writeFileSync(tmpIn, buffer)
      execSync(
        `ffmpeg -i "${tmpIn}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -loop 0 -an -vcodec libwebp -q:v 50 -preset default -compression_level 6 -y "${tmpOut}"`,
        { stdio: 'ignore' }
      )
      stickerBuffer = fs.readFileSync(tmpOut)
      fs.unlinkSync(tmpIn)
      fs.unlinkSync(tmpOut)
    }

    await sock.sendMessage(
      jid,
      {
        sticker: stickerBuffer,
        mimetype: 'image/webp',
        stickerMetadata: {
          packname: config.botName,
          author: config.ownerNumber,
        },
      },
      { quoted: msg }
    )
  } catch (err) {
    await reply(`❌ Gagal membuat sticker: ${err.message}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// .toimg — konversi sticker ke gambar
// ─────────────────────────────────────────────────────────────────────────────
async function toimg({ sock, jid, msg, reply }) {
  const quoted = getQuoted(msg)
  const targetMsg = quoted
    ? { message: quoted, key: msg.message.extendedTextMessage.contextInfo }
    : msg

  const msgType = Object.keys(targetMsg.message || {})[0]
  if (msgType !== 'stickerMessage') {
    return reply('❓ Reply sticker untuk mengubahnya menjadi gambar.')
  }

  await reply('⏳ Mengkonversi sticker ke gambar...')

  try {
    const buffer = await downloadMediaMessage(
      { key: targetMsg.key, message: targetMsg.message },
      'buffer',
      {}
    )

    const imgBuffer = await sharp(buffer).png().toBuffer()

    await sock.sendMessage(jid, { image: imgBuffer, mimetype: 'image/png' }, { quoted: msg })
  } catch (err) {
    await reply(`❌ Gagal mengkonversi sticker: ${err.message}`)
  }
}

module.exports = { sticker, toimg }
