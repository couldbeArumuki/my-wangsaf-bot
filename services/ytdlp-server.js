#!/usr/bin/env node
/**
 * yt-dlp HTTP microservice
 * Wraps the yt-dlp binary to provide YouTube and TikTok downloads.
 *
 * Prasyarat:
 *   pip install yt-dlp          (atau: pip3 install yt-dlp)
 *   ffmpeg terinstall di PATH   (untuk mux video+audio MP4)
 *
 * Jalankan: node services/ytdlp-server.js
 *   atau:   npm run ytdlp-service
 *
 * Konfigurasi via environment:
 *   YTDLP_PORT    — port server (default: 3001)
 *   YTDLP_TIMEOUT — timeout download dalam ms (default: 120000)
 *
 * Endpoints:
 *   GET /health                          → { status: 'ok' }
 *   GET /download?url=<url>&format=mp3  → file audio MP3
 *   GET /download?url=<url>&format=mp4  → file video MP4
 */
'use strict'

const http = require('http')
const { execFile } = require('child_process')
const { URL } = require('url')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

const PORT = parseInt(process.env.YTDLP_PORT || '3001', 10)
const TIMEOUT_MS = parseInt(process.env.YTDLP_TIMEOUT || '120000', 10)

/**
 * Jalankan yt-dlp, simpan ke file sementara, return path + metadata.
 * @param {string} url
 * @param {'mp3'|'mp4'} format
 * @returns {Promise<{tmpPath: string, mime: string, filename: string}>}
 */
function runYtDlp(url, format) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex')
    // Gunakan template %(ext)s supaya yt-dlp isi ekstensi otomatis
    const template = path.join(os.tmpdir(), `ytdlp_${id}.%(ext)s`)

    let args, mime, filename
    if (format === 'mp3') {
      args = [
        '-x', '--audio-format', 'mp3',
        '--no-playlist', '--no-progress', '--no-warnings',
        '-o', template,
        url,
      ]
      mime = 'audio/mpeg'
      filename = 'audio.mp3'
    } else {
      args = [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '--no-playlist', '--no-progress', '--no-warnings',
        '-o', template,
        url,
      ]
      mime = 'video/mp4'
      filename = 'video.mp4'
    }

    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout setelah ${TIMEOUT_MS / 1000}s — video mungkin terlalu besar`))
    }, TIMEOUT_MS)

    execFile('yt-dlp', args, { maxBuffer: 5 * 1024 * 1024 }, (err, _stdout, stderr) => {
      clearTimeout(timeoutId)

      if (err) {
        const detail = (stderr || err.message).slice(-500)
        return reject(new Error(`yt-dlp gagal: ${detail}`))
      }

      // Cari file hasil dengan prefix yang cocok
      const prefix = `ytdlp_${id}.`
      let found
      try {
        found = fs.readdirSync(os.tmpdir()).find((f) => f.startsWith(prefix))
      } catch (readErr) {
        return reject(new Error(`Gagal membaca tmpdir: ${readErr.message}`))
      }

      if (found) {
        return resolve({ tmpPath: path.join(os.tmpdir(), found), mime, filename })
      }
      reject(new Error('File output yt-dlp tidak ditemukan setelah download'))
    })
  })
}

const server = http.createServer(async (req, res) => {
  let parsedUrl
  try {
    parsedUrl = new URL(req.url, `http://localhost:${PORT}`)
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'URL request tidak valid' }))
  }

  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ status: 'ok' }))
  }

  if (parsedUrl.pathname !== '/download') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan' }))
  }

  const url = parsedUrl.searchParams.get('url')
  const format = parsedUrl.searchParams.get('format') || 'mp4'

  if (!url) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Parameter url diperlukan' }))
  }

  if (!['mp3', 'mp4'].includes(format)) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Format harus mp3 atau mp4' }))
  }

  let tmpPath = null
  try {
    const result = await runYtDlp(url, format)
    tmpPath = result.tmpPath

    const stat = fs.statSync(tmpPath)
    res.writeHead(200, {
      'Content-Type': result.mime,
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    })

    const readStream = fs.createReadStream(tmpPath)
    readStream.pipe(res)
    readStream.on('end', () => {
      fs.unlink(tmpPath, () => {})
    })
    readStream.on('error', (streamErr) => {
      console.error('[ytdlp-server] Stream error:', streamErr.message)
      if (!res.writableEnded) res.end()
      fs.unlink(tmpPath, () => {})
    })
  } catch (err) {
    if (tmpPath) fs.unlink(tmpPath, () => {})
    console.error('[ytdlp-server] Error:', err.message)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  }
})

server.on('error', (err) => {
  console.error('[ytdlp-server] Server error:', err.message)
})

server.listen(PORT, () => {
  console.log(`[ytdlp-server] Berjalan di http://localhost:${PORT}`)
  console.log('[ytdlp-server] Endpoint: GET /download?url=<url>&format=mp3|mp4')
  console.log('[ytdlp-server] Health:   GET /health')
})
