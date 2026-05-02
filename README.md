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
Menggunakan API publik [tikwm.com](https://tikwm.com) (gratis, tanpa watermark) sebagai sumber utama.
Jika tikwm.com gagal atau mengembalikan respons tidak valid, bot otomatis fallback ke **yt-dlp lokal**.

### YouTube (ytmp3/ytmp4)
Menggunakan **yt-dlp** yang berjalan secara lokal di mesin bot (paling stabil, gratis).

#### Install yt-dlp (wajib untuk fitur YouTube dan fallback TikTok)

**Windows (laptop):**
1. Buka https://github.com/yt-dlp/yt-dlp/releases/latest
2. Unduh `yt-dlp.exe`
3. Pilih salah satu cara:
   - Simpan ke folder yang sudah ada di PATH (contoh: `C:\Windows\System32\`) — langsung bisa dipakai
   - **Atau** simpan di folder bebas (misal `C:\tools\yt-dlp.exe`), lalu set di `.env`:
     ```
     YTDLP_PATH=C:\tools\yt-dlp.exe
     ```
4. Verifikasi: buka Command Prompt, ketik `yt-dlp --version`

**Linux / Mac:**
```bash
pip install yt-dlp
# atau
brew install yt-dlp     # Mac
sudo apt install yt-dlp # Ubuntu/Debian
```

**Update yt-dlp** (lakukan berkala agar tidak patah karena update YouTube):
```bash
yt-dlp -U          # Linux/Mac
# Windows: unduh ulang yt-dlp.exe dari halaman releases
```

#### Konfigurasi di `.env`
```env
YTDLP_PATH=yt-dlp          # path ke binary (default: 'yt-dlp' di PATH)
TIKTOK_TIMEOUT=20000       # timeout request ke tikwm.com (ms)
DOWNLOAD_TIMEOUT=120000    # timeout proses download yt-dlp (ms)
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

### Downloader error

| Gejala | Solusi |
|---|---|
| `yt-dlp tidak ditemukan` | Install yt-dlp dan pastikan ada di PATH, atau set `YTDLP_PATH` di `.env`. Lihat panduan di atas. |
| `yt-dlp error: ...` | Update yt-dlp ke versi terbaru (`yt-dlp -U`). YouTube sering ubah format yang membutuhkan versi terbaru. |
| `TikTok download gagal` | Coba lagi — tikwm.com kadang rate-limit. Bot akan fallback ke yt-dlp otomatis. Pastikan yt-dlp terinstall. |
| `YouTube MP3/MP4 gagal` (video pribadi/umur) | Video yang diprivate, umur, atau berisi DRM tidak bisa diunduh. |
| File terlalu besar, tidak terkirim | WhatsApp punya batas ~64 MB per media. Untuk video panjang, coba `.ytmp3` saja. |

---

## 📄 Lisensi

MIT