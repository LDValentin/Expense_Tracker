# Evergreen Expense Tracker frontend

The frontend is a React app built with Vite. During development, the Vite server proxies `/api` requests to the Flask backend at `http://localhost:5000`.

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. In a second terminal, start the Flask API with `python logic.py` from the project root.

To create the production frontend served by Flask:

```powershell
cd frontend
npm run build
```

The build is written to `frontend/dist`. The Flask app serves the React entry point and assets from that directory. If the API is deployed on a different host from the frontend, set `VITE_API_URL` to the API base URL before building.
