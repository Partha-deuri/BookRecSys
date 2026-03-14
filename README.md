# BookRecSys

A simple **Book Recommendation System** with:

- **Backend**: Python + Flask API serving recommendation endpoints.
- **Frontend**: Static HTML/CSS/JS pages that call the backend APIs.

The backend loads precomputed model artifacts (pickles) and serves:
- **Popular books**
- **Similar books** (book-to-book cosine similarity)
- **User-based recommendations** (user-user similarity)
- Basic book/author lookup endpoints

---

## Project structure

```
BookRecSys/
├─ backend/
│  ├─ app.py
│  ├─ requirements.txt
│  ├─ models/              # serialized artifacts (pickles) used by the API
│  ├─ dataset/             # data used during preprocessing/training
│  └─ preprocessing.ipynb  # notebook used to build artifacts in models/
└─ frontend/
   ├─ index.html
   ├─ home.html
   ├─ book.html
   ├─ author.html
   └─ func.js
```

---

## Backend setup (Flask)

### 1) Create and activate a virtual environment (recommended)

```bash
cd backend

python -m venv .venv
# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate
```

### 2) Install dependencies

```bash
pip install -r requirements.txt
```

### 3) Ensure model artifacts exist

`backend/app.py` expects these files inside `backend/models/`:

- `books.pkl`
- `popular.pkl`
- `pivot_table.pkl`
- `similarity_scores.pkl`
- `user_pivot_table.pkl`
- `user_similarity_scores.pkl`

If they’re missing, run the preprocessing notebook:

```bash
# from backend/
jupyter notebook preprocessing.ipynb
```

(Then export/save the generated `.pkl` files into `backend/models/`.)

### 4) Run the API

```bash
python app.py
```

By default, Flask runs in debug mode (see `app.run(debug=True)` in `app.py`).

---

## Frontend usage

The frontend is static. You can open the HTML files directly, but in many browsers
API calls may be restricted depending on how the files are opened. The simplest
way is to run a tiny local server:

```bash
cd frontend
python -m http.server 5500
```

Then visit:

- `http://localhost:5500/index.html`

> Make sure the backend is running and that `frontend/func.js` points to the correct backend base URL/port.

---

## API endpoints

### Popular books
- `GET /popular`  
Returns top 20 popular books.

### Similar books (item-based)
- `GET /similar/<book_identifier>`

`book_identifier` can be:
- a **book title**, or
- an **ISBN** (10 or 13 digits)

Returns up to 5 similar books with basic fields like `title`, `author`, `cover_url`.

### Recommendations for a user (user-based)
- `GET /recommend/<user_id>`  
Returns recommendations for a given integer `user_id`.

### Book details
- `GET /book/<isbn>`  
Returns details for a book by ISBN.

### Author endpoints
- `GET /top_authors`  
Returns top authors by count in the popular set.

- `GET /author/<author_name>`  
Returns books by a given author name.

---

## Tech stack

- Python
- Flask + Flask-CORS
- NumPy, Pandas
- Scikit-learn, SciPy

---

## Notes / Troubleshooting

- If the backend errors on startup, it’s usually because the expected `.pkl` files
  are missing from `backend/models/` or were generated with incompatible code.
- If the frontend doesn’t show results, check:
  - backend is running
  - browser console errors
  - the API base URL in `frontend/func.js`

---
