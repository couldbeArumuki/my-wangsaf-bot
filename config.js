require('dotenv').config()

module.exports = {
  ownerNumber: process.env.OWNER_NUMBER || '6281234567890',
  botName: process.env.BOT_NAME || 'WangsafBot',
  prefix: process.env.PREFIX || '.',
  sessionName: process.env.SESSION_NAME || 'my-wangsaf-bot',

  // URL self-hosted yt-dlp microservice (lihat services/ytdlp-server.js)
  // Wajib diisi untuk fitur .ytmp3 dan .ytmp4
  ytdlpApiUrl: process.env.YTDLP_API_URL || '',

  // URL self-hosted TikTok API (opsional, untuk menggantikan tikwm.com)
  tiktokApiUrl: process.env.TIKTOK_API_URL || '',
}
