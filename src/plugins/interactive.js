/**
 * src/plugins/interactive.js
 * Fitur interaktif gratis siap pakai: suit, tebakangka, quote, afk, poll, remind, timer, todo
 */

const fs = require('fs')
const path = require('path')

// ─────────────────────────────────────────────────────────────────────────────
// Quote dataset (loaded dari file JSON)
// ─────────────────────────────────────────────────────────────────────────────

let quotesData = []
try {
  const quotesPath = path.join(__dirname, '../data/quotes.json')
  quotesData = JSON.parse(fs.readFileSync(quotesPath, 'utf8'))
} catch (_) {
  // fallback ke dataset minimal jika file tidak ada
  quotesData = [
    { text: 'Jangan tunggu sempurna, mulai dulu.', author: 'Pepatah', tag: 'id' },
    { text: 'Pohon yang paling kuat tumbuh di tengah badai.', author: 'Zen', tag: 'jp' },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain', tag: 'en' },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Todo persistence
// ─────────────────────────────────────────────────────────────────────────────

const TODO_PATH = path.join(__dirname, '../data/todos.json')

function loadTodos() {
  try {
    return JSON.parse(fs.readFileSync(TODO_PATH, 'utf8'))
  } catch (_) {
    return {}
  }
}

function saveTodos(data) {
  try {
    const dir = path.dirname(TODO_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(TODO_PATH, JSON.stringify(data, null, 2), 'utf8')
  } catch (_) { /* abaikan error tulis */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// State (in-memory, di-reset setiap restart bot)
// ─────────────────────────────────────────────────────────────────────────────

/** AFK registry: Map<jid, { reason, since }> */
const afkMap = new Map()

/** Tebak angka registry: Map<jid+sender, { number, tries }> */
const guessMap = new Map()

/** Poll registry: Map<pollId, { question, options, votes: Map<sender, idx> }> */
const pollMap = new Map()
let pollCounter = 0

/**
 * Remind registry: Map<remindId, { id, jid, msg, text, ms, createdAt, timeout }>
 * Diakses untuk .remindlist dan .remindcancel
 */
const remindMap = new Map()
let remindCounter = 0

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getSenderJid(msg) {
  return msg.key.participant || msg.key.remoteJid
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s} detik`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} menit`
  const h = Math.floor(m / 60)
  return `${h} jam ${m % 60} menit`
}

// ─────────────────────────────────────────────────────────────────────────────
// AFK: otomatis-hapus status AFK saat user aktif lagi
// ─────────────────────────────────────────────────────────────────────────────
// Command: .afk
// ─────────────────────────────────────────────────────────────────────────────

async function afk({ msg, fullArgs, reply }) {
  const sender = getSenderJid(msg)
  const reason = fullArgs.trim() || 'Tidak ada alasan'
  afkMap.set(sender, { reason, since: Date.now() })
  await reply(`😴 *AFK diaktifkan*\nAlasan: ${reason}\n\nKirim pesan apa saja untuk menonaktifkan AFK.`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .unafk  (manual cancel)
// ─────────────────────────────────────────────────────────────────────────────

async function unafk({ msg, reply }) {
  const sender = getSenderJid(msg)
  if (!afkMap.has(sender)) {
    return reply('ℹ️ Kamu tidak sedang dalam mode AFK.')
  }
  const { reason, since } = afkMap.get(sender)
  afkMap.delete(sender)
  const dur = formatDuration(Date.now() - since)
  await reply(`✅ AFK dinonaktifkan.\nAlasan tadi: ${reason}\nDurasi: ${dur}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .suit  (batu-gunting-kertas)
// ─────────────────────────────────────────────────────────────────────────────

const suitEmoji = { batu: '🪨', gunting: '✂️', kertas: '📄' }
const suitChoices = ['batu', 'gunting', 'kertas']
const suitWins = { batu: 'gunting', gunting: 'kertas', kertas: 'batu' }

async function suit({ args, reply }) {
  const pilihan = args[0]?.toLowerCase()
  if (!suitChoices.includes(pilihan)) {
    return reply('❓ Pilih: `.suit batu`, `.suit gunting`, atau `.suit kertas`')
  }
  const bot = suitChoices[randomInt(0, 2)]
  let result
  if (pilihan === bot) result = '🤝 *Seri!*'
  else if (suitWins[pilihan] === bot) result = '🎉 *Kamu menang!*'
  else result = '😈 *Bot menang!*'

  await reply(
    `🎮 *Batu Gunting Kertas*\n\n` +
    `Kamu : ${suitEmoji[pilihan]} ${pilihan}\n` +
    `Bot  : ${suitEmoji[bot]} ${bot}\n\n` +
    result
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .tebakangka  (mulai/tebak)
// ─────────────────────────────────────────────────────────────────────────────

async function tebakangka({ msg, jid, args, reply }) {
  const sender = getSenderJid(msg)
  const key = `${jid}:${sender}`
  const input = parseInt(args[0])

  // Jika belum ada game aktif, mulai game baru
  if (!guessMap.has(key)) {
    const number = randomInt(1, 100)
    guessMap.set(key, { number, tries: 0 })
    return reply('🎲 Aku lagi pikirkan sebuah angka antara *1–100*. Coba tebak!\nKetik `.tebakangka <angka>` untuk menebak.')
  }

  // Ada game aktif — proses tebakan
  if (isNaN(input) || input < 1 || input > 100) {
    return reply('❓ Masukkan angka valid antara 1–100. Contoh: `.tebakangka 50`')
  }

  const game = guessMap.get(key)
  game.tries++

  if (input === game.number) {
    guessMap.delete(key)
    return reply(`🎉 *Benar!* Angkanya memang *${game.number}*.\nKamu menebak dalam *${game.tries}* percobaan. Hebat!`)
  }

  if (game.tries >= 7) {
    guessMap.delete(key)
    return reply(`😭 Kesempatan habis! Angkanya adalah *${game.number}*. Coba lagi dengan \`.tebakangka\`.`)
  }

  const hint = input < game.number ? '📈 Terlalu kecil!' : '📉 Terlalu besar!'
  await reply(`${hint} Sisa percobaan: *${7 - game.tries}*`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .quote  (kutipan motivasi)
// Sintaks: .quote [jp|id|en|<kata-kunci>]
// ─────────────────────────────────────────────────────────────────────────────

async function quote({ args, reply }) {
  const filter = args[0]?.toLowerCase()

  let pool = quotesData
  if (filter === 'jp') {
    pool = quotesData.filter((q) => q.tag === 'jp')
  } else if (filter === 'id') {
    pool = quotesData.filter((q) => q.tag === 'id')
  } else if (filter === 'en') {
    pool = quotesData.filter((q) => q.tag === 'en')
  } else if (filter) {
    // Cari berdasarkan kata kunci di text atau author
    const kw = filter
    pool = quotesData.filter(
      (q) => q.text.toLowerCase().includes(kw) || q.author.toLowerCase().includes(kw)
    )
    if (pool.length === 0) {
      return reply(`❓ Tidak ada quote dengan kata kunci "*${args[0]}*".\nFilter yang tersedia: \`jp\`, \`id\`, \`en\``)
    }
  }

  const q = pool[randomInt(0, pool.length - 1)]
  await reply(`💬 *"${q.text}"*\n\n— _${q.author}_`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .poll  (buat polling sederhana)
// Sintaks: .poll "Pertanyaan" | Opsi1 | Opsi2 | Opsi3
// ─────────────────────────────────────────────────────────────────────────────

async function poll({ jid, fullArgs, reply }) {
  const parts = fullArgs.split('|').map((s) => s.trim()).filter(Boolean)
  if (parts.length < 3) {
    return reply(
      '❓ Format:\n`.poll Pertanyaan | Opsi1 | Opsi2 | ...`\n\nContoh:\n`.poll Mau makan apa? | Nasi | Mie | Roti`'
    )
  }

  const [question, ...options] = parts
  if (options.length > 10) return reply('❌ Maksimal 10 opsi per poll.')

  pollCounter++
  const pollId = `${jid}:${pollCounter}`
  pollMap.set(pollId, { question, options, votes: new Map(), createdAt: Date.now() })

  const optLines = options.map((o, i) => `  ${i + 1}. ${o}`).join('\n')
  await reply(
    `📊 *Poll #${pollCounter}: ${question}*\n\n${optLines}\n\n` +
    `Ketik \`.vote ${pollCounter} <nomor>\` untuk memilih.\n` +
    `Ketik \`.pollresult ${pollCounter}\` untuk lihat hasil.`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .vote  (vote di poll)
// Sintaks: .vote <pollId> <nomorOpsi>
// ─────────────────────────────────────────────────────────────────────────────

async function vote({ msg, jid, args, reply }) {
  const [idStr, numStr] = args
  const id = parseInt(idStr)
  const num = parseInt(numStr)
  const pollId = `${jid}:${id}`

  if (isNaN(id) || !pollMap.has(pollId)) {
    return reply(`❓ Poll #${idStr} tidak ditemukan di grup ini.`)
  }

  const pollData = pollMap.get(pollId)
  if (isNaN(num) || num < 1 || num > pollData.options.length) {
    return reply(`❓ Nomor opsi tidak valid. Masukkan antara 1–${pollData.options.length}.`)
  }

  const sender = getSenderJid(msg)
  const oldVote = pollData.votes.get(sender)
  pollData.votes.set(sender, num - 1)

  if (oldVote !== undefined && oldVote !== num - 1) {
    await reply(`✅ Vote kamu diubah ke opsi *${num}. ${pollData.options[num - 1]}*`)
  } else if (oldVote === undefined) {
    await reply(`✅ Vote kamu tercatat: *${num}. ${pollData.options[num - 1]}*`)
  } else {
    await reply(`ℹ️ Kamu sudah memilih opsi ini sebelumnya.`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .pollresult  (tampilkan hasil poll)
// Sintaks: .pollresult <pollId>
// ─────────────────────────────────────────────────────────────────────────────

async function pollresult({ jid, args, reply }) {
  const id = parseInt(args[0])
  const pollId = `${jid}:${id}`

  if (isNaN(id) || !pollMap.has(pollId)) {
    return reply(`❓ Poll #${args[0]} tidak ditemukan di grup ini.`)
  }

  const { question, options, votes } = pollMap.get(pollId)
  // Hitung suara dalam satu pass (O(m) dimana m = jumlah pemilih)
  const counts = new Array(options.length).fill(0)
  for (const voteIdx of votes.values()) counts[voteIdx]++
  const total = counts.reduce((a, b) => a + b, 0)

  const bars = options.map((opt, i) => {
    const pct = total === 0 ? 0 : Math.round((counts[i] / total) * 100)
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10))
    return `  ${i + 1}. ${opt}\n     ${bar} ${pct}% (${counts[i]} suara)`
  })

  await reply(
    `📊 *Hasil Poll #${id}: ${question}*\n\n${bars.join('\n\n')}\n\nTotal pemilih: ${total}`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .remind  (pengingat dengan ID agar bisa di-list/cancel)
// Sintaks: .remind <waktu> <pesan>
// Contoh : .remind 10m Minum obat
//          .remind 30s Balik ke meja
//          .remind 1h Meeting
// ─────────────────────────────────────────────────────────────────────────────

function parseTime(str) {
  const m = str.match(/^(\d+)(s|m|h)$/i)
  if (!m) return null
  const val = parseInt(m[1])
  const unit = m[2].toLowerCase()
  if (unit === 's') return val * 1000
  if (unit === 'm') return val * 60 * 1000
  if (unit === 'h') return val * 3600 * 1000
  return null
}

async function remind({ sock, jid, msg, args, reply }) {
  const [timeStr, ...textArr] = args
  const text = textArr.join(' ').trim()

  const ms = parseTime(timeStr || '')
  if (!ms) {
    return reply('❓ Format: `.remind <waktu> <pesan>`\nContoh: `.remind 10m Minum obat`\nSatuan: `s` (detik), `m` (menit), `h` (jam)')
  }
  if (ms > 24 * 3600 * 1000) {
    return reply('❌ Maksimal pengingat 24 jam (24h).')
  }
  if (!text) {
    return reply('❓ Masukkan pesan pengingat. Contoh: `.remind 5m Balik ke meja`')
  }

  remindCounter++
  const id = remindCounter
  const label = formatDuration(ms)
  const createdAt = Date.now()

  const timeoutHandle = setTimeout(async () => {
    remindMap.delete(id)
    try {
      await sock.sendMessage(jid, { text: `⏰ *Pengingat #${id}!*\n\n${text}` }, { quoted: msg })
    } catch (_) { /* abaikan jika gagal kirim */ }
  }, ms)

  remindMap.set(id, { id, jid, text, ms, createdAt, timeoutHandle })

  await reply(`⏰ Pengingat *#${id}* diset!\nKamu akan diingatkan dalam *${label}*:\n"${text}"\n\nKetik \`.remindlist\` untuk lihat semua pengingat aktif.`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .remindlist  (tampilkan pengingat aktif)
// ─────────────────────────────────────────────────────────────────────────────

async function remindlist({ reply }) {
  if (remindMap.size === 0) {
    return reply('ℹ️ Tidak ada pengingat aktif saat ini.')
  }

  const lines = ['⏰ *Pengingat Aktif:*\n']
  for (const { id, text, ms, createdAt } of remindMap.values()) {
    const elapsed = Date.now() - createdAt
    const remaining = Math.max(0, ms - elapsed)
    lines.push(`*#${id}* — "${text}"\n  Tersisa: ${formatDuration(remaining)}`)
  }
  lines.push(`\nKetik \`.remindcancel <id>\` untuk membatalkan.`)
  await reply(lines.join('\n'))
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .remindcancel <id>  (batalkan pengingat)
// ─────────────────────────────────────────────────────────────────────────────

async function remindcancel({ args, reply }) {
  const id = parseInt(args[0])
  if (isNaN(id)) {
    return reply('❓ Format: `.remindcancel <id>`\nContoh: `.remindcancel 3`')
  }

  if (!remindMap.has(id)) {
    return reply(`❓ Pengingat *#${id}* tidak ditemukan atau sudah selesai.`)
  }

  const { timeoutHandle, text } = remindMap.get(id)
  clearTimeout(timeoutHandle)
  remindMap.delete(id)

  await reply(`✅ Pengingat *#${id}* ("${text}") telah dibatalkan.`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .timer <detik>  (hitung mundur sederhana)
// Contoh : .timer 30
// ─────────────────────────────────────────────────────────────────────────────

async function timer({ sock, jid, msg, args, reply }) {
  const sec = parseInt(args[0])
  if (isNaN(sec) || sec < 1) {
    return reply('❓ Format: `.timer <detik>`\nContoh: `.timer 30`\nMaksimal 3600 detik (1 jam).')
  }
  if (sec > 3600) {
    return reply('❌ Maksimal timer 3600 detik (1 jam).')
  }

  await reply(`⏱️ Timer *${sec} detik* dimulai!`)

  setTimeout(async () => {
    try {
      await sock.sendMessage(jid, { text: `🔔 *Timer selesai!* (${sec} detik)` }, { quoted: msg })
    } catch (_) { /* abaikan jika gagal kirim */ }
  }, sec * 1000)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .todo  (to-do list per user, disimpan ke disk)
// Sintaks:
//   .todo add <teks>       — tambah item
//   .todo list             — tampilkan semua item
//   .todo done <id>        — tandai selesai
//   .todo del <id>         — hapus item
// ─────────────────────────────────────────────────────────────────────────────

async function todo({ msg, args, reply }) {
  const sender = getSenderJid(msg)
  const [sub, ...rest] = args
  const subCmd = sub?.toLowerCase()

  const todos = loadTodos()
  if (!todos[sender]) todos[sender] = []
  const userTodos = todos[sender]

  if (subCmd === 'add') {
    const text = rest.join(' ').trim()
    if (!text) return reply('❓ Format: `.todo add <teks>`')
    const id = userTodos.length > 0 ? userTodos.reduce((max, t) => t.id > max ? t.id : max, 0) + 1 : 1
    userTodos.push({ id, text, done: false, createdAt: new Date().toISOString() })
    todos[sender] = userTodos
    saveTodos(todos)
    return reply(`✅ Todo *#${id}* ditambahkan:\n"${text}"`)
  }

  if (subCmd === 'list') {
    if (userTodos.length === 0) return reply('📋 To-do list kamu kosong.\nTambah dengan `.todo add <teks>`')
    const lines = ['📋 *To-Do List kamu:*\n']
    for (const t of userTodos) {
      const icon = t.done ? '✅' : '⬜'
      lines.push(`${icon} *#${t.id}* ${t.done ? '~' + t.text + '~' : t.text}`)
    }
    lines.push('\n`.todo done <id>` — tandai selesai | `.todo del <id>` — hapus')
    return reply(lines.join('\n'))
  }

  if (subCmd === 'done') {
    const id = parseInt(rest[0])
    if (isNaN(id)) return reply('❓ Format: `.todo done <id>`')
    const item = userTodos.find((t) => t.id === id)
    if (!item) return reply(`❓ Todo *#${id}* tidak ditemukan.`)
    if (item.done) return reply(`ℹ️ Todo *#${id}* sudah ditandai selesai.`)
    item.done = true
    saveTodos(todos)
    return reply(`✅ Todo *#${id}* ditandai selesai: "${item.text}"`)
  }

  if (subCmd === 'del') {
    const id = parseInt(rest[0])
    if (isNaN(id)) return reply('❓ Format: `.todo del <id>`')
    const idx = userTodos.findIndex((t) => t.id === id)
    if (idx === -1) return reply(`❓ Todo *#${id}* tidak ditemukan.`)
    const [removed] = userTodos.splice(idx, 1)
    saveTodos(todos)
    return reply(`🗑️ Todo *#${id}* dihapus: "${removed.text}"`)
  }

  await reply(
    '📋 *Perintah .todo:*\n\n' +
    '  `.todo add <teks>` — tambah item baru\n' +
    '  `.todo list`        — tampilkan semua item\n' +
    '  `.todo done <id>`   — tandai item selesai\n' +
    '  `.todo del <id>`    — hapus item'
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  afk,
  unafk,
  suit,
  tebakangka,
  quote,
  poll,
  vote,
  pollresult,
  remind,
  remindlist,
  remindcancel,
  timer,
  todo,
}

// Ekspor internal untuk handler (bukan command pengguna)
module.exports._afkMap = afkMap
