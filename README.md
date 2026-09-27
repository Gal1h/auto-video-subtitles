# Auto Clipper

Auto Clipper adalah aplikasi lokal untuk membuat subtitle otomatis dari video. Video diproses di komputer sendiri: audio diekstrak dengan **FFmpeg**, ditranskripsikan oleh **Whisper.cpp**, lalu subtitle bergaya Shorts dibakar kembali ke video hasil.

Tidak ada layanan cloud yang diperlukan. File video yang diunggah disimpan sementara di `uploads/`, file antara dibuat di `temp/`, dan video hasil ditulis ke `outputs/`. File input dan file sementara dihapus setelah job selesai.

## Fitur

- Mendukung video `.mp4`, `.mov`, `.mkv`, `.webm`, dan `.avi`.
- Batas ukuran upload default 500 MB.
- Transkripsi lokal dengan Whisper.cpp.
- Subtitle ASS dengan timestamp per kata/segmen.
- Antarmuka web sederhana untuk upload, melihat progres, dan mengunduh hasil.
- Mendukung Linux, Fish shell, Windows PowerShell, dan Windows Command Prompt.

## Persyaratan

- Node.js 18 atau lebih baru dan npm.
- FFmpeg yang bisa dipanggil sebagai `ffmpeg` dari terminal.
- Binary Whisper.cpp yang bisa dipanggil sebagai `whisper-cli` (atau path yang diatur melalui `.env`).
- Model Whisper.cpp, misalnya `ggml-base.bin`.

Periksa instalasi Node.js dan npm:

```text
node --version
npm --version
```

Periksa FFmpeg dan Whisper.cpp:

```text
ffmpeg -version
whisper-cli --help
```

Jika `whisper-cli` memakai nama binary berbeda, gunakan `WHISPER_BINARY` pada konfigurasi.

## Instalasi di Linux (Bash)

Contoh berikut berlaku untuk distribusi berbasis Debian/Ubuntu. Sesuaikan perintah package manager jika menggunakan Fedora, Arch, atau distribusi lain.

### 1. Instal dependensi sistem

```bash
sudo apt update
sudo apt install -y ffmpeg curl build-essential
```

Instal Node.js 18 atau lebih baru menggunakan pengelola versi seperti `nvm`, atau melalui package manager distribusi. Pastikan perintah `node` dan `npm` tersedia setelah instalasi.

### 2. Siapkan proyek

```bash
git clone <URL_REPOSITORY> auto-clipper
cd auto-clipper
npm ci
mkdir -p models uploads outputs temp
```

Salin binary Whisper.cpp dan model ke komputer. Binary dapat diletakkan di `PATH`, atau path absolutnya dapat ditulis di `.env`.

### 3. Konfigurasi

Buat file `.env` di root proyek:

```bash
cp .env.example .env
```

Jika `.env.example` belum tersedia, buat `.env` dengan isi berikut:

```dotenv
PORT=3000
MAX_FILE_SIZE_MB=500
WHISPER_BINARY=whisper-cli
WHISPER_MODEL=./models/ggml-base.bin
```

`WHISPER_MODEL` relatif terhadap root proyek. Jika binary tidak ada di `PATH`, gunakan path absolut, misalnya:

```dotenv
WHISPER_BINARY=/opt/whisper.cpp/build/bin/whisper-cli
```

### 4. Jalankan

Mode biasa:

```bash
npm start
```

Mode development dengan restart saat file server berubah:

```bash
npm run dev
```

Buka `http://localhost:3000` di browser.

## Instalasi menggunakan Fish shell

Perintah proyeknya sama, tetapi pengaturan environment sementara menggunakan sintaks Fish:

```fish
cd /path/ke/auto-clipper
npm ci
mkdir -p models uploads outputs temp
```

Untuk menjalankan dengan konfigurasi yang hanya berlaku pada satu perintah:

```fish
env PORT=3000 MAX_FILE_SIZE_MB=500 WHISPER_BINARY=whisper-cli npm start
```

Untuk menyimpan konfigurasi pada sesi Fish saat ini:

```fish
set -gx PORT 3000
set -gx MAX_FILE_SIZE_MB 500
set -gx WHISPER_BINARY whisper-cli
set -gx WHISPER_MODEL ./models/ggml-base.bin
npm start
```

Konfigurasi yang disarankan tetap ditulis di `.env` agar dapat dipakai ulang. Jangan commit `.env` karena dapat berisi path atau rahasia lokal.

Jika binary Whisper.cpp berada di folder tertentu, tambahkan foldernya ke `PATH` untuk sesi saat ini:

```fish
set -gx PATH /path/ke/whisper.cpp/build/bin $PATH
whisper-cli --help
```

## Instalasi di Windows

### 1. Instal dependensi

Instal Node.js LTS dari situs resmi Node.js dan FFmpeg. Pastikan folder `bin` FFmpeg sudah masuk ke `PATH`. Gunakan build Whisper.cpp untuk Windows dan siapkan model `ggml-base.bin`.

Tutup dan buka kembali terminal setelah mengubah `PATH`, lalu periksa:

```powershell
node --version
npm --version
ffmpeg -version
whisper-cli --help
```

Jika binary bernama `whisper-cli.exe`, nama tersebut dapat dipakai di konfigurasi.

### 2. Siapkan proyek dengan PowerShell

```powershell
git clone <URL_REPOSITORY> auto-clipper
Set-Location .\auto-clipper
npm ci
New-Item -ItemType Directory -Force models, uploads, outputs, temp
```

Buat `.env`:

```powershell
@'
PORT=3000
MAX_FILE_SIZE_MB=500
WHISPER_BINARY=whisper-cli.exe
WHISPER_MODEL=./models/ggml-base.bin
'@ | Set-Content .env
```

Jika tidak ingin memasukkan Whisper.cpp ke `PATH`, gunakan path Windows di `.env`. Gunakan slash `/` untuk menghindari masalah escape:

```dotenv
WHISPER_BINARY=C:/Tools/whisper.cpp/build/bin/Release/whisper-cli.exe
WHISPER_MODEL=C:/Tools/whisper.cpp/models/ggml-base.bin
```

Jalankan aplikasi:

```powershell
npm start
```

Atau mode development:

```powershell
npm run dev
```

Buka `http://localhost:3000`.

### 3. Command Prompt (cmd.exe)

Jika menggunakan Command Prompt, perintah dasarnya adalah:

```bat
cd /d C:\path\ke\auto-clipper
npm ci
if not exist models mkdir models
if not exist uploads mkdir uploads
if not exist outputs mkdir outputs
if not exist temp mkdir temp
npm start
```

Konfigurasi permanen sebaiknya tetap diletakkan di `.env`. Untuk environment sementara pada sesi `cmd.exe`:

```bat
set PORT=3000
set MAX_FILE_SIZE_MB=500
set WHISPER_BINARY=whisper-cli.exe
set WHISPER_MODEL=./models/ggml-base.bin
npm start
```

## Konfigurasi

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP aplikasi. |
| `MAX_FILE_SIZE_MB` | `500` | Batas ukuran file upload dalam MB. |
| `WHISPER_BINARY` | `whisper-cli` | Nama atau path binary Whisper.cpp. |
| `WHISPER_MODEL` | `./models/ggml-base.bin` | Nama atau path model Whisper.cpp. |

Contoh struktur minimal:

```text
auto-clipper/
├── models/
│   └── ggml-base.bin
├── outputs/
├── temp/
├── uploads/
├── public/
├── src/
├── .env
├── package.json
└── README.md
```

Folder `uploads/`, `outputs/`, dan `temp/` sudah disertai `.gitkeep` agar foldernya tetap ada di Git, sementara file hasil dan file sementara diabaikan.

## Cara menggunakan

1. Pastikan FFmpeg, binary Whisper.cpp, dan model sudah dapat ditemukan.
2. Jalankan `npm start`.
3. Buka `http://localhost:3000`.
4. Pilih atau tarik video yang didukung ke area upload.
5. Tunggu tahap ekstraksi audio, transkripsi, dan rendering selesai.
6. Klik tombol unduh untuk mengambil video dengan subtitle.

Proses berjalan satu job pada satu server Node.js. Untuk file besar, waktu proses bergantung pada durasi video dan kecepatan CPU/GPU yang digunakan oleh Whisper.cpp.

## Troubleshooting

### `FFmpeg atau Whisper.cpp belum ditemukan`

Pastikan kedua perintah dapat dijalankan dari terminal yang sama dengan terminal tempat server dimulai. Jika tidak, atur `WHISPER_BINARY` dengan path lengkap dan masukkan FFmpeg ke `PATH`.

### Model tidak ditemukan

Pastikan file model benar-benar ada pada path `WHISPER_MODEL`. Path relatif dihitung dari root proyek, bukan dari folder `src/`.

### `Format video tidak didukung`

Gunakan `.mp4`, `.mov`, `.mkv`, `.webm`, atau `.avi`. Format lain perlu dikonversi terlebih dahulu dengan FFmpeg.

### Upload terlalu besar

Naikkan `MAX_FILE_SIZE_MB` di `.env`, lalu restart server. Pastikan ruang disk cukup karena proses membuat file audio dan video hasil tambahan.

### Port 3000 sudah digunakan

Atur port lain di `.env`, misalnya `PORT=3001`, lalu buka port tersebut di browser.

### Windows gagal menjalankan binary

Pastikan menggunakan binary Windows (`.exe` bila diperlukan), bukan binary Linux/macOS. Periksa juga bahwa folder binary dan FFmpeg sudah masuk ke `PATH`, atau gunakan path absolut di `.env`.

## Pengembangan

Instal dependency dengan `npm ci`, kemudian jalankan:

```bash
npm run dev
```

Server menyediakan endpoint berikut:

- `POST /api/jobs` — menerima field multipart `video`.
- `GET /api/jobs/:id` — mengambil status dan progres job.
- `GET /api/jobs/:id/download` — mengunduh video yang sudah selesai.

Tidak ada test suite yang didefinisikan saat ini. Sebelum membuat perubahan, lakukan pemeriksaan manual dengan satu video pendek dan pastikan hasilnya dapat diputar serta subtitle tampil sesuai timestamp.

## Lisensi dan catatan model

Proyek ini tidak mendistribusikan FFmpeg, Whisper.cpp, atau model Whisper. Instal dan gunakan masing-masing komponen sesuai lisensi serta ketentuan distribusinya.
