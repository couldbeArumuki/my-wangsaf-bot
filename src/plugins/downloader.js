const axios = require('axios')
const { pipeline } = require('stream/promises')
const fs = require('fs')
const path = require('path')
const os = require('os')

// ─────────────────────────────────────────────────────────────────────────────
// Adapter interface untuk downloader
// Tiap adapter adalah fungsi async (url) => { buffer, filename, mime }
// Mudah diganti dengan implementasi lain tanpa ubah command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TikTok downloader — menggunakan tikwm.com API publik (gratis, no-watermark)
 * Fallback: kirim pesan error informatif
 */
async function tiktokAdapter(url) {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
    const { data } = await axios.get(apiUrl, { timeout: 15000 })
    if (!data?.data?.play) throw new Error('No play URL returned')
    const videoUrl = data.data.play

    // Validasi domain URL video yang dikembalikan API
    const parsed = new URL(videoUrl)
    const allowedHosts = /\.(tiktok|tikwm|tiktokcdn)\.com$/
    if (!allowedHosts.test(parsed.hostname)) {
      throw new Error('URL video dari API tidak valid')
    }

    const resp = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 30000 })
    return {
      buffer: Buffer.from(resp.data),
      filename: 'tiktok.mp4',
      mime: 'video/mp4',
    }
  } catch (err) {
    throw new Error(`TikTok download gagal: ${err.message}`)
  }
}

/**
 * YouTube MP3 downloader — menggunakan yt-dlp-api (stub/placeholder)
 * Catatan: ytdl-core sering rate-limited oleh YouTube. Untuk production,
 * ganti dengan yt-dlp binary atau layanan alternatif.
 * Lihat README.md untuk panduan.
 */
async function ytmp3Adapter(url) {
  // Stub: coba pakai ytdl-core, fallback ke pesan error
  try {
    const ytdl = require('ytdl-core')
    if (!ytdl.validateURL(url)) throw new Error('URL YouTube tidak valid')

    const info = await ytdl.getInfo(url)
    const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)
    const tmpPath = path.join(os.tmpdir(), `${title}.mp3`)

    const audioStream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' })
    const writeStream = fs.createWriteStream(tmpPath)
    await pipeline(audioStream, writeStream)

    const buffer = fs.readFileSync(tmpPath)
    fs.unlinkSync(tmpPath)
    return { buffer, filename: `${title}.mp3`, mime: 'audio/mpeg' }
  } catch (err) {
    throw new Error(
      `YouTube MP3 download gagal. Coba lagi nanti atau gunakan yt-dlp (lihat README).`
    )
  }
}

/**
 * YouTube MP4 downloader — sama seperti ytmp3 tapi video
 */
async function ytmp4Adapter(url) {
  try {
    const ytdl = require('ytdl-core')
    if (!ytdl.validateURL(url)) throw new Error('URL YouTube tidak valid')

    const info = await ytdl.getInfo(url)
    const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)
    const tmpPath = path.join(os.tmpdir(), `${title}.mp4`)

    const videoStream = ytdl(url, { quality: 'highest', filter: 'videoandaudio' })
    const writeStream = fs.createWriteStream(tmpPath)
    await pipeline(videoStream, writeStream)

    const buffer = fs.readFileSync(tmpPath)
    fs.unlinkSync(tmpPath)
    return { buffer, filename: `${title}.mp4`, mime: 'video/mp4' }
  } catch (err) {
    throw new Error(
      `YouTube MP4 download gagal. Coba lagi nanti atau gunakan yt-dlp (lihat README).`
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Command handlers
// ─────────────────────────────────────────────────────────────────────────────

async function tiktok({ sock, jid, msg, args, reply }) {
  const url = args[0]
  let parsed
  try {
    parsed = new URL(url || '')
  } catch {
    return reply('❓ Kirim link TikTok yang valid. Contoh:\n`.tiktok https://vt.tiktok.com/xxx`')
  }
  if (!/(^|\.)tiktok\.com$/.test(parsed.hostname)) {
    return reply('❓ Link harus berasal dari domain tiktok.com.')
  }

  await reply('⏳ Mengunduh video TikTok, mohon tunggu...')

  try {
    const { buffer, mime } = await tiktokAdapter(url)
    await sock.sendMessage(jid, { video: buffer, mimetype: mime }, { quoted: msg })
  } catch (err) {
    await reply(`❌ ${err.message}`)
  }
}

async function ytmp3({ sock, jid, msg, args, reply }) {
  const url = args[0]
  if (!url) return reply('❓ Contoh: `.ytmp3 https://youtu.be/xxx`')

  await reply('⏳ Mengunduh audio YouTube, mohon tunggu...')

  try {
    const { buffer, filename, mime } = await ytmp3Adapter(url)
    await sock.sendMessage(
      jid,
      { audio: buffer, mimetype: mime, fileName: filename, ptt: false },
      { quoted: msg }
    )
  } catch (err) {
    await reply(`❌ ${err.message}`)
  }
}

async function ytmp4({ sock, jid, msg, args, reply }) {
  const url = args[0]
  if (!url) return reply('❓ Contoh: `.ytmp4 https://youtu.be/xxx`')

  await reply('⏳ Mengunduh video YouTube, mohon tunggu...')

  try {
    const { buffer, filename, mime } = await ytmp4Adapter(url)
    await sock.sendMessage(
      jid,
      { video: buffer, mimetype: mime, fileName: filename },
      { quoted: msg }
    )
  } catch (err) {
    await reply(`❌ ${err.message}`)
  }
}

module.exports = { tiktok, ytmp3, ytmp4 }
