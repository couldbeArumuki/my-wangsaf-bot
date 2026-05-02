# 🤖 my-wangsaf-bot

Bot WhatsApp gratis berbasis [Baileys](https://github.com/WhiskeySockets/Baileys) (WhatsApp Web), ditulis dengan Node.js.

---

## 📋 Fitur

| Kategori | Command | Deskripsi |
|---|---|---|
| 🛠 Utility | `.ping` | Cek apakah bot aktif |
| | `.runtime` | Lihat uptime bot |
| | `.owner` | Info owner bot |
| | `.menu` / `.help` | Daftar semua command |
| 👥 Group Admin | `.tagall [pesan]` | Tag semua member grup |
| | `.kick` | Keluarkan member (reply / nomor) |
| | `.add <nomor>` | Tambah member ke grup |
| | `.promote` | Jadikan member admin |
| | `.demote` | Cabut status admin member |
| ⬇️ Downloader | `.tiktok <url>` | Download video TikTok tanpa watermark |
| | `.ytmp3 <url>` | Download audio YouTube |
| | `.ytmp4 <url>` | Download video YouTube |
| 🖼 Sticker | `.sticker` | Buat sticker dari gambar/video (reply) |
| | `.toimg` | Konversi sticker ke gambar (reply) |
| 💬 Text Tools | `.tts <teks>` | Text-to-speech (voice note) |
| | `.say <teks>` | Text-to-speech (audio biasa) |

---

## ⚙️ Cara Install & Jalankan

### 1. Prasyarat
- Node.js v18 atau lebih baru → [nodejs.org](https://nodejs.org)
- (Opsional, untuk fitur sticker video) `ffmpeg` terinstall di sistem

### 2. Clone & Install
```bash
git clone https://github.com/couldbeArumuki/my-wangsaf-bot.git
cd my-wangsaf-bot
npm install
```

### 3. Konfigurasi
```bash
cp .env.example .env
```

Edit file `.env`:
```env
OWNER_NUMBER=6281234567890   # Nomor WhatsApp owner (format internasional, tanpa +)
BOT_NAME=WangsafBot
PREFIX=.
SESSION_NAME=my-wangsaf-bot
```

### 4. Jalankan Bot
```bash
npm start
```

Saat pertama kali dijalankan (sebelum ada session tersimpan), bot akan:
1. **Mencetak QR ASCII di terminal** — bisa langsung kamu scan.
2. **Menyimpan gambar QR ke `tmp/qr.png`** dan **membukanya otomatis** di browser/image viewer.

Scan QR menggunakan WhatsApp di HP:
- Buka **Pengaturan → Perangkat Tertaut → Tautkan Perangkat**
- Arahkan kamera ke QR.

Session akan disimpan di folder `auth_info/` secara otomatis (tidak ter-commit ke Git).
Pada run berikutnya bot akan langsung terhubung tanpa perlu scan QR lagi.

### 5. Mode Development (auto-restart)
```bash
npm run dev
```
> Memerlukan `nodemon` (sudah terinstall sebagai devDependency).

---

## 📁 Struktur Project

```
my-wangsaf-bot/
├── src/
│   ├── index.js          # Entry point, koneksi Baileys
│   ├── handler.js        # Command router / handler
│   ├── lib/
│   │   └── utils.js      # Utility functions
│   └── plugins/
│       ├── utility.js    # ping, runtime, owner, menu
│       ├── group.js      # tagall, kick, add, promote, demote
│       ├── downloader.js # tiktok, ytmp3, ytmp4
│       ├── sticker.js    # sticker, toimg
│       └── texttools.js  # tts, say
├── auth_info/            # Session files (diabaikan Git)
├── config.js             # Konfigurasi global
├── .env                  # Environment variables (tidak ter-commit)
├── .env.example          # Template .env
└── package.json
```

### Cara Menambah Command Baru

Buat file baru di `src/plugins/` atau tambahkan ke file yang sudah ada:

```js
// src/plugins/custom.js
async function hello({ reply }) {
  await reply('Halo dunia!')
}

module.exports = { hello }
```

Command langsung aktif tanpa perlu register di tempat lain.

---

## ⬇️ Catatan Downloader

### TikTok
Menggunakan API publik [tikwm.com](https://tikwm.com) (gratis, no-watermark). Bisa berubah tanpa pemberitahuan.

**Alternatif**: Ganti `tiktokAdapter()` di `src/plugins/downloader.js` dengan adapter lain.

### YouTube (ytmp3/ytmp4)
Menggunakan `ytdl-core`, yang sering **dibatasi (rate-limited) oleh YouTube**.

**Rekomendasi untuk production**:
1. Install [yt-dlp](https://github.com/yt-dlp/yt-dlp) di server
2. Ganti `ytmp3Adapter()` / `ytmp4Adapter()` di `src/plugins/downloader.js` dengan panggilan ke binary `yt-dlp`

Contoh adapter yt-dlp:
```js
const { execSync } = require('child_process')
async function ytmp3AdapterYtDlp(url) {
  const tmpPath = `/tmp/audio_${Date.now()}.mp3`
  execSync(`yt-dlp -x --audio-format mp3 -o "${tmpPath}" "${url}"`)
  const buffer = fs.readFileSync(tmpPath)
  fs.unlinkSync(tmpPath)
  return { buffer, filename: 'audio.mp3', mime: 'audio/mpeg' }
}
```

### TTS (.tts / .say)
Menggunakan Google Translate TTS (tidak resmi). Bisa berubah kapan saja. Batas 200 karakter.

---

## 🚀 Deploy

### PM2 (recommended)
```bash
npm install -g pm2
pm2 start src/index.js --name wangsaf-bot
pm2 save
pm2 startup
```

### Railway / Render / VPS
1. Push repo ke GitHub
2. Tambahkan environment variables sesuai `.env.example`
3. Set start command: `npm start`

> ⚠️ Pastikan session (QR scan) dilakukan sekali di lokal, lalu upload folder `auth_info/` ke server, ATAU scan QR di terminal server saat pertama kali deploy.

---

## 🔒 Keamanan

- Jangan commit `.env` atau folder `auth_info/` ke Git (sudah ada di `.gitignore`)
- Nomor owner hanya dibaca dari environment variable, tidak di-hardcode

---

## 🛠 Troubleshooting

### QR tidak muncul / tidak bisa scan

| Gejala | Solusi |
|---|---|
| Terminal hanya menampilkan teks, tidak ada QR | Pastikan `npm install` sudah dijalankan dan tidak ada error. Coba hapus `node_modules/` dan jalankan ulang `npm install`. |
| QR ASCII muncul tapi tidak terbaca kamera | Perkecil ukuran font terminal atau gunakan gambar QR di `tmp/qr.png`. |
| Gambar QR tidak terbuka otomatis | Buka secara manual file `tmp/qr.png` yang ada di folder project. |
| Scan berhasil tapi bot minta QR lagi setelah restart | Jangan hapus folder `auth_info/`. Folder ini menyimpan session login. |
| Error `Cannot find module 'qrcode'` | Jalankan `npm install` di folder project. |

**Lokasi file gambar QR:** `./tmp/qr.png` (relatif terhadap folder project)

---

## 📄 Lisensi

MIT