from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os

def init_db():
    connection = sqlite3.connect('expenses.db')
    cursor = connection.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL,
            amount REAL,
            category TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS budget (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL,
            amount REAL
        )
    ''')

    connection.commit()
    connection.close()

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')
app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')

@app.route('/')
def frontend_index():
    if os.path.isfile(os.path.join(FRONTEND_DIST, 'index.html')):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return jsonify({
        'error': 'The React frontend has not been built yet.',
        'instructions': 'Run npm install && npm run build in the frontend directory.'
    }), 503

@app.route('/<path:path>')
def frontend_assets(path):
    # Serve built Vite assets, while leaving API, health, and unknown paths alone.
    if path.startswith(('api/', 'health')):
        return jsonify({'error': 'Not found'}), 404
    requested_file = os.path.join(FRONTEND_DIST, path)
    if os.path.isfile(requested_file):
        return send_from_directory(FRONTEND_DIST, path)
    if os.path.isfile(os.path.join(FRONTEND_DIST, 'index.html')):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return jsonify({'error': 'Not found'}), 404

if os.environ.get('FLASK_ENV') == 'production':
    CORS(app, resources={r"/api/*": {"origins": "https://ldexpensetracker.netlify.app"}}, supports_credentials=True)
else:
    CORS(app, supports_credentials=True, origins=['http://localhost:3000'])

# Helper: get client_id from request headers, else error
def get_client_id():
    client_id = request.headers.get('X-Client-ID')
    if not client_id:
        return None
    return client_id

@app.route('/api/summary', methods=['GET'])
def api_summary():
    client_id = get_client_id()
    if not client_id:
        return jsonify({'success': False, 'error': 'Missing X-Client-ID header'}), 400
    
    connection = sqlite3.connect('expenses.db')
    cursor = connection.cursor()

    cursor.execute('SELECT * FROM expenses WHERE client_id = ?', (client_id,))
    expenses = cursor.fetchall()

    total_expenses = sum(expense[2] for expense in expenses)  # amount

    cursor.execute('SELECT amount FROM budget WHERE client_id = ? ORDER BY id DESC LIMIT 1', (client_id,))
    budget_row = cursor.fetchone()
    budget = budget_row[0] if budget_row else 0

    connection.close()

    return jsonify({
        'expenses': [[e[0], e[2], e[3]] for e in expenses],  # id, amount, category
        'total_expenses': total_expenses,
        'budget': budget
    })


@app.route('/api/categories', methods=['GET'])
def api_categories():
    categories = [
        "Food",
        "Transportation",
        "Entertainment",
        "Utilities",
        "Shopping",
        "Healthcare",
        "Other"
    ]
    return jsonify({'categories': categories})


@app.route('/api/set_budget', methods=['POST'])
def api_set_budget():
    client_id = get_client_id()
    if not client_id:
        return jsonify({'success': False, 'error': 'Missing X-Client-ID header'}), 400

    data = request.get_json()
    budget = data.get('budget')
    if budget is None:
        return jsonify({'success': False, 'error': 'Missing budget field'}), 400

    connection = sqlite3.connect('expenses.db')
    cursor = connection.cursor()

    cursor.execute('SELECT id FROM budget WHERE client_id = ?', (client_id,))
    budget_entry = cursor.fetchone()

    if budget_entry is None:
        cursor.execute('INSERT INTO budget (client_id, amount) VALUES (?, ?)', (client_id, budget))
    else:
        cursor.execute('UPDATE budget SET amount = ? WHERE client_id = ?', (budget, client_id))

    connection.commit()
    connection.close()

    return jsonify({'success': True})


@app.route('/api/reset_budget', methods=['POST'])
def api_reset_budget():
    client_id = get_client_id()
    if not client_id:
        return jsonify({'success': False, 'error': 'Missing X-Client-ID header'}), 400

    connection = sqlite3.connect('expenses.db')
    cursor = connection.cursor()

    cursor.execute('DELETE FROM budget WHERE client_id = ?', (client_id,))

    connection.commit()
    connection.close()

    return jsonify({'success': True})


@app.route('/api/add_expense', methods=['POST'])
def api_add_expense():
    client_id = get_client_id()
    if not client_id:
        return jsonify({'success': False, 'error': 'Missing X-Client-ID header'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Missing JSON payload'}), 400

    try:
        amount = float(data.get('amount'))
        category = data.get('category')
        if not category:
            return jsonify({'success': False, 'error': 'Missing category'}), 400
    except Exception:
        return jsonify({'success': False, 'error': 'Invalid amount or category'}), 400

    connection = sqlite3.connect('expenses.db')
    cursor = connection.cursor()
    cursor.execute('INSERT INTO expenses (client_id, amount, category) VALUES (?, ?, ?)', (client_id, amount, category))
    connection.commit()
    connection.close()

    return jsonify({'success': True})


@app.route('/api/reset', methods=['POST'])
def api_reset():
    client_id = get_client_id()
    if not client_id:
        return jsonify({'success': False, 'error': 'Missing X-Client-ID header'}), 400

    connection = sqlite3.connect('expenses.db')
    cursor = connection.cursor()
    cursor.execute('DELETE FROM expenses WHERE client_id = ?', (client_id,))
    connection.commit()
    connection.close()

    return jsonify({'success': True})

def reset_budget():
    client_id = get_client_id()
    if not client_id:
        return jsonify({'success': False, 'error': 'Missing X-Client-ID header'}), 400
    connection = sqlite3.connect('expenses.db')
    cursor = connection.cursor()
    cursor.execute('DELETE FROM budget WHERE client_id = ?', (client_id,))
    connection.commit()
    connection.close()
    return jsonify({'success': True})

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def api_delete_expense(expense_id):
    client_id = get_client_id()
    if not client_id:
        return jsonify({'success': False, 'error': 'Missing X-Client-ID header'}), 400

    connection = sqlite3.connect('expenses.db')
    cursor = connection.cursor()
    cursor.execute('DELETE FROM expenses WHERE id = ? AND client_id = ?', (expense_id, client_id))
    deleted = cursor.rowcount
    connection.commit()
    connection.close()

    if not deleted:
        return jsonify({'success': False, 'error': 'Expense not found'}), 404
    return jsonify({'success': True})


@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy'})


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
