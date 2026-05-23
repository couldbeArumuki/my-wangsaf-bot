# 🤖 my-wangsaf-bot

Bot WhatsApp gratis berbasis [Baileys](https://github.com/WhiskeySockets/Baileys) (WhatsApp Web), ditulis dengan Node.js.

---

## 📋 Fitur

| Kategori | Command | Deskripsi |
|---|---|---|
| 🛠 Utility | `.ping` | Cek apakah bot aktif |
| | `.runtime` | Lihat uptime bot |
| | `.owner` | Info owner bot |
| | `.menu` / `.help` | Daftar semua command (kategorized) |
| 👥 Group Admin | `.tagall [pesan]` | Tag semua member grup |
| | `.kick` | Keluarkan member (reply / nomor) |
| | `.add <nomor>` | Tambah member ke grup |
| | `.promote` | Jadikan member admin |
| | `.demote` | Cabut status admin member |
| ⬇️ Downloader | `.tiktok <url>` | Download video TikTok tanpa watermark |
| | `.ytmp3 <url>` | Download audio YouTube (via yt-dlp) |
| | `.ytmp4 <url>` | Download video YouTube (WhatsApp-compatible, via yt-dlp + ffmpeg) |
| 🖼 Sticker | `.sticker` | Buat sticker dari gambar/video (reply) |
| | `.toimg` | Konversi sticker ke gambar (reply) |
| 🔊 Text Tools | `.tts <teks>` | Text-to-speech (voice note) |
| | `.say <teks>` | Text-to-speech (audio biasa) |
| 🎮 Mini Games | `.suit <batu/gunting/kertas>` | Batu-gunting-kertas vs bot |
| | `.tebakangka [angka]` | Tebak angka 1–100 (7 percobaan) |
| 💬 Interaktif | `.quote [jp\|id\|en\|philosophy]` | Kutipan motivasi acak (1003+ quote, dominan Jepang) |
| | `.afk [alasan]` | Set status AFK (otomatis cancel kalau kirim pesan) |
| | `.unafk` | Batalkan AFK secara manual |
| | `.remind <waktu> <pesan>` | Pengingat (contoh: `.remind 10m Minum obat`) |
| | `.remindlist` | Tampilkan semua pengingat aktif |
| | `.remindcancel <id>` | Batalkan pengingat berdasarkan ID |
| | `.timer <detik>` | Hitung mundur (contoh: `.timer 30`) |
| | `.todo add\|list\|done\|del` | To-do list personal (tersimpan di disk) |
| 🎉 Fun | `.8ball <pertanyaan>` | Magic 8-ball jawab pertanyaanmu |
| | `.coinflip` | Lempar koin (heads/tails) |
| | `.dice [sisi]` | Lempar dadu (default 6 sisi, contoh: `.dice 20`) |
| | `.choose <a\|b\|c>` | Bot pilih secara acak dari pilihanmu |
| | `.ship <nama1> <nama2>` | Cek kompatibilitas dua orang (hiburan) |
| | `.rank` / `.top` | Leaderboard acak grup (ephemeral, hiburan) |
| 🤖 AI | Auto AI Reply (Zizou AI) | Auto reply private chat pakai Groq (`llama-3.3-70b-versatile`) |
| 📊 Poll | `.poll <pertanyaan> \| opsi1 \| opsi2` | Buat polling di grup |
| | `.vote <id> <nomor>` | Vote di polling aktif |
| | `.pollresult <id>` | Lihat hasil polling |

---

## ⚙️ Cara Install & Jalankan

### 1. Prasyarat
- Node.js v18 atau lebih baru → [nodejs.org](https://nodejs.org)
- **yt-dlp** — wajib untuk `.ytmp3`, `.ytmp4` → [panduan di bawah](#youtube-ytmp3ytmp4)
- **ffmpeg** — wajib untuk `.ytmp4` (transcode), `.sticker` (video) → [panduan di bawah](#ffmpeg)

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
GROQ_API_KEY=your_groq_api_key

# Path ke yt-dlp dan ffmpeg (jika tidak ada di PATH)
YTDLP_PATH=yt-dlp
FFMPEG_PATH=ffmpeg
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
│   ├── data/
│   │   ├── quotes.json   # Dataset quote 1003+ entri (jp/id/en/philosophy)
│   │   └── todos.json    # Data to-do list (auto-generated)
│   └── plugins/
│       ├── utility.js    # ping, runtime, owner, menu
│       ├── group.js      # tagall, kick, add, promote, demote
│       ├── downloader.js # tiktok, ytmp3, ytmp4 (via yt-dlp + ffmpeg)
│       ├── sticker.js    # sticker, toimg
│       ├── texttools.js  # tts, say
│       ├── interactive.js# suit, tebakangka, quote, afk, poll, remind, timer, todo
│       ├── fun.js        # 8ball, coinflip, dice, choose, ship, rank
│       └── autoai.js     # auto AI reply private chat (Groq)
├── auth_info/            # Session files (diabaikan Git)
├── config.js             # Konfigurasi global
├── .env                  # Environment variables (tidak ter-commit)
├── .env.example          # Template .env
├── SOURCES.md            # Atribusi dataset quote
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

### Setup Auto AI Reply (Zizou AI)
```bash
npm i groq-sdk
```

Tambahkan env berikut:
```env
GROQ_API_KEY=your_groq_api_key
```

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

#### ffmpeg

ffmpeg **wajib ada** untuk:
- `.ytmp4` — transcode video ke format yang bisa diputar di WhatsApp
- `.sticker` dari video

**Windows:**
```powershell
winget install Gyan.FFmpeg
```
atau unduh dari https://ffmpeg.org/download.html, extract, lalu set path di `.env`:
```env
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
```

> **Tip Windows:** Kalau ffmpeg ada di `C:\Users\...\WinGet\Links\ffmpeg.exe`, set `FFMPEG_PATH` ke path tersebut agar bot selalu menemukannya meskipun PATH berbeda.

**Linux / Mac:**
```bash
sudo apt install ffmpeg  # Ubuntu/Debian
brew install ffmpeg      # Mac
```

#### Konfigurasi di `.env`
```env
YTDLP_PATH=yt-dlp          # path ke binary (default: 'yt-dlp' di PATH)
FFMPEG_PATH=ffmpeg          # path ke binary ffmpeg (default: 'ffmpeg' di PATH)
TIKTOK_TIMEOUT=20000       # timeout request ke tikwm.com (ms)
DOWNLOAD_TIMEOUT=120000    # timeout proses download yt-dlp (ms)

# Opsi transcode ytmp4
YTMP4_TRANSCODE=1          # 1=aktif (default), 0=nonaktif
YTMP4_MAX_HEIGHT=720       # tinggi maksimal output (default: 720)
YTMP4_CRF=28               # kualitas H.264 (18=bagus, 28=default, 35=kecil)

# Debug
DEBUG_DOWNLOAD=0           # 1=log detail download & transcode
```

### TTS (.tts / .say)
Menggunakan Google Translate TTS (tidak resmi). Bisa berubah kapan saja. Batas 200 karakter.

### Quote (.quote)
Dataset lokal 1003+ kutipan, dominan filosofi Jepang. Filter: `.quote jp`, `.quote id`, `.quote en`, `.quote philosophy`.
Lihat [SOURCES.md](./SOURCES.md) untuk informasi atribusi lengkap.

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
| `YouTube MP3/MP4 gagal` (video pribadi/umur) | Video yang di-private, dibatasi umur, atau berisi DRM tidak bisa diunduh. |
| `.ytmp4` video tidak bisa diputar di WhatsApp | Pastikan `ffmpeg` terinstall dan `FFMPEG_PATH` diset di `.env`. Set `YTMP4_TRANSCODE=1`. |
| `.ytmp4` ffmpeg tidak ditemukan | Set `FFMPEG_PATH` di `.env` ke path lengkap ffmpeg.exe (lihat bagian ffmpeg di atas). |
| File terlalu besar, tidak terkirim | WhatsApp punya batas ~64 MB per media. Bot akan menampilkan error jika file melebihi batas. Coba `.ytmp3` atau set `YTMP4_MAX_HEIGHT=480`. |
| `.sticker` dari video gagal | Pastikan `FFMPEG_PATH` diset dengan benar di `.env`. |

---

## 📄 Lisensi

MIT