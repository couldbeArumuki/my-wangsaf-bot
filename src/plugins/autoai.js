/**
 * src/plugins/autoai.js
 *
 * Auto AI reply (private chat only) menggunakan Google Gemini via `@google/generative-ai`.
 *
 * Cara pakai singkat:
 * 1) Install dependency: `npm i @google/generative-ai`
 * 2) Set env di `.env`:
 *    - GEMINI_API_KEY=xxxx
 *    - (opsional) GEMINI_MODEL=gemini-2.5-flash
 * 3) Pastikan handler kamu memanggil plugin ini untuk setiap pesan masuk (non-command).
 *
 * Catatan:
 * - Plugin ini menyimpan history percakapan per user (remoteJid) di memory (Map) dan dibatasi 15 pesan.
 * - Sudah ada delay 1–2 detik sebelum balas agar terasa natural.
 * - Ada basic error handling + cooldown agar tidak spam saat error.
 */

require('dotenv').config()

const { GoogleGenerativeAI } = require('@google/generative-ai')

const SYSTEM_PROMPT =
  'Kamu adalah asisten pribadi yang ramah, santai, helpful, dan sedikit humoris bernama Zizou AI. ' +
  'Kamu ngobrol seperti teman dekat tapi sopan. Jawab dalam bahasa Indonesia yang natural dan enak dibaca. ' +
  'Gunakan emoji secukupnya.'

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const API_KEY = process.env.GEMINI_API_KEY

// Map<remoteJid, Array<{ role: 'user'|'model', parts: [{ text: string }] }>>
const historyMap = new Map()

// Anti-spam kalau API error
const errorCooldownMap = new Map() // Map<remoteJid, number>
const ERROR_COOLDOWN_MS = 30_000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pushHistory(jid, role, text) {
  if (!text) return

  const arr = historyMap.get(jid) || []
  arr.push({ role, parts: [{ text }] })

  // Batasi maksimal 15 pesan terakhir
  const trimmed = arr.slice(-15)
  historyMap.set(jid, trimmed)
}

function shouldSkipMessage({ msg, text, jid, isGroup }) {
  if (!jid) return true
  if (isGroup) return true
  if (!text || !text.trim()) return true

  // skip pesan dari bot sendiri
  if (msg?.key?.fromMe) return true

  // skip broadcast/status
  if (jid === 'status@broadcast') return true

  // skip message system/ephemeral yang ga ada konten
  if (!msg?.message) return true

  return false
}

async function sendTypingLike(sock, jid) {
  // Best-effort: kalau method-nya ada, kirim presence
  try {
    if (typeof sock?.sendPresenceUpdate === 'function') {
      await sock.sendPresenceUpdate('composing', jid)
    }
  } catch (_) {
    // ignore
  }
}

async function stopTypingLike(sock, jid) {
  try {
    if (typeof sock?.sendPresenceUpdate === 'function') {
      await sock.sendPresenceUpdate('paused', jid)
    }
  } catch (_) {
    // ignore
  }
}

async function autoAI({ sock, msg, text }) {
  const jid = msg?.key?.remoteJid
  const isGroup = typeof jid === 'string' ? jid.endsWith('@g.us') : false

  if (shouldSkipMessage({ msg, text, jid, isGroup })) return

  // Kalau user lagi pakai command prefix, biarin handler command yang jawab
  // (biar ga dobel balas)
  const prefix = process.env.PREFIX || '.'
  if (text.trim().startsWith(prefix)) return

  if (!API_KEY) {
    // Jangan spam; cukup diam kalau belum diset
    return
  }

  // Error cooldown per user
  const now = Date.now()
  const cooldownUntil = errorCooldownMap.get(jid) || 0
  if (now < cooldownUntil) return

  // Simpan pesan user ke history
  pushHistory(jid, 'user', text)

  const history = historyMap.get(jid) || []

  try {
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: SYSTEM_PROMPT })

    // Delay natural + typing indicator
    const delayMs = 1000 + Math.floor(Math.random() * 1000)
    await sendTypingLike(sock, jid)
    await sleep(delayMs)

    const chat = model.startChat({ history })

    // Optional: tambah sedikit safety biar ga kepanjangan
    const result = await chat.sendMessage(text)
    const replyText = result?.response?.text?.()

    await stopTypingLike(sock, jid)

    if (!replyText || !replyText.trim()) return

    // Simpan jawaban model
    pushHistory(jid, 'model', replyText)

    await sock.sendMessage(jid, { text: replyText }, { quoted: msg })
  } catch (err) {
    await stopTypingLike(sock, jid)

    console.error('[autoAI] Error:', err?.message || err)

    // Set cooldown biar ga spam error tiap message
    errorCooldownMap.set(jid, Date.now() + ERROR_COOLDOWN_MS)

    // Jangan terlalu sering ngasih notif error ke user
    // (tapi sekali-sekali oke, biar user ngerti)
    try {
      await sock.sendMessage(
        jid,
        { text: 'Lagi error pas akses AI-nya 😅 Coba lagi sebentar ya.' },
        { quoted: msg }
      )
    } catch (_) {
      // ignore
    }
  }
}

module.exports = { autoAI }
