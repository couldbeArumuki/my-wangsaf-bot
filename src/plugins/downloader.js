const axios = require('axios')
const { execFile } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')
const os = require('os')

const execFileAsync = promisify(execFile)

// ─────────────────────────────────────────────────────────────────────────────
// Adapter interface untuk downloader
// Tiap adapter adalah fungsi async (url) => { buffer, filename, mime }
// Mudah diganti dengan implementasi lain tanpa ubah command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kembalikan path ke binary yt-dlp.
 * Bisa dikonfigurasi via env YTDLP_PATH (contoh: C:\tools\yt-dlp.exe di Windows).
 * Jika tidak diset, diasumsikan `yt-dlp` sudah ada di PATH.
 */
function getYtDlpPath() {
  return process.env.YTDLP_PATH || 'yt-dlp'
}

/**
 * Download media menggunakan yt-dlp lokal (mendukung YouTube, TikTok, dan 1000+ situs).
 * @param {string} url      - URL video/audio
 * @param {'mp3'|'mp4'} ext - Format output
 * @param {string} mime     - MIME type untuk pengiriman WhatsApp
 * @param {string} prefix   - Prefix nama file sementara
 */
async function ytDlpDownload(url, ext, mime, prefix) {
  const ytdlp = getYtDlpPath()
  const timeout = parseInt(process.env.DOWNLOAD_TIMEOUT) || 120000
  // Gunakan direktori temporer sistem
  const tmpDir = os.tmpdir()
  const tmpBase = path.join(tmpDir, `${prefix}_${Date.now()}`)
  // yt-dlp akan menambahkan ekstensi sendiri; kita pakai template %(ext)s
  const outTemplate = `${tmpBase}.%(ext)s`

  let args
  if (ext === 'mp3') {
    args = [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', outTemplate,
      '--no-playlist',
      '--no-warnings',
      url,
    ]
  } else {
    args = [
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '-o', outTemplate,
      '--no-playlist',
      '--no-warnings',
      url,
    ]
  }

  try {
    await execFileAsync(ytdlp, args, { timeout })
  } catch (err) {
    // Cek apakah yt-dlp tidak ditemukan (ENOENT)
    if (err.code === 'ENOENT') {
      throw new Error(
        `yt-dlp tidak ditemukan. Install dulu:\n` +
        `Windows: unduh dari https://github.com/yt-dlp/yt-dlp/releases (yt-dlp.exe)\n` +
        `  → simpan ke folder PATH atau set YTDLP_PATH di .env\n` +
        `Linux/Mac: pip install yt-dlp  atau  brew install yt-dlp`
      )
    }
    throw new Error(`yt-dlp error: ${err.stderr || err.message}`)
  }

  // Cari file hasil download (ekstensi bisa bervariasi)
  const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith(path.basename(tmpBase)))
  if (files.length === 0) throw new Error('yt-dlp selesai tapi file output tidak ditemukan')

  const outFile = path.join(tmpDir, files[0])
  try {
    const buffer = fs.readFileSync(outFile)
    return { buffer, filename: `${prefix}.${ext}`, mime }
  } finally {
    try { fs.unlinkSync(outFile) } catch (_) { /* abaikan */ }
  }
}

/**
 * TikTok downloader
 * Primary  : tikwm.com API publik (gratis, tanpa watermark)
 * Fallback : yt-dlp lokal
 */
async function tiktokAdapter(url) {
  const tikTokTimeout = parseInt(process.env.TIKTOK_TIMEOUT) || 20000
  const downloadTimeout = parseInt(process.env.DOWNLOAD_TIMEOUT) || 120000

  // ── Primary: tikwm.com ──────────────────────────────────────────────────
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
    const { data } = await axios.get(apiUrl, {
      timeout: tikTokTimeout,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WangsafBot/1.0)' },
    })

    // Ambil URL play terbaik yang tersedia (hdplay > play > wmplay)
    const videoUrl = data?.data?.hdplay || data?.data?.play || data?.data?.wmplay
    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
      throw new Error(`tikwm: play URL tidak valid (${JSON.stringify(videoUrl)})`)
    }

    const resp = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: downloadTimeout,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WangsafBot/1.0)' },
    })
    return { buffer: Buffer.from(resp.data), filename: 'tiktok.mp4', mime: 'video/mp4' }
  } catch (tikwmErr) {
    // ── Fallback: yt-dlp ──────────────────────────────────────────────────
    try {
      return await ytDlpDownload(url, 'mp4', 'video/mp4', 'tiktok')
    } catch (ytDlpErr) {
      throw new Error(
        `TikTok download gagal.\n` +
        `  • tikwm.com: ${tikwmErr.message}\n` +
        `  • yt-dlp   : ${ytDlpErr.message}`
      )
    }
  }
}

/**
 * YouTube MP3 downloader — menggunakan yt-dlp lokal
 */
async function ytmp3Adapter(url) {
  try {
    return await ytDlpDownload(url, 'mp3', 'audio/mpeg', 'audio')
  } catch (err) {
    throw new Error(`YouTube MP3 download gagal: ${err.message}`)
  }
}

/**
 * YouTube MP4 downloader — menggunakan yt-dlp lokal
 */
async function ytmp4Adapter(url) {
  try {
    return await ytDlpDownload(url, 'mp4', 'video/mp4', 'video')
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
