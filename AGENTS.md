# Chiswick Sculling Ladder - Project Context

## Overview
Website for the Chiswick Sculling Ladder, a rowing training group on the Thames Tideway.
Three HTML pages: `index.html` (landing/login), `app.html` (admin/user ladder), `ranking.html` (public rankings).

## Architecture
- **HTML**: Structural markup, links to CSS and JS modules
- **CSS**: `css/style.css` (shared), `css/app.css`, `css/ranking.css`, `css/login.css`
- **JS**: ES modules in `js/` (imported via `<script type="module">`)
- **Backend**: `server.py` (pure Python stdlib, no dependencies)
- **Data**: `data/scullers.json` (single source of truth), `data/votes.json`, `data/config.json`, `data/history/`

## JS Modules

| Module | Responsibility |
|--------|---------------|
| `js/app.js` | Entry point for app.html — init, state, event binding, rendering |
| `js/rankings.js` | Pure business logic: `computeRankings()`, `getComputedRank()`, `computeNextPositions()`, `computeLastPositions()` |
| `js/api.js` | All HTTP calls: `getVotes()`, `postVotes()`, `getConfig()`, `postConfig()`, `getHistory()`, `getHistoryDate()`, `saveHistory()`, `postRequest()`, `deleteRequest()`, `loadScullers()` |
| `js/auth.js` | Auth: `checkAuth()`, `isAdmin()`, `getUserId()`, `getMe()`, `logout()` |
| `js/toast.js` | `showToast(msg, type)` |
| `js/modal.js` | `openModal()`, `closeModal()`, `saveModal()`, `updateLadderInfo()` |
| `js/ui.js` | DOM helpers: `escHtml()`, date formatters, `getLadderDate()` |
| `js/landing.js` | Entry point for index.html — login, sculler picker |
| `js/ranking-page.js` | Entry point for ranking.html — podium, ranked/unranked lists |

## Ranking Algorithm (`js/rankings.js`)

### Core Concept
The ladder is NOT a race. Scullers start slowest-first. Each person only knows their result relative to the person directly adjacent to them:
- **"No" (not caught)** = the sculler was faster than the person behind them → they improve
- **"Yes" (caught)** = the sculler was caught by the person behind them → they don't improve
- **Last person** = no one behind → no caught status

### The Chain Rule (CRITICAL)
Each "No" sculler starts a chain of consecutive "No" people. The chain ends at the first "Yes" person (boundary) or the last person in the lineup (endpoint). The boundary/endpoint person is included in the chain for rank purposes.

**Algorithm:**
1. Identify chains: consecutive "No" people + boundary (Yes person or last person)
2. Find the fastest (lowest) rank in the complete chain (including boundary)
3. The "No" people get consecutive ranks starting from that fastest rank, preserving lineup order
4. The boundary/endpoint person gets the next rank after the last "No" person
5. If two chains compete for the same rank, the chain whose first person starts **later** in the lineup gets priority. The earlier chain shifts slower
6. No duplicate ranks are ever created

### Known Correct Results (3 people, block [12,13,14])
| Scenario | Result |
|----------|--------|
| Inkeri(171) No, Simon(13) No, ABA(12) last | S=13, A=14 (chain fastest=13) |
| Inkeri(171) Yes, Simon(13) No, ABA(12) last | S=13, A=14 (chain fastest=13) |
| Inkeri(171) No, Simon(13) Yes, ABA(12) last | I=13, S=14, A=12 (chain fastest=13, boundary follows) |

## User Preferences
- User is Italian-speaking (Maurizio Conza)
- Conversations mix Italian and English
- Prefers step-by-step explanations with examples before code changes

## File Structure
```
├── index.html          (landing/login page)
├── app.html            (admin/user ladder page)
├── ranking.html        (public rankings page)
├── server.py           (Python backend, port 8080)
├── test_rankings.js    (unit tests for rankings.js)
├── package.json        (Node.js config for ES module tests)
├── css/
│   ├── style.css       (shared styles)
│   ├── app.css         (app.html styles)
│   ├── ranking.css     (ranking.html styles)
│   └── login.css       (index.html styles)
├── js/
│   ├── app.js          (app.html entry point)
│   ├── rankings.js     (ranking algorithm)
│   ├── api.js          (HTTP calls)
│   ├── auth.js         (authentication)
│   ├── toast.js        (notifications)
│   ├── modal.js        (edit ladder modal)
│   ├── ui.js           (DOM helpers)
│   ├── landing.js      (index.html entry point)
│   └── ranking-page.js (ranking.html entry point)
├── data/
│   ├── scullers.json   (255 scullers - single source of truth)
│   ├── config.json     (ladder schedule)
│   ├── votes.json      (persisted votes/state)
│   └── history/        (session snapshots)
└── render.yaml         (Render deployment)
```

## Sculler Data Format
```json
{
  "id": 1,
  "name": "Aba C",
  "club": "PTRC",
  "rank": "85",
  "lastStartPos": "1",
  "lastCaught": "PathFind",
  "nextParticipating": null,
  "nextStartPos": null
}
```

## Deployment
- Render free tier, Python 3.11
- `python3 server.py` on PORT env var
- GitHub: `https://github.com/mconza/chiswick-sculling-ladder`
- Render: `https://chiswick-sculling-ladder.onrender.com`
- `data/votes.json` and `data/config.json` tracked in git for persistence
