# Expense Tracker

Expense Tracker is a single-page app for recording expenses and tracking them against a monthly budget. The React frontend sends requests to a Flask API, which stores data in SQLite. The frontend and API can be served together after the frontend is built.

## Techniques

- **Client-scoped records:** The frontend creates a persistent client ID with `crypto.randomUUID()` and sends it in an `X-Client-ID` header. The API uses that ID to scope expense and budget queries.
- **Parameterized SQL:** API queries pass values separately from SQL text, reducing the risk of SQL injection. See Python’s [`sqlite3` documentation](https://docs.python.org/3/library/sqlite3.html).
- **Frontend state and derived values:** React hooks manage loading and form state; `useMemo` derives totals from the expense list. See [React’s `useState`](https://react.dev/reference/react/useState), [`useEffect`](https://react.dev/reference/react/useEffect), and [`useMemo`](https://react.dev/reference/react/useMemo).
- **API requests with Fetch:** A shared request helper adds JSON and client-ID headers, parses responses, and surfaces API errors. See [MDN’s Fetch API guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch).
- **Responsive layout and reduced motion:** CSS grid and media queries adapt the dashboard to smaller screens, while `prefers-reduced-motion` limits animation for users who request reduced motion. See MDN on [CSS media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries) and [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).
- **Accessible dialog behavior:** The expense and budget dialogs support Escape to close, backdrop dismissal, and dialog labels. See MDN on the [dialog role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role) and [`keydown` events](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event).

## Technologies

- [React](https://react.dev/) 18 and [React DOM](https://react.dev/reference/react-dom)
- [Vite](https://vite.dev/) 6 with [`@vitejs/plugin-react`](https://github.com/vitejs/vite/tree/main/packages/plugin-react)
- [Lucide React](https://lucide.dev/guide/packages/lucide-react) for icons
- [Flask](https://flask.palletsprojects.com/) and [Flask-CORS](https://flask-cors.readthedocs.io/) for the API and cross-origin requests
- [SQLite](https://www.sqlite.org/) for persistence
- [Gunicorn](https://gunicorn.org/) is listed as a backend dependency; the root [`Procfile`](Procfile) currently starts the app with Python.
- [DM Sans](https://fonts.google.com/specimen/DM+Sans) and [Manrope](https://fonts.google.com/specimen/Manrope), loaded from Google Fonts

## Project structure

```text
.
├── frontend/
│   └── src/
├── logic.py
├── requirements.txt
└── Procfile
```

- [`frontend/`](frontend/) contains the React app, Vite configuration, and frontend package manifest.
- [`frontend/src/`](frontend/src/) contains the dashboard component, React entry point, and styles.
- [`logic.py`](logic.py) defines the Flask API, SQLite initialization, and built frontend serving.
- [`requirements.txt`](requirements.txt) lists the Python dependencies.
- [`Procfile`](Procfile) defines the process command used by compatible deployment platforms.
