# Auto Subtitles

Auto Subtitles is a local application for automatically creating subtitles from videos. Videos are processed on your own computer: audio is extracted with **FFmpeg**, transcribed by **Whisper.cpp**, and Shorts-style subtitles are burned into the resulting video.

No cloud service is required. Uploaded video files are temporarily stored in `uploads/`, intermediate files are created in `temp/`, and the resulting videos are written to `outputs/`. Input and temporary files are deleted after the job is complete.

## Features

- Supports `.mp4`, `.mov`, `.mkv`, `.webm`, and `.avi` videos.
- Default upload size limit of 500 MB.
- Local transcription with Whisper.cpp.
- ASS subtitles with per-word or per-segment timestamps.
- Simple web interface for uploading, viewing progress, and downloading results.
- Supports Linux, Fish shell, Windows PowerShell, and Windows Command Prompt.

## Requirements

- Node.js 18 or newer and npm.
- FFmpeg available as `ffmpeg` from the terminal.
- Whisper.cpp binary available as `whisper-cli` (or a path configured through `.env`).
- A Whisper.cpp model, such as `ggml-base.bin`.

Check the Node.js and npm installation:

```text
node --version
npm --version
```

Check FFmpeg and Whisper.cpp:

```text
ffmpeg -version
whisper-cli --help
```

If `whisper-cli` uses a different binary name, set `WHISPER_BINARY` in the configuration.

## Installation on Linux (Bash)

The following example applies to Debian/Ubuntu-based distributions. Adjust the package manager commands if you use Fedora, Arch, or another distribution.

### 1. Install system dependencies

```bash
sudo apt update
sudo apt install -y ffmpeg curl build-essential
```

Install Node.js 18 or newer using a version manager such as `nvm`, or through your distribution's package manager. Make sure the `node` and `npm` commands are available after installation.

### 2. Set up the project

```bash
git clone <URL_REPOSITORY> auto-subtitles
cd auto-subtitles
npm ci
mkdir -p models uploads outputs temp
```

Copy the Whisper.cpp binary and model to your computer. The binary can be placed in `PATH`, or its absolute path can be specified in `.env`.

### 3. Configure

Create an `.env` file in the project root:

```bash
cp .env.example .env
```

If `.env.example` is not available, create `.env` with the following contents:

```dotenv
PORT=3000
MAX_FILE_SIZE_MB=500
WHISPER_BINARY=whisper-cli
WHISPER_MODEL=./models/ggml-base.bin
```

`WHISPER_MODEL` is relative to the project root. If the binary is not in `PATH`, use an absolute path, for example:

```dotenv
WHISPER_BINARY=/opt/whisper.cpp/build/bin/whisper-cli
```

### 4. Run

Normal mode:

```bash
npm start
```

Development mode with automatic restart when server files change:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Installation using Fish shell

The project commands are the same, but temporary environment settings use Fish syntax:

```fish
cd /path/to/auto-subtitles
npm ci
mkdir -p models uploads outputs temp
```

To run with configuration that applies to a single command:

```fish
env PORT=3000 MAX_FILE_SIZE_MB=500 WHISPER_BINARY=whisper-cli npm start
```

To save configuration for the current Fish session:

```fish
set -gx PORT 3000
set -gx MAX_FILE_SIZE_MB 500
set -gx WHISPER_BINARY whisper-cli
set -gx WHISPER_MODEL ./models/ggml-base.bin
npm start
```

It is recommended to keep the configuration in `.env` so it can be reused. Do not commit `.env` because it may contain local paths or secrets.

If the Whisper.cpp binary is located in a specific folder, add that folder to `PATH` for the current session:

```fish
set -gx PATH /path/to/whisper.cpp/build/bin $PATH
whisper-cli --help
```

## Installation on Windows

### 1. Install dependencies

Install Node.js LTS from the official Node.js website and install FFmpeg. Make sure the FFmpeg `bin` folder is in `PATH`. Use a Windows build of Whisper.cpp and prepare the `ggml-base.bin` model.

Close and reopen the terminal after changing `PATH`, then check:

```powershell
node --version
npm --version
ffmpeg -version
whisper-cli --help
```

If the binary is named `whisper-cli.exe`, that name can be used in the configuration.

### 2. Set up the project with PowerShell

```powershell
git clone <URL_REPOSITORY> auto-subtitles
Set-Location .\auto-subtitles
npm ci
New-Item -ItemType Directory -Force models, uploads, outputs, temp
```

Create `.env`:

```powershell
@'
PORT=3000
MAX_FILE_SIZE_MB=500
WHISPER_BINARY=whisper-cli.exe
WHISPER_MODEL=./models/ggml-base.bin
'@ | Set-Content .env
```

If you do not want to add Whisper.cpp to `PATH`, use Windows paths in `.env`. Use forward slashes `/` to avoid escape issues:

```dotenv
WHISPER_BINARY=C:/Tools/whisper.cpp/build/bin/Release/whisper-cli.exe
WHISPER_MODEL=C:/Tools/whisper.cpp/models/ggml-base.bin
```

Run the application:

```powershell
npm start
```

Or use development mode:

```powershell
npm run dev
```

Open `http://localhost:3000`.

### 3. Command Prompt (cmd.exe)

If you are using Command Prompt, the basic commands are:

```bat
cd /d C:\path\to\auto-subtitles
npm ci
if not exist models mkdir models
if not exist uploads mkdir uploads
if not exist outputs mkdir outputs
if not exist temp mkdir temp
npm start
```

Permanent configuration should still be placed in `.env`. For temporary environment settings in the `cmd.exe` session:

```bat
set PORT=3000
set MAX_FILE_SIZE_MB=500
set WHISPER_BINARY=whisper-cli.exe
set WHISPER_MODEL=./models/ggml-base.bin
npm start
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Application HTTP port. |
| `MAX_FILE_SIZE_MB` | `500` | Upload file size limit in MB. |
| `WHISPER_BINARY` | `whisper-cli` | Whisper.cpp binary name or path. |
| `WHISPER_MODEL` | `./models/ggml-base.bin` | Whisper.cpp model name or path. |

Example minimal structure:

```text
auto-subtitles/
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

The `uploads/`, `outputs/`, and `temp/` folders include `.gitkeep` files so that they remain in Git, while result and temporary files are ignored.

## Usage

1. Make sure FFmpeg, the Whisper.cpp binary, and the model can be found.
2. Run `npm start`.
3. Open `http://localhost:3000`.
4. Select or drag a supported video into the upload area.
5. Wait for audio extraction, transcription, and rendering to finish.
6. Click the download button to retrieve the subtitled video.

Processing runs one job at a time on a single Node.js server. For large files, processing time depends on the video duration and the CPU/GPU speed used by Whisper.cpp.

## Troubleshooting

### `FFmpeg or Whisper.cpp not found`

Make sure both commands can be run from the same terminal used to start the server. If not, set `WHISPER_BINARY` to the full path and add FFmpeg to `PATH`.

### Model not found

Make sure the model file actually exists at the `WHISPER_MODEL` path. Relative paths are resolved from the project root, not from the `src/` folder.

### `Video format not supported`

Use `.mp4`, `.mov`, `.mkv`, `.webm`, or `.avi`. Other formats must first be converted with FFmpeg.

### Upload too large

Increase `MAX_FILE_SIZE_MB` in `.env`, then restart the server. Make sure there is enough disk space because the process creates additional audio and result video files.

### Port 3000 is already in use

Set another port in `.env`, for example `PORT=3001`, then open that port in your browser.

### Windows cannot run the binary

Make sure you are using a Windows binary (`.exe` if required), not a Linux/macOS binary. Also check that the binary and FFmpeg folders are in `PATH`, or use absolute paths in `.env`.

## Development

Install dependencies with `npm ci`, then run:

```bash
npm run dev
```

The server provides the following endpoints:

- `POST /api/jobs` — accepts the multipart `video` field.
- `GET /api/jobs/:id` — retrieves job status and progress.
- `GET /api/jobs/:id/download` — downloads the completed video.

There is currently no defined test suite. Before making changes, perform a manual check with a short video and make sure the result plays correctly and the subtitles appear according to their timestamps.

## License and model notes

This project does not distribute FFmpeg, Whisper.cpp, or the Whisper model. Install and use each component according to its license and distribution terms.
