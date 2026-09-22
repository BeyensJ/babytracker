# 🍼 Baby Tracker

A calm, aesthetic baby tracking progressive web application with real-time multi-device sync, Android notification tray live timers, Nara Baby CSV import, visual schedules, and password protection.

---

## 🚀 Quick Start with Docker Compose

Deploy directly to your home server (Raspberry Pi, TrueNAS, Unraid, Synology, Proxmox, or Linux VM):

### 1. Clone or Copy Files
Create a folder on your server with `docker-compose.yml` and `.env`:

```bash
mkdir -p baby-tracker/data
cd baby-tracker
```

Download or create `docker-compose.yml`:
```yaml
services:
  babytracker:
    image: beyensj/babytracker:latest
    container_name: babytracker
    restart: unless-stopped
    ports:
      - "${PORT:-3001}:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATA_DIR=/app/data
      - TZ=${TZ:-Europe/Brussels}
    volumes:
      - ${DATA_PATH:-./data}:/app/data
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://localhost:3001/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))\""]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
```

### 2. Start the Service
```bash
docker compose up -d
```

Open `http://<server-ip>:3001` in your browser.

> **🔒 Default Credentials:**
> - **Default Family Password:** `baby2026` (changeable anytime in Settings)
> - **Caregivers:** Mom (Mom) & Dad (Dad)

---

## 💾 100% Data Persistence Guaranteed

All application data is stored in the host directory `./data/` (`./data/narababy_db.json`).
- Recreating containers (`docker compose down && docker compose up -d`) preserves all data.
- Upgrading to new versions or pulling updated images leaves `./data/` untouched.
- Backing up is as simple as copying the `./data` directory or `./data/narababy_db.json`.

---

## 🐳 Pushing to Docker Hub

To publish the image to Docker Hub under your account:

```bash
# 1. Log in to Docker Hub
docker login

# 2. Push the pre-tagged image
docker push beyensj/babytracker:latest
```

> **Note:** If building from scratch on another machine, run:  
> `docker build -t beyensj/babytracker:latest .`

### Pulling & Running on Home Server
Anywhere on your home server, simply place `docker-compose.yml` into any folder and run:
```bash
docker compose pull && docker compose up -d
```

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development environment (Vite frontend on 5173 + Express backend on 3001)
npm run dev
```

---

## 📱 Features

- **PWA & Android Notification Tray**: Active feeding and sleep timers persist in the Android notification drawer with live countdowns and Stop buttons.
- **Real-Time WebSocket Sync**: Instant two-way synchronization between Mom and Dad.
- **Visual Schedules**: 7-day multi-day week overview with cross-midnight sleep slices and month calendar.
- **Nara Baby Importer**: Automatic CSV parser preserving historical logs, units, notes, and caregiver attribution.
- **Secure Password Protection**: Family-wide authentication with persistent remembered sessions.
