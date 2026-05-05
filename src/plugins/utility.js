const { formatUptime } = require('../lib/utils')
const config = require('../../config')

// Daftar semua command beserta deskripsinya untuk ditampilkan di .menu
const menuList = {
  // Utility
  ping: 'Cek apakah bot aktif',
  runtime: 'Lihat sudah berapa lama bot berjalan',
  owner: 'Tampilkan info owner bot',
  menu: 'Tampilkan daftar semua command',
  help: 'Alias dari .menu',

  // Group admin
  tagall: 'Tag semua member grup (admin only)',
  kick: 'Keluarkan member (admin only, reply/mention)',
  add: 'Tambah member ke grup (admin only)',
  promote: 'Jadikan member sebagai admin (admin only)',
  demote: 'Cabut status admin member (admin only)',

  // Downloader
  tiktok: 'Download video TikTok tanpa watermark',
  ytmp3: 'Download audio dari YouTube',
  ytmp4: 'Download video dari YouTube (WhatsApp-compatible)',

  // Sticker
  sticker: 'Buat sticker dari gambar/video (reply media)',
  toimg: 'Konversi sticker ke gambar (reply sticker)',

  // Text tools
  tts: 'Text-to-speech (reply atau ketik pesan)',
  say: 'Bot ngomong sesuatu (Google TTS)',

  // Interaktif
  suit: 'Main batu-gunting-kertas melawan bot',
  tebakangka: 'Tebak angka 1–100 (ketik lagi untuk menebak)',
  quote: 'Kutipan motivasi acak (filter: jp/id/en/philosophy)',
  afk: 'Set status AFK dengan alasan (opsional)',
  unafk: 'Batalkan status AFK secara manual',
  poll: 'Buat polling di grup',
  vote: 'Vote di polling yang aktif',
  pollresult: 'Lihat hasil polling',
  remind: 'Set pengingat (contoh: .remind 10m Minum obat)',
  remindlist: 'Lihat daftar pengingat aktif',
  remindcancel: 'Batalkan pengingat (contoh: .remindcancel 2)',
  timer: 'Hitung mundur (contoh: .timer 30)',
  todo: 'To-do list: add/list/done/del',

  // Fun
  '8ball': 'Magic 8-ball (contoh: .8ball Apa aku akan sukses?)',
  coinflip: 'Lempar koin (heads/tails)',
  dice: 'Lempar dadu (contoh: .dice 20)',
  choose: 'Pilih acak dari opsi (contoh: .choose Nasi | Mie)',
  ship: 'Cek kompatibilitas dua orang (contoh: .ship Andi Budi)',
  rank: 'Leaderboard acak grup (ephemeral, hiburan)',
  top: 'Alias dari .rank',
}

async function ping({ reply }) {
  const start = Date.now()
  await reply('🏓 Pong!')
  const latency = Date.now() - start
  await reply(`⚡ Latency: ${latency}ms`)
}

async function runtime({ reply }) {
  const uptime = formatUptime(process.uptime() * 1000)
  await reply(`🕐 Bot sudah berjalan selama: *${uptime}*`)
}

async function owner({ reply }) {
  const num = config.ownerNumber
  await reply(
    `👑 *Owner Bot*\n\nNama: ${config.botName} Owner\nNomor: wa.me/${num}\nBot: ${config.botName}`
  )
}

async function menu({ reply }) {
  const p = config.prefix
  const lines = [
    `🤖 *${config.botName}*`,
    `Prefix: \`${p}\` | Ketik command untuk menggunakannya`,
    `─────────────────────────`,
  ]

  const categories = [
    {
      icon: '🛠',
      name: 'Utility',
      cmds: ['ping', 'runtime', 'owner', 'menu'],
    },
    {
      icon: '⬇️',
      name: 'Downloader',
      cmds: ['tiktok', 'ytmp3', 'ytmp4'],
    },
    {
      icon: '🎮',
      name: 'Mini Games',
      cmds: ['suit', 'tebakangka'],
    },
    {
      icon: '🎉',
      name: 'Fun',
      cmds: ['8ball', 'coinflip', 'dice', 'choose', 'ship', 'rank'],
    },
    {
      icon: '💬',
      name: 'Interaktif',
      cmds: ['afk', 'unafk', 'quote', 'remind', 'remindlist', 'remindcancel', 'timer', 'todo'],
    },
    {
      icon: '📊',
      name: 'Poll',
      cmds: ['poll', 'vote', 'pollresult'],
    },
    {
      icon: '👥',
      name: 'Group Admin',
      cmds: ['tagall', 'kick', 'add', 'promote', 'demote'],
    },
    {
      icon: '🖼',
      name: 'Sticker',
      cmds: ['sticker', 'toimg'],
    },
    {
      icon: '🔊',
      name: 'Text Tools',
      cmds: ['tts', 'say'],
    },
  ]

  for (const cat of categories) {
    lines.push(`\n*${cat.icon} ${cat.name}*`)
    for (const cmd of cat.cmds) {
      lines.push(`  ${p}${cmd} — ${menuList[cmd] || ''}`)
    }
  }

  lines.push(`\n─────────────────────────`)
  lines.push(`Total: ${Object.keys(menuList).length} command`)
  await reply(lines.join('\n'))
}

module.exports = {
  ping,
  runtime,
  owner,
  menu,
  help: menu,
}
