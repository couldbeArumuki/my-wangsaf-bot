require('dotenv').config()

module.exports = {
  ownerNumber: process.env.OWNER_NUMBER || '6281234567890',
  botName: process.env.BOT_NAME || 'WangsafBot',
  prefix: process.env.PREFIX || '.',
  sessionName: process.env.SESSION_NAME || 'my-wangsaf-bot',
}
