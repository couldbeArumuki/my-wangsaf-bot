/**
 * src/plugins/fun.js
 * Fitur fun gratis: 8ball, coinflip, dice, choose, ship, rank/top
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem(arr) {
  return arr[randomInt(0, arr.length - 1)]
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .8ball <pertanyaan>
// ─────────────────────────────────────────────────────────────────────────────

const EIGHTBALL_ANSWERS = [
  // Positif
  '🟢 Pasti ya!',
  '🟢 Tanpa diragukan lagi.',
  '🟢 Sepertinya iya.',
  '🟢 Tanda-tanda mengatakan ya.',
  '🟢 Iya, definitif.',
  '🟢 Pandanganku positif.',
  '🟢 Ya, tentu saja!',
  '🟢 Kamu bisa mengandalkannya.',
  // Netral
  '🟡 Tanya lagi nanti.',
  '🟡 Lebih baik tidak berharap dulu.',
  '🟡 Tidak bisa diprediksi sekarang.',
  '🟡 Fokus dulu dan tanya lagi.',
  // Negatif
  '🔴 Jangan terlalu bergantung pada itu.',
  '🔴 Pandanganku tidak bagus.',
  '🔴 Sangat meragukan.',
  '🔴 Tidak.',
  '🔴 Jawabanku tidak.',
  '🔴 Kemungkinan kecil.',
]

async function eightball({ fullArgs, reply }) {
  const question = fullArgs.trim()
  if (!question) {
    return reply('❓ Format: `.8ball <pertanyaan>`\nContoh: `.8ball Apa aku akan sukses?`')
  }
  const answer = randomItem(EIGHTBALL_ANSWERS)
  await reply(`🎱 *Magic 8-Ball*\n\nPertanyaan: _${question}_\n\nJawaban: ${answer}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .coinflip
// ─────────────────────────────────────────────────────────────────────────────

async function coinflip({ reply }) {
  const result = Math.random() < 0.5 ? '🪙 *HEADS* (Angka)' : '🪙 *TAILS* (Gambar)'
  await reply(`🪙 *Coin Flip!*\n\nHasil: ${result}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .dice [sisi]
// ─────────────────────────────────────────────────────────────────────────────

async function dice({ args, reply }) {
  const sides = parseInt(args[0]) || 6
  if (sides < 2 || sides > 100) {
    return reply('❌ Jumlah sisi dadu harus antara 2–100.\nContoh: `.dice` (6 sisi) atau `.dice 20`')
  }
  const result = randomInt(1, sides)
  await reply(`🎲 *Lempar Dadu ${sides} Sisi!*\n\nHasil: *${result}*`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .choose <a | b | c | ...>
// ─────────────────────────────────────────────────────────────────────────────

async function choose({ fullArgs, reply }) {
  const raw = fullArgs.trim()
  if (!raw) {
    return reply('❓ Format: `.choose <pilihan1> | <pilihan2> | ...`\nContoh: `.choose Nasi | Mie | Roti`')
  }
  const options = raw.split('|').map((s) => s.trim()).filter(Boolean)
  if (options.length < 2) {
    return reply('❓ Minimal 2 pilihan, pisahkan dengan `|`.\nContoh: `.choose Nasi | Mie | Roti`')
  }
  const picked = randomItem(options)
  await reply(`🎯 *Bot Memilih!*\n\nDari: ${options.map((o) => `_${o}_`).join(', ')}\n\n➜ *${picked}*`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .ship <nama1> <nama2>
// ─────────────────────────────────────────────────────────────────────────────

const SHIP_COMMENTS = [
  'Cocok banget, seperti nasi dan lauk!',
  'Wah, chemistry-nya kuat!',
  'Hmm, perlu sedikit usaha, tapi bisa jalan!',
  'Takdir sudah berbicara. Mereka sesuai!',
  'Cukup oke, dengan sedikit komunikasi bisa lebih baik.',
  'Seperti langit dan bumi — beda tapi saling melengkapi!',
  'Mereka ibarat dua sisi koin yang sama.',
  'Ada spark di sini!',
  'Kalau dicoba, siapa tahu berhasil?',
  'Kombinasi yang unik — menarik untuk dijalankan!',
]

async function ship({ args, fullArgs, reply }) {
  // Support both "name1 name2" and "name1 | name2"
  let names
  if (fullArgs.includes('|')) {
    names = fullArgs.split('|').map((s) => s.trim()).filter(Boolean)
  } else {
    names = args.filter(Boolean)
  }

  if (names.length < 2) {
    return reply('❓ Format: `.ship <nama1> <nama2>`\nContoh: `.ship Andi Budi`')
  }

  const [name1, name2] = [names[0], names[1]]
  const score = randomInt(0, 100)
  const bar = '❤️'.repeat(Math.round(score / 10)) + '🖤'.repeat(10 - Math.round(score / 10))
  const comment = randomItem(SHIP_COMMENTS)

  await reply(
    `💞 *Ship Meter*\n\n` +
    `👤 *${name1}* + *${name2}*\n\n` +
    `${bar}\n` +
    `Skor kompatibilitas: *${score}%*\n\n` +
    `💬 ${comment}`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: .rank / .top  (leaderboard acak ephemeral untuk grup)
// ─────────────────────────────────────────────────────────────────────────────

const RANK_TITLES = [
  '🏆 Juara 1',
  '🥈 Juara 2',
  '🥉 Juara 3',
  '4️⃣ Peringkat 4',
  '5️⃣ Peringkat 5',
]

const RANK_DESCRIPTIONS = [
  'The Unbeatable Legend',
  'Rising Star',
  'The Consistent One',
  'Hidden Gem',
  'The Comeback Kid',
]

async function rank({ sock, jid, isGroup, reply }) {
  if (!isGroup) {
    return reply('ℹ️ Command `.rank` hanya bisa digunakan di grup.')
  }

  let members = []
  try {
    const metadata = await sock.groupMetadata(jid)
    members = metadata.participants || []
  } catch (_) {
    return reply('❌ Gagal mengambil data grup. Coba lagi.')
  }

  if (members.length < 2) {
    return reply('ℹ️ Butuh minimal 2 member di grup untuk menampilkan leaderboard.')
  }

  // Shuffle members dan ambil 5 (atau semua kalau < 5)
  const shuffled = [...members].sort(() => Math.random() - 0.5)
  const top = shuffled.slice(0, Math.min(5, shuffled.length))

  const lines = ['🏆 *Leaderboard Grup (Acak Harian)*\n']
  top.forEach((member, i) => {
    const num = member.id.split('@')[0]
    const title = RANK_TITLES[i] || `${i + 1}️⃣ Peringkat ${i + 1}`
    const desc = RANK_DESCRIPTIONS[i] || 'Member Aktif'
    lines.push(`${title}: @${num}\n   ✨ _${desc}_`)
  })

  lines.push('\n_⚠️ Leaderboard ini acak dan berubah setiap kali dipanggil. Murni hiburan!_')

  await sock.sendMessage(
    jid,
    {
      text: lines.join('\n'),
      mentions: top.map((m) => m.id),
    }
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  '8ball': eightball,
  coinflip,
  dice,
  choose,
  ship,
  rank,
  top: rank,
}
