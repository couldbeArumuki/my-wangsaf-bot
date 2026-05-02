/**
 * Format uptime (ms) menjadi string human-readable
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours % 24 > 0) parts.push(`${hours % 24}h`)
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`)
  parts.push(`${seconds % 60}s`)
  return parts.join(' ')
}

/**
 * Cek apakah JID tertentu adalah admin di sebuah grup
 */
async function isAdmin(sock, groupJid, jid) {
  try {
    const meta = await sock.groupMetadata(groupJid)
    const participant = meta.participants.find((p) => p.id === jid)
    return participant?.admin === 'admin' || participant?.admin === 'superadmin'
  } catch {
    return false
  }
}

/**
 * Cek apakah bot adalah admin grup
 */
async function isBotAdmin(sock, groupJid) {
  const botJid = sock.user?.id?.replace(/:[^@]+/, '') + '@s.whatsapp.net'
  return isAdmin(sock, groupJid, botJid)
}

/**
 * Ambil JID pengirim dari pesan
 */
function getSenderJid(msg) {
  return msg.key.participant || msg.key.remoteJid
}

/**
 * Normalisasi nomor WA (hapus karakter non-digit, tambahkan @s.whatsapp.net)
 */
function toJid(number) {
  return number.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
}

module.exports = { formatUptime, isAdmin, isBotAdmin, getSenderJid, toJid }
