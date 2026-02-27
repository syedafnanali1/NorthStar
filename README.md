# ⭐ North Star — Goal Tracker

A beautiful, fully-featured goal tracking web app. **No server required** — open `index.html` directly in any browser.

---

## 🚀 Getting Started

```
Double-click index.html  →  Opens in browser  →  Done.
```

No build step. No npm install. No server. Just HTML + CSS + JS.

---

## 📁 File Structure

```
northstar-app/
├── index.html              ← Main app entry point
├── css/
│   ├── base.css            ← CSS variables, splash screen, layout, sidebar
│   ├── components.css      ← Goal cards, calendar, circle, modals
│   └── features.css        ← Dark mode, analytics, auth, achievements
├── js/
│   ├── data.js             ← App data: GOALS, dayLogs, intentionsStore, momentum
│   ├── calendar.js         ← Calendar, daily log, always-panel, goal strip
│   ├── goals.js            ← Goal cards, modal, smart metric detection
│   └── app.js              ← Init, nav, constellation, analytics, auth, profile, export/import
└── README.md
```

---

## ✨ Features

### 🎯 Goal Tracking
- Create goals with categories (Health, Finance, Writing, Body, Mindset)
- Progress rings, progress bars, milestone chips
- Linked daily intentions / sub-tasks per goal
- Timeframe tracking (start → end date)

### 🤖 Smart Metric Detection
- Write `10km morning run` as a linked intention → app auto-detects the km value
- Write `write 700 words` → auto-logs 700 words to your writing goal
- Write `transfer $300` → auto-logs $300 to your savings goal
- **No manual logging required** when your intention describes the metric

### 📅 Calendar & Daily Log
- Full monthly calendar with mood tracking
- Click any day to see/edit intentions and goal progress
- Goal dots on calendar cells show active goals per day
- Category filter pills

### ⭐ Constellation View
- Data-driven star map based on actual activity
- Switch between **7D / 30D / 3M / 6M / 1Y** views
- Active days glow brighter; inactive days fade

### 🚀 Momentum Score
- Animated ring showing your 0–100 momentum score
- Calculated from: streak × completion rate × goal progress × active days
- 14-day bar chart history

### 📊 Analytics Dashboard
- KPI cards: Active goals, avg progress, streak, momentum
- 7-day task completion bar chart
- Category progress breakdown
- Lifetime statistics

### 🏆 Achievements (12 badges)
- First Star, Constellation, Ignition, Electric, Unstoppable
- Bullseye, Halfway There, Champion, Storyteller
- Accountability, Launchpad, Data Driven
- Auto-unlocked as you hit milestones

### 🔍 Search & Filter
- Real-time search across goal names, categories, intentions
- Category filter pills (Health / Finance / Writing / Body / Mindset / Custom)

### 📝 Add a Moment
- Click "+ Add a moment" on any goal
- Write a short reflection (max 100 words)
- Visible to your accountability circle

### 👥 Accountability Circle
- Click "+" on any goal to open peer selector
- Choose from circle members or invite by email
- Circle members can post check-ins and react

### 🌓 Dark Mode
- Click the 🌙 button in the sidebar
- Persists across sessions via localStorage
- Smooth transitions on all elements

### 👤 Profile
- Click ⚙️ → fill in name, email, age, location, bio
- Upload a profile photo
- Avatar shown in sidebar

### 🔐 Auth Screen
- Email/password sign in or sign up
- Google OAuth button (demo — wire to real Google OAuth for production)
- Facebook OAuth button (demo)
- "Skip / demo mode" option

### 💾 Export / Import
- Export all goals + day logs as a JSON backup file
- Import from a previous backup (merges, no duplicates)

---

## 🔧 Making It Production-Ready

For a real deployment with Google/Facebook OAuth and a backend:

1. **Backend**: Use Node.js + Express + MongoDB (see `/server/` folder in the MERN version)
2. **Google OAuth**: Register at https://console.cloud.google.com → replace demo handler in `authOAuth('google')`
3. **Facebook OAuth**: Register at https://developers.facebook.com → replace demo handler
4. **Persistence**: Replace `localStorage` with API calls to your backend
5. **Deploy**: Netlify / Vercel for static frontend; Railway / Render for Node.js backend

---

## 🎨 Tech Stack

- **HTML5** — semantic, accessible markup
- **CSS3** — custom properties, grid, flexbox, animations
- **Vanilla JavaScript** — no frameworks, no dependencies
- **Fonts**: Playfair Display + DM Sans + DM Mono (Google Fonts)
- **Storage**: localStorage for persistence

---

## 📐 Code Organization

| File | Responsibility |
|------|---------------|
| `data.js` | All app data (GOALS array, dayLogs, intentionsStore), momentum calculation, constellation rendering |
| `calendar.js` | Calendar grid, day selection, daily log panel, always-visible intentions panel |
| `goals.js` | Goal card rendering, smart metric detection, goal modal, logging |
| `app.js` | App initialization, navigation, circle/feed, analytics, auth, profile, export/import |

---

*Built with ♥ — North Star v4.0*
