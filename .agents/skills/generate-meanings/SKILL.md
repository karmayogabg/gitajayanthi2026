---
name: generate-meanings
description: Generate and update Tamil name meanings in Excel (.xlsx) spreadsheets using parallel Gemini API batch processing.
---

# Generate Name Meanings Skill

This skill explains how to generate and update Tamil name meanings in Excel (`.xlsx`) files using [`generate_meanings.js`](file:///home/sabrisatharamanathan/my-project/Aram-NSNK/generate_meanings.js) with parallel batch queries via the Gemini API.

---

## Capabilities & Architecture

- **Parallel Execution**: By default, `generate_meanings.js` launches **3 parallel worker threads** (`--concurrency 3`), each querying Gemini API using batch requests (20 names per batch).
- **API Key Pool & Rotation**: Automatically rotates across a configured pool of Gemini API keys to avoid hitting single-key rate limits (429 / `RESOURCE_EXHAUSTED`).
- **Caching & Pre-scanning**: Syncs existing valid meanings from the Excel file into [`meanings_cache.json`](file:///home/sabrisatharamanathan/my-project/Aram-NSNK/meanings_cache.json) before fetching missing names. Saves progress periodically (`SafeSave`).
- **Flexible Input**: Accepts custom `.xlsx` files, row ranges, limits, and concurrency settings.

---

## Usage Commands

### 1. Run on a Specific Input Excel File
To process a specific `.xlsx` spreadsheet:
```bash
node generate_meanings.js --file "./path/to/your/file.xlsx"
```
*Or pass the file path directly:*
```bash
node generate_meanings.js "./path/to/your/file.xlsx"
```

---

### 2. Control Parallel Concurrency
Adjust the number of parallel workers (default is `3`):
```bash
# High throughput (e.g. 5 parallel workers)
node generate_meanings.js --file "./file.xlsx" --concurrency 5

# Single worker (sequential)
node generate_meanings.js --file "./file.xlsx" -c 1
```

---

### 3. Additional CLI Flags

| Flag | Short | Description | Example |
| :--- | :--- | :--- | :--- |
| `--file` | `-i` | Specify input `.xlsx` file path | `--file "./part1.xlsx"` |
| `--concurrency` | `-c` | Set number of parallel workers | `--concurrency 4` |
| `--range` | `-r` | Process a specific 1-based row range | `--range 1-100` |
| `--limit` | `-l` | Process only the first N rows | `--limit 50` |
| `--force` | `-f` | Overwrite existing valid meanings in Excel | `--force` |
| `--count` | | Count uncached/empty rows without querying API | `--count` |
| `--key` | `-k` | Pass custom Gemini API key(s) | `--key "AIzaSy..."` |

---

## Workflow Example

```bash
# Step 1: Check how many rows need updates in part1.xlsx
node generate_meanings.js --file "./நம்ம சாமி நம்ம கோவில் - part1.xlsx" --count

# Step 2: Run generation in parallel (4 workers) for the first 50 rows
node generate_meanings.js --file "./நம்ம சாமி நம்ம கோவில் - part1.xlsx" -c 4 --limit 50
```
