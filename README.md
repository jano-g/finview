# FinView — Personal Finance Intelligence

Self-hosted dashboard that ingests **Revolut** and **Tatra banka** statement exports,
categorizes every transaction, handles internal transfers (so nothing is counted twice),
and lets you explore spending with charts and month-to-month comparisons.

Built with Next.js + SQLite. Runs as a single Docker container on your home machine.

---

## What it does

- **Upload** Revolut (`.csv`/`.xlsx`) and Tatra banka (`.csv`) exports — drag & drop
- **Auto-categorizes** by variable symbol → IBAN → merchant text (rules in `lib/rules.ts`)
- **Deduplicates** automatically (re-uploading overlapping statements is safe)
- **Internal transfers** (Tatra → Revolut top-ups, own-account moves, the >€50k house-sale / mortgage repayment) are tagged and **excluded from spend/income totals** but kept visible
- **VKLAD cash deposits** surfaced as a dedicated income figure (your business income)
- **Mortgage / loan** repayments (SPLATKA ISTINY/UROKU) tracked as their own category
- **Review inbox** — assign categories to anything uncategorized; optionally turn that choice into a rule that auto-applies to similar future transactions; add your own categories
- **Compare** any two months side by side, per category

## Categories seeded from your accounts

Belá (cleaning/repairs/gardener/water all in one), per-property utilities & apartment
payments (Gorkého byt, Gorkého garzónka, Slnečnice/Mama, Mestská-sold), Insurance,
Investment (mine + Eliška), Family-Mama (MATI), Lucia, Porn (mmbill), Mortgage/Loans,
Food, Transport, Subscriptions, Donations, plus Income (vklad/other) and Internal transfer.

Edit or extend these any time in `lib/rules.ts`, or create them live in the Review tab.

---

## Run it on your machine (Docker)

Prerequisites: **Docker Desktop** (Windows/macOS/Linux).

```bash
git clone https://github.com/jano-g/finview.git
cd finview
docker compose up -d --build
```

Open **http://localhost:3000** on the same machine, or
**http://<this-machine-LAN-IP>:3000** from any device on your home network, or
**http://<tailscale-name>:3000** from anywhere via Tailscale.

Your data lives in `./data/finance.db` on the host (mounted into the container),
so it survives rebuilds and updates.

### Updating later

```bash
git pull
docker compose up -d --build
```

Data is preserved because it's in the mounted `./data` volume, not the image.

---

## Run it without Docker (dev)

Requires Node.js 20+.

```bash
npm install          # compiles the better-sqlite3 native module
npm run dev          # http://localhost:3000
```

---

## First-time GitHub setup

```bash
cd finview
git init
git add .
git commit -m "Initial FinView"
git branch -M main
git remote add origin https://github.com/jano-g/finview.git
git push -u origin main
```

(Create the empty `finview` repo on GitHub first, without a README so the push isn't rejected.)

---

## Security note

There is **no login**. Keep it to your LAN + Tailscale; do not expose port 3000 to the
public internet without adding authentication in front of it.

## Project structure

```
finview/
├── app/
│   ├── page.tsx              # Dashboard (upload, tiles, charts)
│   ├── review/page.tsx       # Categorize uncategorized + VKLAD view + add categories
│   ├── compare/page.tsx      # Month-vs-month comparison
│   └── api/                  # upload, stats, transactions, categories, rules
├── lib/
│   ├── parsers/revolut.ts    # Revolut CSV/XLSX parser
│   ├── parsers/tatra.ts      # Tatra banka CSV parser (Slovak formats, VS as string)
│   ├── rules.ts              # ALL categorization knowledge — edit here
│   ├── categorize.ts         # Rule engine, internal-transfer & income detection
│   └── db.ts                 # SQLite schema + seed
├── data/                     # finance.db (gitignored, host-mounted)
├── Dockerfile
└── docker-compose.yml
```

## How categorization decides

1. **Internal?** own-account IBAN, "Revolut" top-up text, or Tatra amount ≥ €50,000
   (house sale / mortgage repayment) → `Internal transfer`, excluded from totals
2. **VKLAD?** positive amount + "vklad" → `Income - business (vklad)`
3. **Rules** in priority order: variable symbol → IBAN → description text
4. Positive with no rule → `Income - other`; negative with no rule → `Uncategorized` (lands in Review)

The Investment IBAN is shared by your investment and Eliška's; amounts ≤ €400 or
references mentioning Eliška are routed to `Investment - Eliška`.
