# Namma Sami Namma Kovil (நம்ம சாமி நம்ம கோவில்)

An interactive Web Application & Explorer for 62,526 Tamil names and ancient predictions/meanings.

🌐 **Live Website**: [https://karmayogabg.github.io/namma-sami-namma-kovil/](https://karmayogabg.github.io/namma-sami-namma-kovil/)

---

## 🚀 Features

- **62,526 Processed Tamil Name Meanings**: Instant client-side search across Tamil names, phone numbers, district, union, and meaning text.
- **Tamil Alphabet Quick Filters**: Filter names by Tamil starting letters (`அ`, `ஆ`, `இ`, `க`, `சா`, `தா`, `நா`, `பா`, `மா`, `ரா`, `வா`).
- **District & Region Filters**: Filter by specific district or region.
- **One-Click Copy Meaning**: Copy Tamil name meanings to system clipboard.
- **Dark Glassmorphic UI**: High performance UI built with CSS HSL tokens, backdrop filters, and Google Fonts (`Outfit`, `Lora`, `Noto Sans Tamil`).

---

## 🛠️ Project Structure

```
├── index.html                           # Landing page & Web Dashboard entry point
├── dashboard.html                       # Dashboard UI
├── dashboard.css                        # Design System & Glassmorphism styles
├── dashboard.js                         # Search, filter, and pagination logic
├── namma_sami_namma_kovil_full.json     # 62,526 Tamil Name Meanings dataset (49 MB)
├── generate_meanings.js                 # Gemini API parallel processing script
├── meanings_cache.json                  # Backend JSON cache
└── .agents/skills/generate-meanings/    # Project skill definition
```

---

## 💻 Local Setup

Simply clone the repository and run a local web server:

```bash
git clone https://github.com/karmayogabg/namma-sami-namma-kovil.git
cd namma-sami-namma-kovil
npx serve .
```

Open `http://localhost:3000` in your browser.
