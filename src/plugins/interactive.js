/**
 * src/plugins/interactive.js
 * Fitur interaktif gratis siap pakai: suit, tebakangka, quote, afk, poll, remind
 */

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

// ─────────────────────────────────────────────────────────────────────────────
// Kutipan motivasi (static, tidak butuh API)
// ─────────────────────────────────────────────────────────────────────────────

const quotes = [
  '"Jangan tunggu sempurna, mulai dulu." — anon',
  '"Kegagalan bukan akhir, tapi bagian dari perjalanan." — anon',
  '"Setiap hari adalah kesempatan baru untuk menjadi lebih baik." — anon',
  '"Sukses dimulai dari keberanian untuk mencoba." — anon',
  '"Jika lelah, istirahat — bukan menyerah." — anon',
  '"Satu langkah kecil tetap lebih baik dari satu langkah tidak sama sekali." — anon',
  '"Mimpi yang besar dimulai dari langkah yang sederhana." — anon',
  '"Bukan seberapa keras kamu jatuh, tapi seberapa cepat kamu bangkit." — anon',
  '"Bersabarlah — hal baik butuh waktu." — anon',
  '"Dirimu lebih kuat dari yang kamu kira." — anon',
  '"Do what you can, with what you have, where you are." — Theodore Roosevelt',
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"It always seems impossible until it\'s done." — Nelson Mandela',
  '"In the middle of every difficulty lies opportunity." — Albert Einstein',
  '"Success is not final, failure is not fatal: It is the courage to continue that counts." — Winston Churchill',
]

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
    return reply(`😭 Kesempatan habis! Angkanya adalah *${game.number}*. Coba lagi dengan `.tebakangka`.`)
  }

  const hint = input < game.number ? '📈 Terlalu kecil!' : '📉 Terlalu besar!'
  await reply(`${hint} Sisa percobaan: *${7 - game.tries}*`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .quote  (kutipan motivasi acak)
// ─────────────────────────────────────────────────────────────────────────────

async function quote({ reply }) {
  const q = quotes[randomInt(0, quotes.length - 1)]
  await reply(`💬 ${q}`)
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
// Command: .remind  (pengingat sederhana)
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
  if (ms > 3 * 3600 * 1000) {
    return reply('❌ Maksimal pengingat 3 jam (3h).')
  }
  if (!text) {
    return reply('❓ Masukkan pesan pengingat. Contoh: `.remind 5m Balik ke meja`')
  }

  const label = formatDuration(ms)
  await reply(`⏰ Oke! Aku akan ingatkan kamu dalam *${label}*:\n"${text}"`)

  setTimeout(async () => {
    try {
      await sock.sendMessage(jid, { text: `⏰ *Pengingat!*\n\n${text}` }, { quoted: msg })
    } catch (_) { /* abaikan jika gagal kirim */ }
  }, ms)
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
}

// Ekspor internal untuk handler (bukan command pengguna)
module.exports._afkMap = afkMap
