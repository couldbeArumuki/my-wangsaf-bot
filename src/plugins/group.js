const { isAdmin, isBotAdmin, getSenderJid, toJid } = require('../lib/utils')

/**
 * Guard: pastikan command dijalankan di grup
 */
async function requireGroup({ isGroup, reply }) {
  if (!isGroup) {
    await reply('❌ Command ini hanya bisa digunakan di grup.')
    return false
  }
  return true
}

/**
 * Guard: pastikan pengirim adalah admin grup
 */
async function requireSenderAdmin({ sock, jid, msg, reply }) {
  const senderJid = getSenderJid(msg)
  const admin = await isAdmin(sock, jid, senderJid)
  if (!admin) {
    await reply('❌ Hanya admin grup yang bisa menggunakan command ini.')
    return false
  }
  return true
}

/**
 * Guard: pastikan bot adalah admin grup
 */
async function requireBotAdmin({ sock, jid, reply }) {
  const botAdmin = await isBotAdmin(sock, jid)
  if (!botAdmin) {
    await reply('❌ Bot harus menjadi admin grup untuk menjalankan command ini.')
    return false
  }
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// .tagall — mention semua member
// ─────────────────────────────────────────────────────────────────────────────
async function tagall(ctx) {
  const { sock, jid, reply, fullArgs } = ctx
  if (!(await requireGroup(ctx))) return
  if (!(await requireSenderAdmin(ctx))) return

  const meta = await sock.groupMetadata(jid)
  const mentions = meta.participants.map((p) => p.id)
  const caption = fullArgs || '📢 Tag semua member!'
  const text = mentions.map((id) => `@${id.split('@')[0]}`).join(' ')

  await sock.sendMessage(jid, {
    text: `${caption}\n\n${text}`,
    mentions,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// .kick — keluarkan member (reply atau mention)
// ─────────────────────────────────────────────────────────────────────────────
async function kick(ctx) {
  const { sock, jid, msg, args, reply } = ctx
  if (!(await requireGroup(ctx))) return
  if (!(await requireSenderAdmin(ctx))) return
  if (!(await requireBotAdmin(ctx))) return

  // Cari target: dari reply atau dari arg (nomor)
  let target =
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    (args[0] ? toJid(args[0]) : null)

  if (!target) {
    return reply('❓ Reply pesan member yang mau dikick, atau ketik nomornya: `.kick 6281234567890`')
  }

  await sock.groupParticipantsUpdate(jid, [target], 'remove')
  await reply(`✅ @${target.split('@')[0]} telah dikeluarkan dari grup.`)
}

// ─────────────────────────────────────────────────────────────────────────────
// .add — tambah member
// ─────────────────────────────────────────────────────────────────────────────
async function add(ctx) {
  const { sock, jid, args, reply } = ctx
  if (!(await requireGroup(ctx))) return
  if (!(await requireSenderAdmin(ctx))) return
  if (!(await requireBotAdmin(ctx))) return

  if (!args[0]) return reply('❓ Contoh: `.add 6281234567890`')

  const target = toJid(args[0])
  const res = await sock.groupParticipantsUpdate(jid, [target], 'add')
  const status = res?.[0]?.status
  if (status === '200' || status === 200) {
    await reply(`✅ @${target.split('@')[0]} berhasil ditambahkan ke grup.`)
  } else if (status === '403') {
    await reply(`❌ @${target.split('@')[0]} tidak bisa ditambahkan (privacy setting).`)
  } else if (status === '408') {
    await reply(`❌ @${target.split('@')[0]} tidak ditemukan / nomor tidak valid.`)
  } else {
    await reply(`⚠️ Status: ${status}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// .promote — jadikan admin
// ─────────────────────────────────────────────────────────────────────────────
async function promote(ctx) {
  const { sock, jid, msg, args, reply } = ctx
  if (!(await requireGroup(ctx))) return
  if (!(await requireSenderAdmin(ctx))) return
  if (!(await requireBotAdmin(ctx))) return

  let target =
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    (args[0] ? toJid(args[0]) : null)

  if (!target) return reply('❓ Reply atau ketik nomor: `.promote 6281234567890`')

  await sock.groupParticipantsUpdate(jid, [target], 'promote')
  await reply(`✅ @${target.split('@')[0]} sekarang menjadi admin grup.`)
}

// ─────────────────────────────────────────────────────────────────────────────
// .demote — cabut status admin
// ─────────────────────────────────────────────────────────────────────────────
async function demote(ctx) {
  const { sock, jid, msg, args, reply } = ctx
  if (!(await requireGroup(ctx))) return
  if (!(await requireSenderAdmin(ctx))) return
  if (!(await requireBotAdmin(ctx))) return

  let target =
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    (args[0] ? toJid(args[0]) : null)

  if (!target) return reply('❓ Reply atau ketik nomor: `.demote 6281234567890`')

  await sock.groupParticipantsUpdate(jid, [target], 'demote')
  await reply(`✅ Status admin @${target.split('@')[0]} telah dicabut.`)
}

module.exports = { tagall, kick, add, promote, demote }
