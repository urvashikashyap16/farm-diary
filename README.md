# Farm Diary: clickable prototype

**Offline, voice-based record keeping for small farmers.**
Prototype for the SEVA First Innovation Challenge 2026 (Delhi Govt / DTU), College category.
Team: Urvashi Kashyap (solo), Graphic Era Hill University, Dehradun.
Registration ID: SEVA-2026-REG-001-OP-209.

A farmer speaks an expense, a sale or a harvest in Hindi. The app turns it into a clean entry, saves it on the phone with no internet, syncs later, and reads out the yearly profit.

> **What this is, and is not.** This repository is a *web prototype* that shows the user flow and runs the real entry-parsing logic. Speech is simulated: you tap or type a phrase instead of speaking. The production app is planned as an Android app (React Native) with offline speech recognition (Vosk) on the phone. The sample entries are illustrative, not field data.

## Try it

**Live link:** https://urvashikashyap16.github.io/farm-diary/

**Run on your computer (no install):**

```bash
python3 -m http.server 8000      # Windows: py -m http.server 8000
# open http://localhost:8000 in Chrome
```

Or just double-click `index.html`. Localhost is better because browsers allow the Hindi voice and microphone features on it.

## What to click (about two minutes)

1. Tap **No internet / Online** in the top bar to go offline.
2. Tap the big microphone, then pick a phrase (from the side panel or the screen).
3. On **Check entry**, tap **Yes, save**. It shows "saved offline".
4. Add a sale and a harvest the same way.
5. Open **Summary**: sales vs expenses per crop, and total profit. Tap **Read aloud**.
6. Go back online: saved entries sync.

Phrases to try:

| Say (Roman Hindi) | Understood as |
|---|---|
| Aaj beej par 1200 rupaye lage | Seed expense, ₹1,200, today |
| Kal gehu mein khaad par dhai hazaar rupaye lage | Fertilizer for wheat, ₹2,500, yesterday |
| Aaj mazdoori par paanch sau rupaye diye | Labour expense, ₹500 |
| Kal 10 quintal gehu becha 2500 rupaye quintal | Wheat sale, 10 quintal × ₹2,500 = ₹25,000 |
| Aaj 12 quintal dhaan kata | Rice harvest, 12 quintal |

Devanagari works too, for example `आज बीज पर 1200 रुपये लगे`.

## How it works

```
speech (Vosk, offline)  ->  text  ->  rule-based parser  ->  entry  ->  confirm  ->  local database  ->  sync queue
                                       js/parser.js                      (SQLite in the real app)
```

- **`js/parser.js`** reads Hindi number words ("dhai hazaar" = 2,500, "paanch sau" = 500, "do hazaar paanch sau" = 2,500), units (quintal, kg, bag), crops, items, relative dates (aaj, kal, parso) and the entry type (expense, sale, harvest). If it is unsure it flags the entry and asks the farmer to say it again, instead of saving a wrong number.
- **`js/app.js`** is the prototype screens: home, listening, confirm, diary, summary, the offline/online switch with a sync queue, and read-aloud (browser text-to-speech, `hi-IN`).
- Every entry keeps the spoken text and a confidence value, so wrong transcriptions can be found and fixed.

## Project layout

```
index.html          page shell
css/style.css       styles
js/parser.js        Hindi entry parser (pure functions, tested)
js/app.js           prototype UI and state (in memory)
tests/parser.test.js  parser tests
docs/BOM.md, BOM.csv  bill of materials and estimated cost
.github/workflows/pages.yml   auto-deploy to GitHub Pages
```

## Cost

See [`docs/BOM.md`](docs/BOM.md) for the itemized bill of materials (estimated total ₹22,770).

## Tests

```bash
npm test      # Node 18+, no dependencies; runs 9 parser tests
```

## Deploy as a public link (GitHub Pages)

1. Create a new public repository, for example `farm-diary`.
2. Upload all these files (or `git init`, `git add .`, `git commit`, `git push`).
3. In the repo go to **Settings > Pages > Build and deployment > Source: GitHub Actions**.
4. Push to `main`. After a minute the link appears under **Settings > Pages**, in the form `https://<your-username>.github.io/farm-diary/`.
5. Put that link in the section above and in the SEVA portal's prototype field.

## Known limits of the prototype

- Speech is simulated. The optional "real microphone" button uses Chrome's online speech recognition for demo only; it is not the offline engine.
- Data lives in memory and resets on reload. The real app uses an on-device SQLite database.
- The parser covers common farm words and numbers. A larger word list and field testing with farmers are planned.
- Read-aloud depends on a Hindi voice installed in the browser.

## Roadmap (from the challenge plan)

1. Android app (React Native) with offline Vosk Hindi recognition on a low-end phone.
2. SQLite ledger and background sync to a free-tier cloud backend.
3. Parser accuracy tests on recorded phrases, then a small pilot with local farmers.
4. Optional server-side recognition (AI4Bharat IndicConformer) for hard cases.

## License

MIT. See `LICENSE`.
