# Project Skills & Capabilities - Elim Cebimde

This document details the specialized capabilities, scripting skills, and custom features implemented within the **Elim Cebimde** project.

---

## 1. Local Python Simulator Skill

The simulator is built using a custom Python request handler.
- **Location:** [run_simulator.py](file:///c:/Users/Acer/Desktop/Yeni%20klas%C3%B6r/elim-cebimde/run_simulator.py)
- **Port:** `8700`
- **Port Release Routine:**
  If port `8700` (or `8000`/`8600`) is blocked, locate the process ID and terminate it:
  ```powershell
  netstat -ano | findstr 8700
  taskkill /F /PID <PID_NUMBER>
  ```
- **Execution:**
  ```powershell
  python elim-cebimde/run_simulator.py
  ```

---

## 2. Interactive Map & Proximity Skill

The simulator features a coordinate-based virtual map canvas with:
- **Shop Node Centers:**
  - Zara: $(80, 80)$
  - Starbucks: $(300, 90)$
  - Apple Store: $(80, 260)$
  - Burger King: $(290, 270)$
- **Interactions:**
  - `mousedown`/`touchstart` enables dragging.
  - `click` enables click-to-move animation.
  - `window.mousemove`/`touchmove` updates coordinates.
- **Proximity Math:**
  Euclidean distance: $d = \sqrt{(x_{avatar} - x_{shop})^2 + (y_{avatar} - y_{shop})^2}$
- **Audio Synthesis Helper:**
  Generates warning tone using Web Audio API:
  ```javascript
  const audioCtx = new AudioContext();
  // Osc + Gain node to play a high-low alert beep
  ```
- **CSS Radar Ring:**
  Pulsing visual highlights using a pseudo-element animation (`pulse-radar`).

---

## 3. Database Querying & Seeding Skill

The project runs an SQLite engine storing state in `database.sqlite` (or `backend/database.sqlite`).
- **Core Tables:**
  - `users`: Ahmet Yılmaz (ID: 1, email: `test@demo.com`)
  - `transactions`: Stores income & expense types with category, amount, description, and an `is_impulsive` flag.
  - `budgets`: Custom limit configuration per category.
  - `savings_goals`: Target amounts, current accumulated totals, and deadlines.
- **Checking State via Terminal:**
  ```powershell
  sqlite3 database.sqlite "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;"
  ```
