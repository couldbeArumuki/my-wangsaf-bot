/**
 * Auto AI Reply Plugin (Zizou AI) — Groq
 * --------------------------------------
 * Goal:
 * - Otomatis membalas pesan masuk di PRIVATE CHAT tanpa command.
 * - Menggunakan Groq SDK (`groq-sdk`) model: `llama-3.3-70b-versatile`.
 * - Menyimpan history percakapan per user (remoteJid) memakai Map.
 *
 * Cara pakai singkat:
 * 1) Install dependency: `npm i groq-sdk`
 * 2) Set env di `.env`:
 *    - GROQ_API_KEY=xxxx
 * 3) Pastikan message handler utama memanggil `autoAI({ sock, msg, text })`
 *    untuk setiap pesan masuk yang bukan command.
 *
 * Catatan:
 * - History disimpan in-memory (akan hilang saat restart bot).
 * - Max history: 15 messages.
 * - Ada delay 800–1200ms agar terasa natural.
 * - Hanya aktif di private chat (tidak membalas di group).
 */

'use strict';

require('dotenv').config();

const Groq = require('groq-sdk');

const SYSTEM_PROMPT =
  'Kamu adalah Zizou AI, asisten pribadi yang ramah, santai, helpful, dan sedikit humoris. ' +
  'Ngobrol seperti teman dekat tapi sopan. Selalu jawab dalam bahasa Indonesia yang natural dan enak dibaca. ' +
  'Gunakan emoji secukupnya.';

const MODEL = 'llama-3.3-70b-versatile';
const MAX_HISTORY = 15;

// Map<remoteJid, Array<{ role: 'user'|'assistant', content: string }>>
const historyMap = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min = 800, max = 1200) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isGroupJid(jid = '') {
  return typeof jid === 'string' && jid.endsWith('@g.us');
}

function shouldSkipMessage({ msg, text, jid }) {
  if (!jid) return true;
  if (isGroupJid(jid)) return true; // private chat only
  if (jid === 'status@broadcast') return true;

  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) return true;

  // skip pesan dari bot sendiri
  if (msg?.key?.fromMe) return true;

  // skip message system/ephemeral yang ga ada konten
  if (!msg?.message) return true;

  // Kalau user pakai command prefix, biarin handler command yang jawab
  const prefix = process.env.PREFIX || '.';
  if (t.startsWith(prefix)) return true;

  return false;
}

function pushHistory(jid, role, content) {
  if (!content) return;

  const arr = historyMap.get(jid) || [];
  arr.push({ role, content });

  // keep last MAX_HISTORY messages
  if (arr.length > MAX_HISTORY) {
    arr.splice(0, arr.length - MAX_HISTORY);
  }

  historyMap.set(jid, arr);
}

function buildMessages(jid, userText) {
  const history = historyMap.get(jid) || [];

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userText },
  ];
}

async function maybeSendPresence(sock, jid, state) {
  try {
    if (typeof sock?.sendPresenceUpdate === 'function') {
      await sock.sendPresenceUpdate(state, jid);
    }
  } catch (_) {
    // best-effort
  }
}

/**
 * autoAI
 * @param {Object} params
 * @param {import('@whiskeysockets/baileys').WASocket} params.sock
 * @param {any} params.msg
 * @param {string} params.text
 */
async function autoAI({ sock, msg, text }) {
  const jid = msg?.key?.remoteJid;

  if (shouldSkipMessage({ msg, text, jid })) return;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Jangan spam; cukup sekali-kali kasih tau kalau user chat
    await sock.sendMessage(
      jid,
      { text: 'GROQ_API_KEY belum diset ya, Zizou-sama 🙏 Jadi aku belum bisa Auto AI reply.' },
      { quoted: msg }
    );
    return;
  }

  const userText = String(text).trim();

  // Loading message (sesuai requirement)
  await sock.sendMessage(jid, { text: '🤖 Zizou AI sedang mikir...' }, { quoted: msg });

  // Natural delay
  await maybeSendPresence(sock, jid, 'composing');
  await sleep(randomDelay(800, 1200));

  try {
    const groq = new Groq({ apiKey });

    const messages = buildMessages(jid, userText);

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 512,
    });

    const replyText = completion?.choices?.[0]?.message?.content?.trim();

    await maybeSendPresence(sock, jid, 'paused');

    if (!replyText) {
      await sock.sendMessage(
        jid,
        { text: 'Hmm… aku kepikiran tapi jawabannya kosong 😅 Coba ulangin lagi ya, Zizou-sama.' },
        { quoted: msg }
      );
      return;
    }

    // Update history
    pushHistory(jid, 'user', userText);
    pushHistory(jid, 'assistant', replyText);

    await sock.sendMessage(jid, { text: replyText }, { quoted: msg });
  } catch (err) {
    await maybeSendPresence(sock, jid, 'paused');

    // eslint-disable-next-line no-console
    console.error('[autoAI] Error:', err?.message || err);

    await sock.sendMessage(
      jid,
      { text: 'Aduh, ada error pas aku mikir 😵‍💫 Coba beberapa saat lagi ya, Zizou-sama.' },
      { quoted: msg }
    );
  }
}

module.exports = { autoAI };
