# ⚖️ LegalLens — AI Legal Document Intelligence Platform

**LegalLens** is an intelligent, privacy-first legal contract analysis platform. It empowers lawyers, paralegals, and individuals to quickly analyze complex agreements, detect risks, generate counter-proposals, perform word-level visual redlines, and chat with their legal documents using advanced RAG and Multimodal OCR.

---

## 🌟 Key Features

* **Instant Document Breakdown**: Plain-English executive summaries, risk radar with severity tags, obligations tracking, and important dates extraction.
* **Multi-Turn Conversational Memory**: Chat with your legal documents using grounded RAG, source snippet citations, and persistent SQLite history.
* **Multimodal Scanned Document OCR**: Seamlessly handles scanned or image-only PDFs using PyMuPDF and Gemini 2.0 Flash Vision OCR.
* **Interactive Clause Counter-Proposal Drafter**: Automatically drafts strategic amendments for Vendor-Favorable, Buyer-Favorable, or Neutral/Mutual stances.
* **Visual Contract Redlining & Diffing**: Side-by-side contract comparison with word-level redlines (deleted baseline clauses in red strikethrough, new target additions in green highlight).
* **Exporting & Reporting**: Export structured Lawyer Consultation Briefs (.md) and detailed clause comparison matrices (.csv).
* **Graceful Degradation**: Operates seamlessly on local heuristic fallbacks when no API key is present, and auto-upgrades to live Gemini 2.0 upon key provision.

---

## 🏗️ Architecture

* **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Framer Motion
* **Backend**: FastAPI, SQLAlchemy (Async), SQLite (`aiosqlite`), PyMuPDF, ChromaDB, Google Gemini API
* **Deployment**: Docker & Docker Compose with multi-stage Nginx frontend and Uvicorn backend

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Add your GOOGLE_API_KEY in .env (optional; local fallback will work without it)

uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🐳 Docker Deployment

Run the complete full-stack environment with a single command:
```bash
docker-compose up --build
```
* **Frontend**: [http://localhost](http://localhost)
* **Backend API**: [http://localhost:8000](http://localhost:8000)
* **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Running Automated Tests

```bash
cd backend
pytest tests -v
```

---

## 📄 License
MIT License.
