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
  ytmp4: 'Download video dari YouTube',

  // Sticker
  sticker: 'Buat sticker dari gambar/video (reply media)',
  toimg: 'Konversi sticker ke gambar (reply sticker)',

  // Text tools
  tts: 'Text-to-speech (reply atau ketik pesan)',
  say: 'Bot ngomong sesuatu (Google TTS)',
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
  const lines = [
    `🤖 *${config.botName} Command List*`,
    `Prefix: \`${config.prefix}\``,
    '',
  ]

  const categories = {
    '🛠 Utility': ['ping', 'runtime', 'owner', 'menu', 'help'],
    '👥 Group Admin': ['tagall', 'kick', 'add', 'promote', 'demote'],
    '⬇️ Downloader': ['tiktok', 'ytmp3', 'ytmp4'],
    '🖼 Sticker': ['sticker', 'toimg'],
    '💬 Text Tools': ['tts', 'say'],
  }

  for (const [cat, cmds] of Object.entries(categories)) {
    lines.push(`*${cat}*`)
    for (const cmd of cmds) {
      lines.push(`  ${config.prefix}${cmd} — ${menuList[cmd] || ''}`)
    }
    lines.push('')
  }

  lines.push('_Ketik command untuk menggunakannya._')
  await reply(lines.join('\n'))
}

module.exports = {
  ping,
  runtime,
  owner,
  menu,
  help: menu,
}
