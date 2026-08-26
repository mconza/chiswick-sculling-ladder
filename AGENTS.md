# Chiswick Sculling Ladder - Project Context

## Overview
Website for the Chiswick Sculling Ladder, a rowing training group on the Thames Tideway.
Main file: `app.html` (single-page app with inline JS, ~846 lines).

## Ranking Algorithm (computeRankings)

### Core Concept
The ladder is NOT a race. Scullers start slowest-first. Each person only knows their result relative to the person directly adjacent to them:
- **"No" (not caught)** = the sculler was faster than the person behind them → they improve
- **"Yes" (caught)** = the sculler was caught by the person behind them → they don't improve
- **Last person** = no one behind → no caught status

### Block
The block of contested ranks is `[min_rank, min_rank + N - 1]` where N = number of starters.

### The Chain Rule (CRITICAL)
The cascade of "No" improvements propagates from the slowest to the fastest starter. **The chain STOPS at the first "Yes" (caught) person.** That "Yes" person is the boundary.

Example with real data (10 starters):
```
Pos 1: Inkeri (207) - No  ← chain starts here
Pos 5: Jacqui S (117) - No
Pos 11: Caroline B (51) - No
Pos 12: Kirsty R-D (49) - No
Pos 13: Ainslie (50) - No
Pos 15: Jonathan F (53) - Yes ← chain STOPS here
Pos 16: Kathryn H (52) - No
Pos 18: Devlin L (47) - Yes
Pos 19: Guy (36) - No
Pos 20: Daisy W (35) - No
```
- Inkeri "No" → takes Jonathan's position (the first "Yes")
- Jonathan gets bumped
- Chain does NOT continue past Jonathan

### Known Correct Results (3 people, block [12,13,14])
| Scenario | Result |
|----------|--------|
| Inkeri(171) No, Simon(13) No, ABA(12) last | I=12, S=13, A=14 |
| Inkeri(171) Yes, Simon(13) No, ABA(12) last | S=12, A=13, I=171 |
| Inkeri(171) No, Simon(13) Yes, ABA(12) last | I=13, S=14, A=12 |

### Algorithm Fix (Implemented)
1. Assign initial block positions by START ORDER (slowest = worst position in block)
2. Run cascade from fastest to slowest
3. After cascade, displaced people fill free positions (lowest first)
4. Revert people whose original rank was outside the block AND caught != "No"

## User Preferences
- User is Italian-speaking (Maurizio Conza)
- Conversations mix Italian and English
- Prefers step-by-step explanations with examples before code changes
- Wants to verify each example before moving to the next

## File Structure
- `app.html` - Main app (admin page with ranking logic, ~846 lines)
- `index.html` - Landing page with rules
- `ranking.html` - Rankings display
- `server.py` - Python backend, port 8080
- `data.json` - Sculler data
- `data/votes.json` - Persisted votes
- `js/app.js` - Client-side JS
- `css/style.css` - Styles

## Key Functions in app.html
- `computeRankings()` (line ~134) - Ranking algorithm (fixed)
- `computeNextPositions()` (line ~371) - Computes start positions for next ladder
- `computeLastPositions()` (line ~415) - Computes positions from last ladder
- `getComputedRank(s)` (line ~200) - Returns computed rank for a sculler
- `renderTable()` (line ~423) - Renders the admin table
- Button handlers (line ~515) - Handle caught/confirmed status changes

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
