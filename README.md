# 🍼 Baby Tracker

[![Docker Image](https://img.shields.io/badge/docker-beyensj%2Fbabytracker%3Alatest-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/beyensj/babytracker)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-installable-FF6B6B?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![OLED Friendly](https://img.shields.io/badge/OLED-True%20Black-000000?logo=apple&logoColor=white)](https://en.wikipedia.org/wiki/OLED)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A calm, privacy-first, self-hosted baby tracking progressive web application with **instant multi-device sync between parents**, **live timers**, **WHO growth percentiles**, **visual 7-day schedules**, and a **pitch-black OLED dark mode** designed specifically for late-night nursery feeds.

---

## ✨ Why Baby Tracker?

Most commercial baby apps lock your family's most intimate data behind steep recurring subscriptions, sell data to advertisers, or flood exhausted parents with ads at 3:00 AM. 

**Baby Tracker** is built differently:
- 🔒 **100% Self-Hosted & Private**: Your baby’s photos, feeding schedules, medical notes, and diaper logs stay entirely on your own hardware. Zero third-party telemetry, zero ads, zero subscriptions.
- 🔄 **Real-Time Partner Synchronization**: When Mom logs a feeding or starts a sleep timer on her phone, Dad’s device updates instantly (<50ms via WebSockets) without needing a page refresh.
- 🌙 **Pitch-Black OLED Mode**: Pure `#000000` canvas with WCAG AAA contrast ratios. Minimizes screen glare in dark nurseries so you don't wake the baby (and saves your phone's battery).
- 📱 **True PWA Experience**: Installable on iOS and Android with home-screen shortcuts, offline resilience, and Android notification tray live stopwatch controls.
- 📥 **Universal Importer**: Effortlessly import your historical logs from Nara Baby CSV or JSON backups with automatic caregiver attribution and unit detection.

---

## 🌟 Key Features

### ⏱️ Live Stateful Timers & Active Dock
- **Breastfeeding Stopwatch**: Left, Right, or Both sides with 1-tap switching and retroactive start time adjustments (e.g. *"Started 10m ago"*).
- **Sleep & Nap Tracker**: Live timer with multi-day cross-midnight visualization.
- **Pumping Stopwatch**: Double or single pump duration tracking with volume logged.
- **Persistent Live Dock**: Running timers remain visible and accessible across all tabs.
- **System Notification Drawer**: Timers persist in the Android notification tray with live countdowns and direct "Stop" action buttons.

### 📋 Complete Daily Activity Tracking
- **Feedings**: Nursing sessions (left/right durations), bottle feeds (breast milk or formula in ml/oz).
- **Diapers**: Wet, Dirty, Wet + Dirty, or Dry. Detailed poop colors (Yellow, Mustard, Brown, Green) and textures (Soft, Runny, Seedy, Mucous).
- **Sleep**: Full overnight stretches and day naps with wake window calculations and sleep continuity across midnight.
- **Pumping**: Volume per side, total output, and time elapsed since previous pump.
- **Growth**: Weight, Length/Height, and Head Circumference tracked over time with automatic percentiles.
- **Health & Medical**: Temperatures, medications (e.g. Vitamin D, Vitamin K, Paracetamol), vaccines, doctor checkups, and illness logs.
- **Milestones & Firsts**: Special moments (e.g. first social smile, rolling over) celebrated with animations and highlight badges.
- **Journal & Notes**: Free-form notes and observations tagged by caregiver.

### 📊 Visual Schedules & Analytics
- **7-Day Stacked Visual Schedule**: See an entire week (Monday–Sunday) stacked horizontally from 00:00 to 24:00 with overnight sleep slices and vertical feed/diaper pins.
- **Cross-Midnight Continuity**: Overnight sleeps that cross midnight are cleanly split and tagged with `▶ Continues overnight` and `◀ From previous night`.
- **Month Calendar Grid**: High-level calendar with activity dots and quick day selection.
- **Daily Rhythm View**: 24-hour visual schedule with daylight/night ambient shading.
- **Trend Charts**: Aggregated daily feeding volumes, sleep totals, diaper frequency, and feeding interval trends.

### 📈 WHO Growth Percentile Curves
- Official **World Health Organization (WHO) Growth Standards** (0–24 months) integrated directly into the app.
- Weight-for-age, Length-for-age, and Head circumference-for-age charts with standard percentiles (P3, P15, P50, P85, P97).
- Automatically calculates and displays your baby’s exact percentile on every entry.

### 👥 Multi-Caregiver Profiles & Security
- **Mom & Dad Profiles**: Switch active caregiver with one tap in the header (e.g., Mom / Dad / Grandparent).
- **Event Attribution**: Every single log records who recorded it (*"Logged by Mom"* / *"Logged by Dad"*).
- **Shared Family Password**: Protect your family’s tracker with a simple password/PIN and persistent session authentication.

### 🌐 Bilingual Support
- Seamless one-tap language switcher in Settings:
  - 🇬🇧 **English**
  - 🇳🇱 **Nederlands** (Dutch)

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
> - **Default Family Password**: `baby2026`
> - *You can change this password immediately under **Settings (⚙️) ➔ Security & Password**.*

---

## 🐳 Running with Docker CLI

If you prefer running a single standalone container without Compose:

```bash
docker run -d \
  --name babytracker \
  --restart unless-stopped \
  -p 3001:3001 \
  -e TZ=Europe/Brussels \
  -v $(pwd)/data:/app/data \
  beyensj/babytracker:latest
```

---

## ⚙️ Configuration & Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | The internal and exposed HTTP/WebSocket server port. |
| `DATA_DIR` | `/app/data` | Container path where `babytracker_db.json` is stored. |
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

All data is stored in a clean, human-readable JSON database on disk:

```
./data/
└── babytracker_db.json
```

- **Zero Database Engines Required**: No complex PostgreSQL or MongoDB setup needed.
- **Atomic Writes**: Writes are performed atomically to temporary files before being swapped, eliminating risk of file corruption during power interruptions.
- **Easy Backups**: Backing up your child’s entire history is as simple as copying the `./data` folder:
  ```bash
  # Create a timestamped backup
  cp ./data/babytracker_db.json ./data/babytracker_backup_$(date +%Y%m%d).json
  ```
- **In-App JSON Export**: You can also download a complete JSON backup at any time from **Settings ➔ Backup & Data ➔ Export Backup**.

---

## 📱 Installing the PWA on Your Phone

Baby Tracker is designed to feel and behave like a native iOS and Android app.

### 🍏 iPhone & iPad (Safari)
1. Open your Baby Tracker URL in **Safari**.
2. Tap the **Share** button (box with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. The app will launch in full-screen standalone mode with no browser address bar.

### 🤖 Android: Option A — Progressive Web App (PWA)
1. Open your Baby Tracker URL in **Chrome**.
2. Tap the three dots (⋮) in the top-right corner.
3. Tap **Install app** (or **Add to Home screen**).
4. Enjoy home-screen access and lock-screen alerts.

### ⚡ Android: Option B — Native App (.apk) with Live Ticking Stopwatch
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

Build the local container image:
```bash
docker build -t beyensj/babytracker:latest .
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Built with ❤️ for parents who just want an honest, private, and calm baby tracker.
