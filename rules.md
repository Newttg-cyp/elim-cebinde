# Project Rules & Guidelines - Elim Cebimde

This document outlines the architectural rules, coding standards, design constraints, and guidelines for the **Elim Cebimde** AI-assisted financial discipline application.

---

## 1. Tech Stack Constraints

### Mobile Frontend
- **Framework:** React Native (Expo).
- **Styling:** Vanilla StyleSheet. Keep a cohesive dark-mode theme matching the brand colors:
  - Background: `#0F172A` (Slate Dark)
  - Card/Surface: `#1E293B` (Slate Card)
  - Primary Accent: `#3B82F6` (Blue)
  - Safe/Success: `#10B981` (Emerald Green)
  - Alarm/Impulse: `#F43F5E` (Rose/Red)
  - Warning/Caution: `#EAB308` (Amber/Yellow)
  - Subtext: `#94A3B8` (Muted Slate)
- **Navigation:** Native-like tab routing using premium emoji icons or custom vector icons.

### Backend API
- **Framework:** Node.js + Express.
- **Database:** SQLite (`database.sqlite`) for prototyping.
- **Structure:** Modular architecture divided into:
  - `src/models/` (Schema initialization)
  - `src/controllers/` (Business logic)
  - `src/routes/` (Endpoints)
  - `src/index.js` (Server bootstrapper)

### Browser Simulator
- **File:** `run_simulator.py`
- **Purpose:** Fully runs a lightweight Python 3.x web app on port `8700` simulating the React Native screens and Express endpoints, serving as a zero-dependency local testing dashboard.

---

## 2. Coding Standards & Conventions

- **Language:** All user-facing UI text, notifications, alerts, and chatbot replies must be in **Turkish (TR)**. Code, variables, functions, and comments must be in English.
- **State Management:** Keep React Native screen components modular and fetch backend API data asynchronously.
- **Comments:** Do not delete existing comments unless they are deprecated. Maintain documentation integrity.
- **APIs:** Always send dynamic headers incorporating Bearer tokens (`simulated_token_user_X`) to simulate authenticated sessions.

---

## 3. Financial Discipline Rules (Dürtüsel Harcama Kuralları)

- **Impulsivity Score Calculation:**
  $$\text{Impulsivity Score} = \left( \frac{\text{Number of Impulsive Expenses}}{\text{Total Number of Expenses}} \right) \times 100$$
- **Budget Alerter:** Every new expense must check category budgets. If the limit is exceeded, return a `BUDGET_EXCEEDED` alert object in the response.
- **Map Proximity Rule:** Proximity checks are calculated using a 65px Euclidean distance radius. The warning banner must ONLY fire when the user stays stationary inside a shop zone for **1.5 seconds**. Moving away or continuing to walk must immediately cancel the timer and hide active alerts.
