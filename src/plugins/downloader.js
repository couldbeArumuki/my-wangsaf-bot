const axios = require('axios')

// ─────────────────────────────────────────────────────────────────────────────
// Adapter interface untuk downloader
// Tiap adapter adalah fungsi async (url) => { buffer, filename, mime }
// Mudah diganti dengan implementasi lain tanpa ubah command
// ─────────────────────────────────────────────────────────────────────────────

// Baca konfigurasi dari environment (di-load oleh dotenv di src/index.js)
const YTDLP_API_URL = (process.env.YTDLP_API_URL || '').replace(/\/$/, '')
const TIKTOK_API_URL = (process.env.TIKTOK_API_URL || '').replace(/\/$/, '')

// ─── yt-dlp microservice ─────────────────────────────────────────────────────

/**
 * Download melalui yt-dlp microservice (services/ytdlp-server.js).
 * Mendukung YouTube, TikTok, dan situs lain yang didukung yt-dlp.
 * @param {string} url
 * @param {'mp3'|'mp4'} format
 * @returns {Promise<{buffer: Buffer, filename: string, mime: string}>}
 */
async function downloadViaYtDlp(url, format) {
  if (!YTDLP_API_URL) {
    throw new Error(
      'yt-dlp service belum dikonfigurasi. Set YTDLP_API_URL di .env lalu jalankan: npm run ytdlp-service'
    )
  }
  const endpoint = `${YTDLP_API_URL}/download?url=${encodeURIComponent(url)}&format=${format}`
  try {
    const resp = await axios.get(endpoint, {
      responseType: 'arraybuffer',
      timeout: 180000, // 3 menit untuk video besar
    })
    const mime = format === 'mp3' ? 'audio/mpeg' : 'video/mp4'
    const filename = format === 'mp3' ? 'audio.mp3' : 'video.mp4'
    return { buffer: Buffer.from(resp.data), filename, mime }
  } catch (err) {
    if (err.response) {
      let errMsg = `yt-dlp service error (HTTP ${err.response.status})`
      try {
        const json = JSON.parse(Buffer.from(err.response.data).toString())
        if (json.error) errMsg = json.error
      } catch {
        // respons bukan JSON — pakai pesan default
      }
      throw new Error(errMsg)
    }
    throw err
  }
}

// ─── TikTok adapters ──────────────────────────────────────────────────────────

/**
 * TikTok via tikwm.com public API (gratis, no-watermark).
 */
async function tiktokViaTikwm(url) {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
  const { data } = await axios.get(apiUrl, {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!data?.data) {
    throw new Error(`tikwm API error: code ${data?.code ?? 'unknown'}`)
  }

  // Coba HD dulu, fallback ke SD
  const videoUrl = data.data.hdplay || data.data.play
  if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
    throw new Error('URL video tidak ditemukan di respons tikwm')
  }

  const resp = await axios.get(videoUrl, {
    responseType: 'arraybuffer',
    timeout: 60000,
    headers: { Referer: 'https://www.tiktok.com/' },
  })
  return { buffer: Buffer.from(resp.data), filename: 'tiktok.mp4', mime: 'video/mp4' }
}

/**
 * TikTok via self-hosted custom API (TIKTOK_API_URL).
 * Expects endpoint: GET /download?url=<tiktok_url>
 * Response format: { url: "..." } or { data: { play: "..." } }
 */
async function tiktokViaCustomApi(url, apiBase) {
  const endpoint = `${apiBase}/download?url=${encodeURIComponent(url)}`
  const { data } = await axios.get(endpoint, { timeout: 15000 })
  const videoUrl = data?.url || data?.data?.hdplay || data?.data?.play
  if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
    throw new Error('URL video tidak valid dari self-hosted TikTok API')
  }
  const resp = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000 })
  return { buffer: Buffer.from(resp.data), filename: 'tiktok.mp4', mime: 'video/mp4' }
}

/**
 * TikTok downloader — mencoba beberapa provider secara berurutan:
 * 1. Self-hosted API (TIKTOK_API_URL, jika dikonfigurasi)
 * 2. tikwm.com (API publik gratis, no-watermark)
 * 3. yt-dlp microservice (YTDLP_API_URL, jika dikonfigurasi)
 */
async function tiktokAdapter(url) {
  const errors = []

  if (TIKTOK_API_URL) {
    try {
      return await tiktokViaCustomApi(url, TIKTOK_API_URL)
    } catch (err) {
      errors.push(`Self-hosted TikTok API: ${err.message}`)
    }
  }

  try {
    return await tiktokViaTikwm(url)
  } catch (err) {
    errors.push(`tikwm.com: ${err.message}`)
  }

  if (YTDLP_API_URL) {
    try {
      return await downloadViaYtDlp(url, 'mp4')
    } catch (err) {
      errors.push(`yt-dlp service: ${err.message}`)
    }
  }

  throw new Error(`TikTok download gagal:\n${errors.join('\n')}`)
}

// ─── YouTube adapters ─────────────────────────────────────────────────────────

/**
 * YouTube MP3 — menggunakan yt-dlp microservice (services/ytdlp-server.js).
 * Set YTDLP_API_URL di .env dan jalankan: npm run ytdlp-service
 */
async function ytmp3Adapter(url) {
  if (!YTDLP_API_URL) {
    throw new Error(
      'YouTube download membutuhkan yt-dlp service.\n' +
        'Jalankan: npm run ytdlp-service\n' +
        'Lalu set YTDLP_API_URL=http://localhost:3001 di .env'
    )
  }
  try {
    return await downloadViaYtDlp(url, 'mp3')
  } catch (err) {
    throw new Error(`YouTube MP3 download gagal: ${err.message}`)
  }
}

/**
 * YouTube MP4 — menggunakan yt-dlp microservice (services/ytdlp-server.js).
 * Set YTDLP_API_URL di .env dan jalankan: npm run ytdlp-service
 */
async function ytmp4Adapter(url) {
  if (!YTDLP_API_URL) {
    throw new Error(
      'YouTube download membutuhkan yt-dlp service.\n' +
        'Jalankan: npm run ytdlp-service\n' +
        'Lalu set YTDLP_API_URL=http://localhost:3001 di .env'
    )
  }
  try {
    return await downloadViaYtDlp(url, 'mp4')
  } catch (err) {
    throw new Error(`YouTube MP4 download gagal: ${err.message}`)
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
