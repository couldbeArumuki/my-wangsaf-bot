# SOURCES.md — Atribusi Dataset Quote

File ini menjelaskan asal-usul dan metodologi pembuatan dataset quote yang digunakan oleh command `.quote` di bot ini.

## Dataset: `src/data/quotes.json`

Dataset berisi **1003 entri** yang dibagi menjadi empat kategori:

| Tag | Jumlah | Deskripsi |
|-----|--------|-----------|
| `jp` | 409 | Filosofi Jepang: Zen, Bushido, Wabi-sabi, Kaizen, Ikigai, Haiku, dll. |
| `id` | 187 | Motivasi & peribahasa Indonesia/Nusantara |
| `en` | 257 | Filosofi Barat: Stoik, parafrase tokoh terkenal, motivasi umum |
| `philosophy` | 150 | Filsafat universal: Stoik, Eksistensialisme, Humanisme, dan lainnya |

---

## Metodologi & Sumber

### Kategori `jp` (Jepang) — Parafrase Orisinal

Semua entri bertag `jp` adalah **parafrase dan tulisan orisinal** yang terinspirasi dari:

- **Tradisi Zen Buddhism** — filosofi tentang keheningan, kesadaran penuh (mindfulness), dan saat ini (present moment)
- **Bushido** — kode etik samurai: kehormatan, keberanian, disiplin, dan integritas
- **Wabi-sabi** — estetika Jepang yang merayakan ketidaksempurnaan, kefanaan, dan kesederhanaan
- **Kaizen** (改善) — prinsip perbaikan berkelanjutan
- **Ikigai** (生き甲斐) — konsep menemukan tujuan hidup
- **Haiku** — puisi pendek Jepang yang berfokus pada alam dan momen singkat
- **Peribahasa Jepang** (Kotowaza) — kebijaksanaan populer yang telah menjadi milik publik

Tidak ada kutipan langsung dari karya berhak cipta modern. Referensi ke tokoh bersejarah (misalnya "Zen Jepang", "Bushido", "Filosofi Samurai") menggunakan nama tradisi, bukan terjemahan langsung dari teks berlisensi.

### Kategori `id` (Indonesia) — Peribahasa & Motivasi Lokal

- **Peribahasa Indonesia** — dari kumpulan peribahasa yang sudah menjadi milik publik/warisan budaya
- **Filosofi Jawa** — _ojo dumeh_, _sepi ing pamrih rame ing gawe_, _urip mung mampir ngombe_, dll.
- **Pepatah Minang** — _alam takambang jadi guru_
- **Kutipan tokoh nasional** yang sudah dalam domain publik:
  - R.A. Kartini — "Habis gelap terbitlah terang" (surat-suratnya diterbitkan 1911, domain publik)
  - Ir. Soekarno — pidato publik, domain publik
  - Ki Hajar Dewantara — tulisan pedagogis, domain publik
- Parafrase/inspirasi dari sumber agama (Al-Quran, Hadis) yang merupakan teks warisan bersama

### Kategori `en` (Inggris) — Parafrase Tokoh Terkenal

Semua entri bertag `en` adalah **parafrase** yang:
- Terinspirasi dari tokoh yang tulisannya sudah masuk domain publik (sebelum 1928): Marcus Aurelius, Seneca, Aristoteles, Sokrates, Laozi, Plutarch, dll.
- Menggunakan label "(paraphrase)" untuk membedakan dari kutipan verbatim
- Untuk tokoh modern (Einstein, Churchill, dll.), menggunakan parafrase yang menangkap semangat, bukan terjemahan langsung dari sumber berhak cipta

### Kategori `philosophy` — Filsafat Universal

Entri bertag `philosophy` adalah parafrase dan tulisan orisinal yang terinspirasi dari:
- **Filsafat Stoik** — Marcus Aurelius, Seneca, Epiktetos (tulisan mereka sudah domain publik)
- **Filsafat Sokratik/Platonis** — Socrates, Plato, Aristoteles (domain publik)
- **Filsafat Eksistensialisme** — Sartre, Camus, Heidegger, Kierkegaard (parafrase inspiratif)
- **Filsafat Modern** — Viktor Frankl, Carl Jung, Bertrand Russell, dsb. (parafrase transformatif)
- **Filsafat Humanisme** dan **Filsafat Timur** yang universal

Semua entri menggunakan label "(parafrase)" atau "(paraphrase)" untuk membedakan dari kutipan verbatim.

---

## Pernyataan Kepatuhan Lisensi

Dataset ini **tidak mengandung** reproduksi verbatim dari teks yang masih dilindungi hak cipta. Semua entri adalah:

1. **Teks orisinal** yang ditulis oleh kontributor bot ini dengan tema/inspirasi dari sumber-sumber di atas
2. **Parafrase** (karya turunan transformatif) dari tradisi filosofi yang sudah dalam domain publik
3. **Peribahasa/pepatah rakyat** yang merupakan warisan budaya bersama

Jika ada entri yang dianggap melanggar hak cipta pihak manapun, silakan buka issue di repository ini dan akan segera diperbaiki.

---

## Kontribusi

Untuk menambah quote baru, edit file `src/data/quotes.json` dengan format:

```json
{
  "text": "Isi kutipan di sini.",
  "author": "Nama sumber atau tradisi",
  "tag": "jp|id|en"
}
```

Pastikan setiap entri baru memenuhi ketentuan di atas (orisinal atau parafrase transformatif, bukan salinan verbatim dari teks berhak cipta modern).
