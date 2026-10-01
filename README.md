# 🍼 Baby Tracker

[![Docker Image](https://img.shields.io/badge/docker-beyensj%2Fbabytracker%3Alatest-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/beyensj/babytracker)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-installable-FF6B6B?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![OLED Friendly](https://img.shields.io/badge/OLED-True%20Black-000000?logo=apple&logoColor=white)](https://en.wikipedia.org/wiki/OLED)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A calm, privacy-first, self-hosted baby tracking progressive web application with **instant multi-device sync between parents**, **customizable quick action docks & status banners**, **distinct color-coded activities**, **live timers & Android notification chronometers**, **WHO growth percentiles**, **visual 7-day schedules**, and a **pitch-black OLED dark mode** designed specifically for late-night nursery feeds.

---

## ✨ Why Baby Tracker?

Most commercial baby apps lock your family's most intimate data behind steep recurring subscriptions, sell data to advertisers, or flood exhausted parents with ads at 3:00 AM. 

**Baby Tracker** is built differently:
- 🔒 **100% Self-Hosted & Private**: Your baby’s photos, feeding schedules, medical notes, and diaper logs stay entirely on your own hardware. Zero third-party telemetry, zero ads, zero subscriptions.
- 🔄 **Real-Time Partner Synchronization**: When Mom logs a feeding or starts a sleep timer on her phone, Dad’s device updates instantly (<50ms via WebSockets) without needing a page refresh.
- 🎨 **Unique Accent Colors for All 11 Activity Types**: Every activity (Breast, Bottle, Sleep, Diaper, Solids, Pump, Growth, Health, Routine, Note, Milestone) features a vibrant, dedicated accent color across Light, Dark, and OLED themes.
- ⚙️ **Customizable Quick Status & Action Dock**: Each individual caregiver can choose exactly which quick status cards and bottom dock action buttons are displayed and reorder them to fit their personal routine.
- 🔍 **Rich Interactive Item Detail Sheets**: Tap any logged activity on the timeline to view comprehensive details, hero metrics, baby's age at log, high-resolution photo previews with lightbox, and 1-tap Edit, Delete, Resume, or Share actions.
- 🌙 **Pitch-Black OLED Mode**: Pure `#000000` canvas with WCAG AAA contrast ratios. Minimizes screen glare in dark nurseries so you don't wake the baby (and saves your phone's battery).
- 📱 **True PWA & Native Android App**: Installable on iOS Safari and Android Chrome, or install the native Android APK with a real second-by-second live chronometer in your notification shade.
- 👶 **Multi-Child & Sibling Support**: Seamlessly switch between multiple children or track twins independently with individual profiles, avatars, and growth percentiles.
- 📥 **Universal Importer**: Effortlessly import your historical logs from Nara Baby CSV or JSON backups with automatic caregiver attribution and unit detection.

---

## 🌟 Key Features

### ⏱️ Live Stateful Timers & Resumable Sessions
- **Breastfeeding Stopwatch**: Left, Right, or Both sides with 1-tap switching and retroactive start time adjustments (e.g. *"Started 10m ago"*).
- **Sleep & Nap Tracker**: Live timer with multi-day cross-midnight visualization and wake window tracking.
- **Pumping Stopwatch**: Double or single pump duration tracking with volume and storage location logged.
- **1-Tap Resume**: Resume recently stopped nursing, sleep, or pump sessions directly from the timeline or detail sheet.
- **Persistent Live Dock**: Active timers remain visible and accessible across all views.
- **Android Notification Drawer**: Timers persist in the Android notification tray with native second-by-second counting chronometers and direct "Stop" action buttons.

### 🎨 Color-Coded 11 Activity Types
Every activity category is uniquely styled with its own dedicated color palette in Light, Dark, and OLED modes:

| Category | Icon | Light Mode Accent | Dark / OLED Accent | What is Tracked |
| :--- | :---: | :--- | :--- | :--- |
| **Breastfeeding** | 🤱 | Coral Rose (`#E05353`) | Vibrant Rose (`#FF6B6B`) | Left / Right / Both durations, last side, nursing notes |
| **Bottle Feeding** | 🍼 | Warm Amber (`#D97706`) | Luminous Gold (`#FBBF24`) | Volume (ml/oz), milk type (breast milk, formula, cow milk, water), formula brand, leftovers |
| **Sleep & Naps** | 🌙 | Slate Azure (`#3B6B9B`) | Sky Blue (`#60A5FA`) | Nap vs. Night sleep, duration, wake windows, sleep location, wake reasons |
| **Diaper Changes** | ✨ | Pure Teal (`#0D9488`) | Bright Mint (`#2DD4BF`) | Wet, Dirty, Wet+Dirty, Dry, stool color & texture, blowout alert, rash & cream applied |
| **Pumping** | 🥛 | Vivid Purple (`#9333EA`) | Electric Lavender (`#C084FC`) | Volume per side, total volume, duration, storage location (fridge, freezer, used) |
| **Solid Food** | 🍎 | Fresh Lime (`#65A30D`) | Neon Lime (`#A3E635`) | Food item, meal type, portion size, baby's reaction, first-time foods |
| **Growth & Measurements** | 📏 | Vibrant Emerald (`#16A34A`) | Spring Green (`#4ADE80`) | Weight, Length/Height, Head circumference, automatic WHO percentiles |
| **Health & Medical** | 🩺 | Crimson Ruby (`#E11D48`) | Rosy Coral (`#FB7185`) | Temperatures, medications & dosages, vaccines, doctor checkups, illness symptoms |
| **Routines & Play** | ⏰ | Royal Indigo (`#6366F1`) | Soft Indigo (`#818CF8`) | Tummy time, bath time, reading, outdoor walk, playtime durations |
| **Journal & Notes** | 📝 | Warm Sienna (`#92400E`) | Golden Bronze (`#F59E0B`) | Free-form notes, observations, daily reflections tagged by caregiver |
| **Milestones** | 🏆 | Deep Orange (`#EA580C`) | Bright Tangerine (`#FB923C`) | First smile, rolling over, first steps, baby's age at milestone, celebration confetti |

### 🛠️ Customizable Quick Status & Action Dock
- **Quick Status Header**: View quick glance counters (e.g. *Last Fed 1h 45m ago*, *Slept 3h 10m*, *4 Diapers*). Parents can customize which cards to show and hide via the customize modal.
- **Quick Action Bottom Dock**: Pick your favorite 5-6 primary 1-tap logging buttons (or reorder them) while keeping all other activities instantly accessible in the "+ More" sheet.
- **Per-Device / Per-Caregiver Preferences**: Each parent's device remembers its own quick action layout and view preferences.

### 🔍 Interactive Event Details & Photo Lightbox
- Tap any timeline event or grouped day row to open the **Event Detail Modal**.
- Displays rich hero metrics, side-by-side attributes, caregiver attribution, and exact timestamps.
- **Photo Lightbox**: Full-resolution photo preview with zoom, download, and close gestures.
- **1-Tap Actions**: Edit details, Delete log, Resume timer, or Share/Copy formatted summary to clipboard.

### 📊 Visual Schedules & Analytics
- **7-Day Stacked Visual Schedule**: See an entire week (Monday–Sunday) stacked horizontally from 00:00 to 24:00 with overnight sleep slices and vertical feed/diaper pins.
- **Cross-Midnight Continuity**: Overnight sleeps that cross midnight are cleanly split and tagged with `▶ Continues overnight` and `◀ From previous night`.
- **Month Calendar Grid**: High-level calendar with activity dots and quick day selection.
- **Daily Rhythm View**: 24-hour visual schedule with daylight/night ambient shading.
- **Trend Charts**: Aggregated daily feeding volumes, sleep totals, diaper frequency, and feeding interval trends.

### 📈 WHO Growth Percentile Curves
- Official **World Health Organization (WHO) Growth Standards** (0–24 months) integrated directly into the app.
- Weight-for-age, Length-for-age, and Head circumference-for-age charts with standard percentiles (P3, P15, P50, P85, P97).
- Automatically calculates and displays your baby’s exact percentile on every measurement entry.

### 👥 Multi-Caregiver Profiles & Security
- **Mom & Dad Profiles**: Switch active caregiver with one tap in the header (e.g., Mom / Dad / Grandparent / Babysitter).
- **Event Attribution**: Every single log records who recorded it (*"Logged by Mom"* / *"Logged by Dad"*).
- **Shared Family Password**: Protect your family’s tracker with a simple password/PIN and persistent session authentication.

### 🌐 Bilingual Support
- Seamless one-tap language switcher in Settings:
  - 🇬🇧 **English**
  - 🇳🇱 **Nederlands** (Flemish / Dutch)

---

## 🚀 Quick Start with Docker Compose (Recommended)

The easiest way to run Baby Tracker on a home server (Raspberry Pi, TrueNAS, Unraid, Synology, Proxmox, or Linux VM):

### 1. Create a `docker-compose.yml`

```yaml
services:
  babytracker:
    image: beyensj/babytracker:latest
    container_name: babytracker
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATA_DIR=/app/data
      - TZ=Europe/Brussels
      - FAMILY_PASSWORD=babytracker
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://localhost:3001/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))\""]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
```

### 2. Launch the Application

```bash
docker compose up -d
```

### 3. Open in Browser

Navigate to **`http://<your-server-ip>:3001`**.

> **🔒 Default Credentials:**
> - **Default Family Password**: `babytracker` (can be customized via `FAMILY_PASSWORD` in your docker-compose file)
> - *You can also change this password anytime directly under **Settings (⚙️) ➔ Security & Password**.*

---

## 🐳 Running with Docker CLI

If you prefer running a single standalone container without Compose:

```bash
docker run -d \
  --name babytracker \
  --restart unless-stopped \
  -p 3001:3001 \
  -e TZ=Europe/Brussels \
  -e FAMILY_PASSWORD=babytracker \
  -v $(pwd)/data:/app/data \
  beyensj/babytracker:latest
```

---

## ⚙️ Configuration & Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | The internal and exposed HTTP/WebSocket server port. |
| `DATA_DIR` | `/app/data` | Container path where `babytracker_db.json` and photos are stored. |
| `FAMILY_PASSWORD` | `babytracker` | Initial shared family password for access protection. |
| `NODE_ENV` | `production` | Set to `production` for optimized caching and static serving. |
| `TZ` | `Europe/Brussels` | Server timezone (e.g. `UTC`, `America/New_York`, `Europe/Amsterdam`). |

---

## 🔒 Reverse Proxy & HTTPS (Recommended for PWA)

Progressive Web App features (such as **Android Notification Tray Controls** and **Home Screen Installation**) require a secure context (**HTTPS** or `localhost`). 

Make sure your reverse proxy forwards WebSocket connections (`/ws`).

### Nginx Example
```nginx
server {
    listen 443 ssl http2;
    server_name baby.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/baby.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/baby.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy Example
```caddy
baby.yourdomain.com {
    reverse_proxy 127.0.0.1:3001
}
```

---

## 💾 Data Persistence & Backups

All data and attached photos are stored in clean, portable directories on disk:

```
./data/
├── babytracker_db.json
└── media/
    └── *.webp
```

- **Zero Database Engines Required**: No complex PostgreSQL or MongoDB setup needed.
- **Atomic Writes**: Writes are performed atomically to temporary files before being swapped, eliminating risk of file corruption during power interruptions.
- **Easy Backups**: Backing up your child’s entire history is as simple as copying the `./data` folder:
  ```bash
  # Create a timestamped backup
  cp -r ./data ./data_backup_$(date +%Y%m%d)
  ```
- **In-App JSON Export**: You can also download a complete JSON backup at any time from **Settings ➔ Backup & Data ➔ Export Backup**.

---

## 📱 Installing on Your Phone

Baby Tracker is designed to feel and behave like a native iOS and Android app.

### 🍏 iPhone & iPad (Safari)
1. Open your Baby Tracker URL in **Safari**.
2. Tap the **Share** button (box with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. The app will launch in full-screen standalone mode with no browser address bar.

### 🤖 Android: Progressive Web App (PWA)
1. Open your Baby Tracker URL in **Chrome**.
2. Tap the three dots (⋮) in the top-right corner.
3. Tap **Install app** (or **Add to Home screen**).
4. Enjoy home-screen access, quick shortcuts, and lock-screen alerts.

### ⚡ Android: Native APK with Live Ticking Stopwatch
For a real **second-by-second live ticking chronometer** in your Android notification shade without any battery drain, use the native Android app built with Capacitor:
1. **Automated GitHub Builds**: Every push builds a ready-to-install debug APK via GitHub Actions.
2. Go to the **Actions** tab on your GitHub repository.
3. Select the latest **Build Android APK** workflow run.
4. Under **Artifacts** at the bottom, download `babytracker-android-debug-apk.zip`, extract `app-debug.apk`, and install it on your Android phone.
5. On first launch, enter your Baby Tracker server URL (e.g. `http://192.168.1.150:3001` or your public domain) and tap **Test Connection** & **Save**.
6. When nursing, sleeping, or pumping timers run, Android's SystemUI natively counts up the elapsed seconds right in your notification shade!

---

## 📥 Importing Data from Nara Baby / Other Trackers

Switching from Nara Baby or another baby tracker? You won't lose a single diaper change or feeding:

1. In your existing tracker app, export your data as a **CSV** file.
2. Open Baby Tracker and navigate to **Settings (⚙️) ➔ Data Management ➔ Import History**.
3. Select your CSV or JSON export file.
4. The intelligent importer will:
   - Auto-detect child profile (name, birthdate, sex).
   - Recognize all feeding types, durations, sleep sessions, diaper colors/textures, growth entries, and doctor notes.
   - Map caregivers automatically.
   - Deduplicate entries to prevent duplicate logs.
5. Review the import preview summary and tap **Confirm Import**.

---

## 🛠️ Local Development

To contribute or run the development server locally:

```bash
# 1. Clone the repository
git clone https://github.com/beyensj/babytracker.git
cd babytracker

# 2. Install dependencies
npm install

# 3. Start development environment
# (Runs Vite frontend on port 5173 + Express WebSocket backend on port 3001)
npm run dev
```

Build the production bundle:
```bash
npm run build
```

Run linting:
```bash
npm run lint
```

Sync Android Capacitor assets:
```bash
npx cap sync android
```

Build the local container image:
```bash
docker build -t beyensj/babytracker:latest .
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Built with ❤️ for parents who just want an honest, private, and calm baby tracker.
