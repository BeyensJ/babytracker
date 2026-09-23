# 🍼 Baby Tracker — Self-Hosted Baby Tracking PWA

A calm, privacy-first, self-hosted baby tracking web application with **instant multi-device sync between partners**, **live stopwatches**, **WHO growth percentiles**, **visual 7-day schedules**, and a **pitch-black OLED dark mode** designed specifically for late-night nursery feeds.

Zero subscriptions. Zero ads. Zero third-party telemetry. 100% of your baby's data stays on your own home server.

---

## ⚡ Quick Start with Docker Compose (Recommended)

Save the following as `docker-compose.yml`:

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

Run:
```bash
docker compose up -d
```

Open **`http://<your-server-ip>:3001`** in your browser.

> **🔒 Default Credentials:**
> - **Default Family Password**: `baby2026`
> - *You can change this password immediately in **Settings (⚙️) ➔ Security & Password**.*

---

## 🐳 Quick Start with Docker CLI (`docker run`)

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

## 🌟 Key Features

- **⏱️ Live Stateful Timers**: Breastfeeding (Left / Right / Both with side switching and retroactive start adjustments), Sleep & Naps, and Pumping.
- **🔄 Real-Time Family Synchronization**: Powered by WebSockets (`/ws`). When Mom logs a feeding or starts a timer, Dad’s device updates instantly (<50ms) without refreshing.
- **🌙 True Pitch-Black OLED Mode**: Pure `#000000` canvas with WCAG AAA contrast ratio. Gentle on tired eyes and won't wake baby up during 3:00 AM feeds.
- **📱 PWA & Android Notification Tray**: Installable on iOS Safari and Android Chrome. Live timers persist in the Android notification drawer with active countdowns and Stop buttons.
- **📊 7-Day Visual Schedule**: Stacked Monday–Sunday multi-day rhythm with cross-midnight sleep slices and feeding/diaper pins.
- **📈 WHO Growth Curves**: Official World Health Organization percentile curves (P3 to P97) for weight, length, and head circumference.
- **📥 Universal Data Importer**: Import your historical data from Nara Baby CSV or JSON backups with deduplication and caregiver attribution.
- **🌐 English & Dutch**: Seamless one-tap language switching.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | Exposed port for web interface and WebSocket synchronization |
| `DATA_DIR` | `/app/data` | Path inside container where database is stored |
| `NODE_ENV` | `production` | Set to `production` for optimized asset delivery |
| `TZ` | `Europe/Brussels` | Timezone for timestamps and visual schedules |

---

## 💾 Volumes & Persistence

| Host Path | Container Path | Purpose |
| :--- | :--- | :--- |
| `./data` | `/app/data` | Stores the persistent database (`babytracker_db.json`) |

All data is kept in an atomic, human-readable JSON file. Backups are as simple as copying the `./data` directory or downloading a backup file directly from the in-app settings menu.

---

## 🔒 Reverse Proxy & HTTPS (PWA Requirements)

To enable Progressive Web App installation and Notification Tray timers, run Baby Tracker behind an HTTPS reverse proxy (such as Nginx, Caddy, Traefik, or Cloudflare Tunnel) and ensure WebSocket upgrades are enabled:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

---

## 🔗 Links & Source Code

- **GitHub Repository**: [https://github.com/beyensj/babytracker](https://github.com/beyensj/babytracker)
- **Bug Reports & Feature Requests**: [GitHub Issues](https://github.com/beyensj/babytracker/issues)
- **License**: MIT
