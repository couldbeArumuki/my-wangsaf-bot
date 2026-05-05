const axios = require('axios')
const { execFile } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')
const os = require('os')

const execFileAsync = promisify(execFile)

// WhatsApp file size limit (bytes)
const MAX_WA_SIZE = 64 * 1024 * 1024

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
 * Kembalikan path ke binary ffmpeg.
 * Bisa dikonfigurasi via env FFMPEG_PATH.
 * Jika tidak diset, diasumsikan `ffmpeg` sudah ada di PATH.
 */
function getFfmpegPath() {
  return process.env.FFMPEG_PATH || 'ffmpeg'
}

/**
 * Kembalikan direktori yang berisi ffmpeg (untuk --ffmpeg-location yt-dlp).
 * Jika FFMPEG_PATH tidak diset, kembalikan null.
 */
function getFfmpegDir() {
  const fp = process.env.FFMPEG_PATH
  if (fp) return path.dirname(fp)
  return null
}

/**
 * Log debug hanya jika DEBUG_DOWNLOAD=1
 */
function debugLog(...args) {
  if (process.env.DEBUG_DOWNLOAD === '1') {
    console.log('[DEBUG_DOWNLOAD]', ...args)
  }
}

/**
 * Transcode video ke format yang kompatibel dengan WhatsApp:
 * - H.264 (baseline), yuv420p
 * - AAC stereo
 * - -movflags +faststart (untuk streaming)
 * - Scale ke maksimal YTMP4_MAX_HEIGHT (default 720p)
 *
 * @param {string} inputFile  - Path file input
 * @param {string} outputFile - Path file output (akan di-overwrite)
 */
async function transcodeForWhatsApp(inputFile, outputFile) {
  const ffmpeg = getFfmpegPath()
  const maxHeight = parseInt(process.env.YTMP4_MAX_HEIGHT) || 720
  const crf = parseInt(process.env.YTMP4_CRF) || 28
  // Transcode biasanya butuh waktu 2x dari proses download (encoding lebih lambat dari download)
  const timeout = (parseInt(process.env.DOWNLOAD_TIMEOUT) || 120000) * 2

  // Scale ke maxHeight jika lebih tinggi; pastikan dimensi genap; format yuv420p
  const scaleFilter = `scale=-2:'min(${maxHeight},ih)',format=yuv420p`

  const args = [
    '-y',
    '-i', inputFile,
    '-vf', scaleFilter,
    '-c:v', 'libx264',
    '-profile:v', 'baseline',
    '-level:v', '3.1',
    '-preset', 'veryfast',
    '-crf', String(crf),
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',
    '-movflags', '+faststart',
    outputFile,
  ]

  debugLog('ffmpeg transcode args:', args.join(' '))

  try {
    const { stderr } = await execFileAsync(ffmpeg, args, { timeout })
    if (stderr) debugLog('ffmpeg stderr:', stderr)
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        `ffmpeg tidak ditemukan. Install dulu atau set FFMPEG_PATH di .env.\n` +
        `Windows: winget install Gyan.FFmpeg\n` +
        `Linux/Mac: apt install ffmpeg  atau  brew install ffmpeg`
      )
    }
    throw new Error(`ffmpeg transcode error: ${err.stderr || err.message}`)
  }
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

  // Jika FFMPEG_PATH diset, beritahu yt-dlp lokasi ffmpeg (untuk merge & extract)
  const ffmpegDir = getFfmpegDir()
  if (ffmpegDir) {
    args.splice(args.length - 1, 0, '--ffmpeg-location', ffmpegDir)
    debugLog('Menggunakan --ffmpeg-location:', ffmpegDir)
  }

  debugLog('yt-dlp args:', [ytdlp, ...args].join(' '))

  try {
    const { stderr } = await execFileAsync(ytdlp, args, { timeout })
    if (stderr) debugLog('yt-dlp stderr:', stderr)
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
  debugLog('File hasil download:', outFile, `(${fs.statSync(outFile).size} bytes)`)

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
 * YouTube MP4 downloader — menggunakan yt-dlp lokal.
 * Jika YTMP4_TRANSCODE=1 (default: aktif), video akan di-transcode ke format
 * WhatsApp-compatible (H.264/AAC/faststart) sebelum dikirim.
 */
async function ytmp4Adapter(url) {
  const tmpDir = os.tmpdir()
  const ts = Date.now()
  const RAW_PREFIX = `video_raw_${ts}`
  const tmpBase = path.join(tmpDir, `video_wa_${ts}`)
  const rawBase = path.join(tmpDir, RAW_PREFIX)

  try {
    // 1. Download via yt-dlp ke file sementara
    const ytdlp = getYtDlpPath()
    const timeout = parseInt(process.env.DOWNLOAD_TIMEOUT) || 120000
    const outTemplate = `${rawBase}.%(ext)s`

    let dlArgs = [
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '-o', outTemplate,
      '--no-playlist',
      '--no-warnings',
      url,
    ]

    const ffmpegDir = getFfmpegDir()
    if (ffmpegDir) {
      dlArgs.splice(dlArgs.length - 1, 0, '--ffmpeg-location', ffmpegDir)
      debugLog('Menggunakan --ffmpeg-location:', ffmpegDir)
    }

    debugLog('yt-dlp download args:', [ytdlp, ...dlArgs].join(' '))

    try {
      const { stderr } = await execFileAsync(ytdlp, dlArgs, { timeout })
      if (stderr) debugLog('yt-dlp stderr:', stderr)
    } catch (err) {
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

    const rawFiles = fs.readdirSync(tmpDir).filter((f) => f.startsWith(path.basename(rawBase)))
    if (rawFiles.length === 0) throw new Error('yt-dlp selesai tapi file output tidak ditemukan')
    const rawFile = path.join(tmpDir, rawFiles[0])
    debugLog('Raw download:', rawFile, `(${fs.statSync(rawFile).size} bytes)`)

    // 2. Transcode ke format WhatsApp-compatible (aktif secara default, nonaktifkan dengan YTMP4_TRANSCODE=0)
    const shouldTranscode = process.env.YTMP4_TRANSCODE !== '0'
    let finalFile = rawFile

    if (shouldTranscode) {
      const transcodeOut = `${tmpBase}.mp4`
      debugLog('Transcoding ke WhatsApp-compatible MP4...')
      try {
        await transcodeForWhatsApp(rawFile, transcodeOut)
        // Hapus file raw setelah transcode sukses
        try { fs.unlinkSync(rawFile) } catch (_) { /* abaikan */ }
        finalFile = transcodeOut
        debugLog('Transcode selesai:', finalFile, `(${fs.statSync(finalFile).size} bytes)`)
      } catch (transcodeErr) {
        // Jika transcode gagal, gunakan file raw sebagai fallback
        debugLog('Transcode gagal, menggunakan file raw:', transcodeErr.message)
        finalFile = rawFile
      }
    }

    // 3. Cek ukuran file (WhatsApp limit ~64 MB)
    const fileSize = fs.statSync(finalFile).size
    if (fileSize > MAX_WA_SIZE) {
      throw new Error(
        `File terlalu besar untuk dikirim via WhatsApp (${Math.round(fileSize / 1024 / 1024)} MB, maks ~64 MB).\n` +
        `Coba video yang lebih pendek atau gunakan .ytmp3 untuk audio saja.`
      )
    }

    try {
      const buffer = fs.readFileSync(finalFile)
      return { buffer, filename: 'video.mp4', mime: 'video/mp4' }
    } finally {
      try { fs.unlinkSync(finalFile) } catch (_) { /* abaikan */ }
    }
  } catch (err) {
    // Bersihkan file sementara jika ada
    try {
      const leftover = fs.readdirSync(tmpDir).filter((f) =>
        f.startsWith(path.basename(tmpBase)) || f.startsWith(RAW_PREFIX)
      )
      for (const f of leftover) {
        try { fs.unlinkSync(path.join(tmpDir, f)) } catch (_) { /* abaikan */ }
      }
    } catch (_) { /* abaikan */ }
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
