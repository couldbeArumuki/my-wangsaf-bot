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
├── services/
│   └── ytdlp-server.js   # yt-dlp HTTP microservice (YouTube + TikTok)
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
Menggunakan API publik [tikwm.com](https://tikwm.com) (gratis, no-watermark) sebagai provider utama. Bot otomatis mencoba fallback provider jika tikwm.com gagal.

**Urutan provider TikTok:**
1. Self-hosted TikTok API (`TIKTOK_API_URL`, jika dikonfigurasi)
2. tikwm.com public API (**default, tidak perlu setup tambahan**)
3. yt-dlp microservice (`YTDLP_API_URL`, jika dikonfigurasi)

---

### YouTube (ytmp3/ytmp4) — Self-hosted yt-dlp Service

Fitur download YouTube memerlukan **yt-dlp microservice** yang berjalan secara lokal/VPS. Ini gratis, open-source, dan tidak ada rate limit.

#### Prasyarat
- **Python 3.8+** dan **pip** terinstall
- **ffmpeg** terinstall (diperlukan untuk merge video+audio MP4)

#### 1. Install yt-dlp

```bash
pip install yt-dlp
# Atau jika pakai pip3:
pip3 install yt-dlp

# Verifikasi:
yt-dlp --version
```

#### 2. Install ffmpeg

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg -y
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download dari [ffmpeg.org](https://ffmpeg.org/download.html) dan tambahkan ke PATH.

#### 3. Konfigurasi bot

Edit `.env`:
```env
# Aktifkan yt-dlp service (wajib untuk .ytmp3 dan .ytmp4)
YTDLP_API_URL=http://localhost:3001

# Port service (default: 3001)
YTDLP_PORT=3001
```

#### 4. Jalankan yt-dlp service

Buka terminal kedua (paralel dengan bot):
```bash
npm run ytdlp-service
```

Output yang diharapkan:
```
[ytdlp-server] Berjalan di http://localhost:3001
[ytdlp-server] Endpoint: GET /download?url=<url>&format=mp3|mp4
[ytdlp-server] Health:   GET /health
```

#### 5. Jalankan bot

Di terminal pertama:
```bash
npm start
```

#### Menjalankan service + bot bersamaan (PM2)

```bash
# Install PM2 (jika belum)
npm install -g pm2

# Jalankan keduanya
pm2 start src/index.js --name wangsaf-bot
pm2 start services/ytdlp-server.js --name ytdlp-service
pm2 save
pm2 startup
```

#### Deploy ke VPS

Jika bot berjalan di VPS, service yt-dlp bisa diakses dari mana saja:
```env
# Di .env (VPS):
YTDLP_API_URL=http://localhost:3001   # Service dan bot di VPS yang sama
YTDLP_PORT=3001
```

> ⚠️ **Jangan expose port 3001 ke publik** tanpa firewall. Service ini hanya untuk komunikasi internal bot ↔ service.

#### Update yt-dlp (jika download gagal)

YouTube sering update dan memerlukan yt-dlp terbaru:
```bash
pip install -U yt-dlp
# Atau:
yt-dlp -U
```

---

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