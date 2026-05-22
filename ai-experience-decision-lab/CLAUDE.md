# AI Experience Decision Lab

## What this is
A React + Vite simulation app for Cambridge executive education. 
Teams design an AI-powered SME banking customer journey across 
7 stages, making trade-off decisions under time pressure.

## Two modes
- **Play mode** (?team=Name&timer=20): Students play blind — no 
  feedback on optimal choices, timer, grey KPI chips
- **Reveal/Default mode** (no params or ?reveal=true): All features 
  visible — badges, optimal path, Decision Insight, counterfactuals

## Key files
- src/data/scenario.json — ALL game content (7 rounds, 21 options)
- src/App.jsx — main component, mode detection, state management
- src/components/OptionCards.jsx — the A/B/C option cards
- src/components/ScorePanel.jsx — KPI detail drawer
- src/components/ExplanationPanel.jsx — Decision Insight drawer
- src/components/ValueChart.jsx — the CVI chart (Recharts)
- src/components/ScenarioHeader.jsx — round title + Aisha context

## Deployment
- Currently on GitHub Pages: npm run deploy
- Moving to Vercel + marapometti.com

## Rules
- Never change scenario.json numbers without explicit instruction
- Play mode and reveal mode must show identical option text
- Cost figures must NOT appear in option labels
- The bestOptionId per round: R1=B, R2=C, R3=A, R4=A, R5=C, R6=B, R7=A
