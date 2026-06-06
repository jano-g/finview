# FinView — Personal Finance Dashboard

Self-hosted dashboard that ingests **Revolut** and **Tatra banka** statement exports,
categorizes every transaction, excludes internal transfers from totals, and lets you
explore spending through charts and month-to-month comparisons.

**Stack:** Next.js 14 (App Router) · SQLite (better-sqlite3) · Recharts · TypeScript  
**Deployment:** single Docker container, runs on a home mini PC or any always-on machine.

---

## Features

| | |
|---|---|
| **Upload** | Drag-and-drop Revolut `.csv`/`.xlsx` and Tatra banka `.csv` exports |
| **Deduplicate** | Re-uploading overlapping statements is safe — each transaction has a deterministic hash ID |
| **Auto-categorize** | Rule engine: variable symbol → IBAN → description text, in priority order |
| **Internal transfers** | Tatra→Revolut top-ups, own-account moves, and amounts ≥ €50k (house sale/mortgage) are tagged and excluded from spend/income totals |
| **VKLAD income** | Cash ATM deposits detected separately as business income |
| **Mortgage tracking** | SPLATKA ISTINY / SPLATKA UROKU get their own category, not treated as internal |
| **Review inbox** | Assign categories to uncategorized items; optionally create a rule that auto-applies to similar transactions |
| **Bulk categorize** | Select multiple rows with checkboxes and apply a category in one click |
| **Sort** | Click any column header (Date, Description, Amount) to sort; click again to reverse |
| **Rules management** | View, create, and delete rules; re-apply all rules with one button |
| **Rename categories** | Rename a category and have it update everywhere — transactions and rules — atomically |
| **Analytics** | Monthly / yearly / all-time breakdown by category *or* group, spending or income, with a net-cashflow trend line and click-to-drill-down |
| **Category groups** | Roll related categories together (all apartments, all utilities, all investment) — auto from naming + custom groups |
| **Compare** | Side-by-side breakdown of any two months by category |
| **Seed export** | Export your custom categories and rules as code ready to paste into `lib/rules.ts` |

---

## Pages

### Dashboard (`/`)
- Upload panel — drag files here or click to browse
- Summary tiles: total income, total spending, VKLAD cash deposits, internal transfers
- Monthly spending bar chart (Recharts)
- Per-category spending breakdown for any selected month

### Analytics (`/analytics`)
A flexible breakdown view. Three toggles plus a period picker:

- **Period:** `Monthly` · `Yearly` · `All-time` (with a dropdown to pick the specific month/year)
- **View:** `By group` (rolls related categories up) · `By category`
- **Direction:** `Spending` · `Income`

Shows a horizontal bar chart of the top entries, a **net-cashflow trend line** (per-period net and cumulative), and a breakdown table with transaction count, % share, and total. In group view, click a group row to **expand** its member categories; click any row to **drill down** to the underlying transactions in Review.

Answers questions like *"how much on all apartments this year"* (Yearly + By group), *"mortgage per year"*, or *"how much did I invest"*.

**Category groups** are defined in `lib/groups.ts`:
- **Auto:** any category named `Prefix - Detail` groups by its prefix (`Apartment - …` → **Apartment**).
- **Custom:** `CUSTOM_GROUPS` lets you hand-build cross-cutting groups (e.g. all housing costs).
- Groups operate on whole categories — to isolate something inside a category (e.g. electricity within `Utilities - Belá`), first give it its own category via a rule.

### Review (`/review`)
Three views toggled by tabs:

- **Needs review** — transactions with category `Uncategorized`
- **VKLAD deposits** — all `Income - business (vklad)` rows with running total
- **All** — every transaction, searchable

**Sorting:** click Date, Description, or Amount column headers. Arrow (↑/↓) shows active sort and direction.

**Single categorization:**
1. Pick a category in the row's dropdown
2. Click **Apply** to save just that row, or
3. Click **+ rule** to save the row *and* create a rule that auto-applies to matching transactions

Each row shows the counterparty **IBAN** (truncated, full on hover) and **variable symbol** when present, so you can see what `+ rule` will match on: an IBAN rule, a VS rule, or — for card payments with neither — a description-keyword rule (which opens a dialog to confirm/edit the keyword).

**Drill-down filter:** opening Review with `?category=<name>` (and optionally `&month=<yyyy-mm>`) in the URL filters to that category — this is how the Dashboard and Analytics pages link in. A banner shows the active filter with a **Clear filter** button.

**Bulk categorization:**
1. Tick checkboxes on one or more rows (header checkbox selects all)
2. A bar appears showing how many rows are selected
3. Pick a category in the bar's dropdown and click **Apply to N**

**Add category:** type a name and click **+ Add category** to create a new category on the fly.

**Rename category:** click **Rename category**, choose the old name from the dropdown, type the new name, confirm. Updates the category everywhere — the categories table, all transactions, and all rules — in a single atomic DB transaction.

### Rules (`/rules`)
- Lists all categorization rules (seed rules + user-created)
- Source badge shows whether a rule was seeded or created by you
- **Delete** any rule — this triggers a full recategorization so affected transactions fall back to their default
- **Re-apply all rules** button — force a fresh categorization pass over all transactions (useful if rules seem out of sync)

### Compare (`/compare`)
- Pick two months from dropdowns
- Side-by-side table showing spending per category for both months and the difference
- Categories with no transactions in either month are hidden

---

## Categorization logic

For each transaction the engine checks in this order:

1. **Internal transfer?**
   - Counterparty IBAN is one of your own accounts (e.g. credit card account)
   - Description contains "revolut" (Tatra side of a top-up)
   - Revolut transaction description starts with "top-up by"
   - Tatra transaction with `|amount| ≥ €50,000` (house sale / large mortgage repayment)
   → tagged `Internal transfer`, excluded from totals

2. **VKLAD income?**
   - Amount is positive AND description contains "vklad"
   → tagged `Income - business (vklad)`

3. **Rules** (in priority order within each type):
   - Variable symbol match (exact)
   - IBAN match (exact); Investment IBAN uses an amount/text heuristic to split between `Investment - mine` and `Investment - Eliška`
   - Description text match (case-insensitive substring); can be scoped to one account

4. **Fallback**
   - Positive amount with no rule → `Income - other`
   - Negative amount with no rule → `Uncategorized` (lands in Review inbox)

**Manual overrides are preserved:** if you manually set a category on a transaction, re-running rules will not overwrite it.

---

## Seeded categories and rules

All seed data lives in `lib/rules.ts`. Edit freely.

**Categories:** Property/summer house · Utilities per property · Apartment fees per property · Insurance · Investment · Family · Partner · Porn · Mortgage / Loans · Shopping · Food & Groceries · Transport · Subscriptions · Donations · Income - business (vklad) · Income - other · Internal transfer · Other · Uncategorized

**Rule highlights:**
- Property/Belá: add IBANs for regular payees (repairs, cleaning, gardener, water)
- Utilities split by Tatra variable symbol — one IBAN, different VS per property
- Apartments split by variable symbol when a management company uses one IBAN for multiple properties
- Investment: if two purposes share one IBAN, `refine()` in `categorize.ts` splits by amount threshold or description keyword
- Subscriptions: Spotify, Netflix, Google, Apple, OpenAI, Anthropic, Dakboard, gym
- Transport: Bolt, DPB, GoScooters
- Food: Billa, Lidl, Tesco, Kaufland, Yeme, Bistro, Bao Brothers

---

## Saving your custom rules and categories back to the repo

Custom categories and rules you create via the UI are stored only in the SQLite database (gitignored). To have them appear out of the box on any fresh clone:

1. **Export:** open this URL on your running instance:
   ```
   http://localhost:3000/api/seed-export
   ```
   The response is plain text showing exactly what to add to `lib/rules.ts`.

2. **Paste:** add the new categories into `SEED_CATEGORIES` and the new rules into `SEED_RULES` in `lib/rules.ts`.

3. **Push:** commit and push. Fresh clones will now seed with your full rule set.

---

## API reference

All routes are under `/api/`. Every route sets `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.

### `POST /api/upload`
Parse, deduplicate, and store transactions from an uploaded file.

**Body:** `multipart/form-data` with field `file` (Revolut `.csv`/`.xlsx` or Tatra `.csv`)  
**Response:** `{ inserted, skipped, total }` — counts of new rows, duplicates, and total in file

### `GET /api/stats`
Aggregated figures for the dashboard and compare page.

**Params:** `?month=yyyy-mm` (optional) — if omitted returns all-time totals  
**Response:** `{ income, spending, vklad, internal, byCategory: [{category, total}] }`

### `GET /api/analytics`
Per-month, per-category spend & income (internal excluded). The Analytics page aggregates this client-side into Month/Year/All × Category/Group × Spending/Income.  
**Response:** `{ rows: [{ month, category, spend, income, n }], months: string[] }`

### `GET /api/transactions`
List transactions with optional filters.

**Params:**
- `month=yyyy-mm`
- `category=<name>`
- `uncategorized=1` — only `Uncategorized` rows
- `q=<text>` — case-insensitive description search
- `limit=<n>` — default 200, max 1000

**Response:** `{ rows: Transaction[] }`

### `PATCH /api/transactions`
Update category (manual override). Two modes:

**Single:** `{ id: string, category: string }`  
**Bulk:** `{ ids: string[], category: string }`  
**Response:** `{ ok: true }` or `{ ok: true, updated: n }`

### `GET /api/categories`
List all categories alphabetically.  
**Response:** `{ categories: string[] }`

### `POST /api/categories`
Create a new category.  
**Body:** `{ name: string }`

### `PATCH /api/categories`
Rename a category everywhere (categories table + all transactions + all rules), atomically.  
**Body:** `{ from: string, to: string }`

### `GET /api/rules`
List all rules ordered by id descending.  
**Response:** `{ rules: Rule[] }`

### `POST /api/rules`
Create a rule and immediately re-run categorization.  
**Body:** `{ match_type: 'iban'|'vs'|'text', match_value: string, account?: string, category: string }`

### `DELETE /api/rules?id=<n>`
Delete a rule by id and immediately re-run categorization.

### `POST /api/recategorize`
Force a full categorization pass over all non-manually-set transactions.  
**Response:** `{ ok: true }`

### `GET /api/seed-export`
Returns plain text (`text/plain`) showing the user-created rules and custom categories formatted as TypeScript to paste into `lib/rules.ts`. Only includes data not already in the hardcoded seed lists.

---

## Project structure

```
finview/
├── app/
│   ├── layout.tsx                    # Root layout, nav bar
│   ├── globals.css                   # Dark financial UI theme
│   ├── page.tsx                      # Dashboard
│   ├── analytics/page.tsx            # Analytics (period/group/direction breakdown + trend)
│   ├── review/page.tsx               # Review inbox (sort, bulk, rename, IBAN/VS, drill-down)
│   ├── rules/page.tsx                # Rules management
│   ├── compare/page.tsx              # Month comparison
│   └── api/
│       ├── upload/route.ts           # Parse + dedup + categorize + store
│       ├── stats/route.ts            # Aggregations
│       ├── analytics/route.ts        # Per-month per-category spend & income
│       ├── transactions/route.ts     # List + single/bulk PATCH
│       ├── categories/route.ts       # List + add + rename
│       ├── rules/route.ts            # List + create + delete + recategorize
│       ├── recategorize/route.ts     # Force full re-pass
│       └── seed-export/route.ts      # Export custom rules/cats as TS code
├── lib/
│   ├── parsers/
│   │   ├── revolut.ts               # Revolut CSV/XLSX → ParsedTx[]
│   │   └── tatra.ts                 # Tatra CSV → ParsedTx[] (Slovak formats, VS as string)
│   ├── rules.ts                     # SEED_CATEGORIES, SEED_RULES, internal config
│   ├── groups.ts                    # Category grouping for Analytics (auto + custom)
│   ├── chartTheme.ts                # Shared Recharts colors + readable tooltip styles
│   ├── categorize.ts                # Rule engine: categorize(), recategorizeAll()
│   ├── db.ts                        # SQLite singleton, schema, seeding
│   └── types.ts                     # ParsedTx type
├── data/
│   └── finance.db                   # SQLite database (gitignored, host-mounted volume)
├── public/                          # Static assets (empty, required by Next.js)
├── Dockerfile                       # Multi-stage build, compiles native sqlite module
├── docker-compose.yml               # Port 3000, ./data volume, restart: unless-stopped
├── .gitattributes                   # Line-ending normalization (LF)
└── .gitignore                       # Excludes data/, node_modules/, .next/
```

---

## Database schema

```sql
transactions (
  id TEXT PRIMARY KEY,       -- sha1 hash: 'rev_<16>' or 'tat_<16>'
  account TEXT,              -- 'revolut' | 'tatra'
  date TEXT,                 -- ISO yyyy-mm-dd
  month TEXT,                -- yyyy-mm (indexed)
  description TEXT,
  counterparty_iban TEXT,
  variable_symbol TEXT,      -- stored as string to avoid float precision loss
  amount REAL,               -- signed: negative = out, positive = in
  currency TEXT,
  category TEXT,             -- indexed
  is_internal INTEGER,       -- 0 | 1
  auto_categorized INTEGER   -- 1 = set by engine, 0 = set by user (won't be overwritten)
)

categories (
  name TEXT PRIMARY KEY
)

rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_type TEXT,           -- 'vs' | 'iban' | 'text'
  match_value TEXT,
  account TEXT,              -- optional scope: 'revolut' | 'tatra' | NULL = both
  category TEXT,
  note TEXT,
  user_created INTEGER       -- 0 = seed, 1 = created via UI
)
```

---

## Parser notes

**Revolut:** amounts are signed, comma decimal is clean, dates are ISO. Pending and non-completed rows are skipped. "Top-up by …" rows are the incoming side of a Tatra→Revolut transfer and are flagged internal.

**Tatra banka:** amounts are positive strings with Slovak comma decimals (`"1 234,56"`) and the sign comes from a separate Debet/Kredit column. Dates are `dd.mm.yyyy`. Variable symbols are read as strings — reading them as numbers would corrupt them via float precision loss.

---

## Deployment

### Docker (recommended)

**First time:**
```bash
git clone https://github.com/jano-g/finview.git
cd finview
docker compose up -d --build
```

**Update after a code change:**
```bash
git pull
docker compose up -d --build
```

Data in `./data/finance.db` is preserved across rebuilds (mounted volume).

**Access:**
- Same machine: `http://localhost:3000`
- LAN: `http://<machine-ip>:3000`
- Anywhere via Tailscale: `http://<tailscale-hostname>:3000`

For an always-on setup on Windows: enable Docker Desktop auto-start and configure Windows to auto-sign in.

### Development (no Docker)

Requires Node.js 20+.
```bash
npm install    # also compiles the native sqlite3 module
npm run dev    # http://localhost:3000
```

---

## Push / pull workflow

**After making changes on your laptop:**
```bash
git add <files>
git commit -m "describe the change"
git push
```

**To deploy on the other machine:**
```bash
cd finview
git pull
docker compose up -d --build
```

---

## Security

There is **no login**. Intended for home LAN + Tailscale only. Do not expose port 3000 to the public internet without putting authentication (e.g. Cloudflare Access, nginx basic auth) in front of it. The repository is private because it contains real account IBANs and category rules.
