import http.server
import socketserver
import json
import sqlite3
import os
import sys
import webbrowser

PORT = 8700
DB_FILE = 'database.sqlite'

# Veritabanı İlklendirmesi
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,
        amount REAL,
        category TEXT,
        description TEXT,
        is_impulsive INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        category TEXT,
        monthly_limit REAL,
        UNIQUE(user_id, category)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS savings_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        target_amount REAL,
        current_amount REAL DEFAULT 0,
        deadline TEXT
    )''')
    
    # Varsayılan deneme kullanıcısı ekleyelim
    c.execute("SELECT * FROM users WHERE email='test@demo.com'")
    if not c.fetchone():
        c.execute("INSERT INTO users (name, email, password) VALUES ('Ahmet Yılmaz', 'test@demo.com', '123456')")
        # Örnek veriler ekleyelim
        c.execute("INSERT INTO transactions (user_id, type, amount, category, description, is_impulsive) VALUES (1, 'income', 45000.0, 'Maaş', 'Aylık Net Maaş', 0)")
        c.execute("INSERT INTO transactions (user_id, type, amount, category, description, is_impulsive) VALUES (1, 'expense', 1500.0, 'Market', 'Haftalık Mutfak Alışverişi', 0)")
        c.execute("INSERT INTO transactions (user_id, type, amount, category, description, is_impulsive) VALUES (1, 'expense', 850.0, 'Giyim', 'Plansız Ayakkabı Alımı', 1)")
        c.execute("INSERT INTO transactions (user_id, type, amount, category, description, is_impulsive) VALUES (1, 'expense', 320.0, 'Dışarıda Yemek', 'Kahve ve Tatlı', 1)")
        c.execute("INSERT INTO budgets (user_id, category, monthly_limit) VALUES (1, 'Market', 5000.0)")
        c.execute("INSERT INTO budgets (user_id, category, monthly_limit) VALUES (1, 'Giyim', 2000.0)")
        c.execute("INSERT INTO budgets (user_id, category, monthly_limit) VALUES (1, 'Dışarıda Yemek', 1500.0)")
        c.execute("INSERT INTO savings_goals (user_id, title, target_amount, current_amount, deadline) VALUES (1, 'Yeni MacBook Pro', 65000.0, 15000.0, '2026-12-31')")
    conn.commit()
    conn.close()

# Python HTTP Request Handler
class SimulatorHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def get_current_user_id(self):
        auth_header = self.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token_val = auth_header.split(' ')[1]
                if token_val.startswith('simulated_token_user_'):
                    return int(token_val.replace('simulated_token_user_', ''))
                return int(token_val)
            except ValueError:
                return 1
        return 1

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # API Yollarını Yönlendir
        if self.path.startswith('/api/transactions'):
            self.get_transactions()
        elif self.path.startswith('/api/budgets'):
            self.get_budgets()
        elif self.path.startswith('/api/savings'):
            self.get_savings()
        elif self.path.startswith('/api/ai/analysis'):
            self.get_ai_analysis()
        else:
            # Web Arayüzünü Servis Et
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML_UI.encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        body = json.loads(post_data) if post_data else {}

        if self.path == '/api/auth/login':
            self.auth_login(body)
        elif self.path == '/api/auth/register':
            self.auth_register(body)
        elif self.path == '/api/transactions':
            self.add_transaction(body)
        elif self.path == '/api/budgets':
            self.set_budget(body)
        elif self.path == '/api/savings':
            self.add_savings(body)
        elif self.path == '/api/ai/chat':
            self.chat_ai(body)
        else:
            self.send_response(404)
            self.end_headers()

    def do_PATCH(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        body = json.loads(post_data) if post_data else {}

        if self.path.startswith('/api/savings/'):
            goal_id = int(self.path.split('/')[-1])
            self.update_savings(goal_id, body)
        else:
            self.send_response(404)
            self.end_headers()

    def do_DELETE(self):
        if self.path.startswith('/api/transactions/'):
            t_id = int(self.path.split('/')[-1])
            self.delete_transaction(t_id)
        else:
            self.send_response(404)
            self.end_headers()

    # --- API YÖNTEMLERİ ---

    def auth_login(self, body):
        email = body.get('email')
        password = body.get('password')
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT id, name, email FROM users WHERE email=? AND password=?", (email, password))
        user = c.fetchone()
        conn.close()

        if user:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "token": "simulated_token_user_" + str(user[0]),
                "user": { "id": user[0], "name": user[1], "email": user[2] }
            }).encode('utf-8'))
        else:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "E-posta veya şifre hatalı."}).encode('utf-8'))

    def auth_register(self, body):
        name = body.get('name')
        email = body.get('email')
        password = body.get('password')
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        try:
            c.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", (name, email, password))
            conn.commit()
            user_id = c.lastrowid
            conn.close()

            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "token": "simulated_token_user_" + str(user_id),
                "user": { "id": user_id, "name": name, "email": email }
            }).encode('utf-8'))
        except sqlite3.IntegrityError:
            conn.close()
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "E-posta zaten kayıtlı."}).encode('utf-8'))

    def get_transactions(self):
        user_id = self.get_current_user_id()
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT id, type, amount, category, description, is_impulsive, created_at FROM transactions WHERE user_id=? ORDER BY created_at DESC", (user_id,))
        rows = c.fetchall()
        conn.close()

        transactions = []
        for r in rows:
            transactions.append({
                "id": r[0], "type": r[1], "amount": r[2], "category": r[3],
                "description": r[4], "is_impulsive": r[5], "created_at": r[6]
            })

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"transactions": transactions}).encode('utf-8'))

    def add_transaction(self, body):
        user_id = self.get_current_user_id()
        t_type = body.get('type')
        amount = body.get('amount')
        category = body.get('category')
        description = body.get('description')
        is_impulsive = 1 if body.get('is_impulsive') else 0

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT INTO transactions (user_id, type, amount, category, description, is_impulsive) VALUES (?, ?, ?, ?, ?, ?)",
                  (user_id, t_type, amount, category, description, is_impulsive))
        conn.commit()
        conn.close()

        # Bütçe kontrolü ve alarm üretme
        alert = None
        if t_type == 'expense':
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("SELECT monthly_limit FROM budgets WHERE user_id=? AND category=?", (user_id, category))
            budget = c.fetchone()
            
            c.execute("SELECT SUM(amount) FROM transactions WHERE user_id=? AND type='expense' AND category=?", (user_id, category))
            total_spent = c.fetchone()[0] or 0.0
            conn.close()

            if budget and total_spent > budget[0]:
                alert = {
                    "type": "BUDGET_EXCEEDED",
                    "title": "Bütçe Sınırı Aşıldı! 🚨",
                    "message": f"'{category}' kategorisindeki harcamanız aylık limiti ({budget[0]} TL) aştı! Toplam harcanan: {total_spent} TL."
                }
            elif is_impulsive == 1:
                alert = {
                    "type": "IMPULSIVE_SPENDING",
                    "title": "Dürtüsel Harcama Uyarısı! 💸",
                    "message": f"Bu harcamayı plansız/dürtüsel olarak kaydettiniz. Cebinizi korumak için 24 saat kuralını uygulayın!"
                }

        self.send_response(201)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"message": "Başarıyla eklendi", "alert": alert}).encode('utf-8'))

    def delete_transaction(self, t_id):
        user_id = self.get_current_user_id()
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("DELETE FROM transactions WHERE id=? AND user_id=?", (t_id, user_id))
        conn.commit()
        conn.close()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"message": "Silindi"}).encode('utf-8'))

    def get_budgets(self):
        user_id = self.get_current_user_id()
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT category, monthly_limit FROM budgets WHERE user_id=?", (user_id,))
        rows = c.fetchall()
        conn.close()

        budgets = [{"category": r[0], "monthly_limit": r[1]} for r in rows]
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"budgets": budgets}).encode('utf-8'))

    def set_budget(self, body):
        user_id = self.get_current_user_id()
        category = body.get('category')
        limit = body.get('monthly_limit')

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT INTO budgets (user_id, category, monthly_limit) VALUES (?, ?, ?) ON CONFLICT(user_id, category) DO UPDATE SET monthly_limit=excluded.monthly_limit", (user_id, category, limit))
        conn.commit()
        conn.close()

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"message": "Bütçe limiti güncellendi."}).encode('utf-8'))

    def get_savings(self):
        user_id = self.get_current_user_id()
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT id, title, target_amount, current_amount, deadline FROM savings_goals WHERE user_id=?", (user_id,))
        rows = c.fetchall()
        conn.close()

        goals = [{
            "id": r[0], "title": r[1], "target_amount": r[2], "current_amount": r[3], "deadline": r[4]
        } for r in rows]

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"savingsGoals": goals}).encode('utf-8'))

    def add_savings(self, body):
        user_id = self.get_current_user_id()
        title = body.get('title')
        target = body.get('target_amount')
        current = body.get('current_amount', 0)
        deadline = body.get('deadline', '')

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT INTO savings_goals (user_id, title, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?, ?)",
                  (user_id, title, target, current, deadline))
        conn.commit()
        conn.close()

        self.send_response(201)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"message": "Hedef oluşturuldu."}).encode('utf-8'))

    def update_savings(self, goal_id, body):
        user_id = self.get_current_user_id()
        amount = body.get('amount')
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT current_amount, target_amount, title FROM savings_goals WHERE id=? AND user_id=?", (goal_id, user_id))
        goal = c.fetchone()
        
        alert = None
        if goal:
            new_amount = goal[0] + amount
            c.execute("UPDATE savings_goals SET current_amount=? WHERE id=? AND user_id=?", (new_amount, goal_id, user_id))
            conn.commit()
            
            if new_amount >= goal[1]:
                alert = {
                    "title": "Tebrikler! 🎉",
                    "message": f"'{goal[2]}' hedefinize ulaştınız! {goal[1]} TL biriktirmeyi başardınız."
                }
        conn.close()

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"message": "Güncellendi", "alert": alert}).encode('utf-8'))

    def get_ai_analysis(self):
        user_id = self.get_current_user_id()
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT type, amount, category, is_impulsive FROM transactions WHERE user_id=?", (user_id,))
        transactions = c.fetchall()
        
        c.execute("SELECT category, monthly_limit FROM budgets WHERE user_id=?", (user_id,))
        budgets = c.fetchall()
        
        c.execute("SELECT title, target_amount, current_amount FROM savings_goals WHERE user_id=?", (user_id,))
        savings = c.fetchall()
        conn.close()

        total_income = sum(t[1] for t in transactions if t[0] == 'income')
        total_expense = sum(t[1] for t in transactions if t[0] == 'expense')
        impulsive_expense = sum(t[1] for t in transactions if t[0] == 'expense' and t[3] == 1)

        category_expenses = {}
        for t in transactions:
            if t[0] == 'expense':
                category_expenses[t[2]] = category_expenses.get(t[2], 0.0) + t[1]

        budget_alerts = []
        for b in budgets:
            cat = b[0]
            limit = b[1]
            spent = category_expenses.get(cat, 0.0)
            if spent > limit:
                budget_alerts.append({
                    "category": cat,
                    "limit": limit,
                    "spent": spent,
                    "over": spent - limit
                })

        total_exp_count = len([t for t in transactions if t[0] == 'expense'])
        imp_count = len([t for t in transactions if t[0] == 'expense' and t[3] == 1])
        impulsivity_score = int((imp_count / total_exp_count) * 100) if total_exp_count > 0 else 0

        recommendations = []
        if impulsive_expense > 0:
            recommendations.append(f"Bu ay plansız dürtüsel harcamanız {impulsive_expense} TL. Bu tutarı durdurarak tasarruflarınıza ekleyebilirsiniz!")
        else:
            recommendations.append("Harika! Bu ay hiç dürtüsel harcama yapmadınız.")
        
        if total_income > 0 and (total_expense / total_income) > 0.8:
            recommendations.append("Harcamalarınız gelirinizin %80'inden fazla! Acilen bütçe kısıntısı planlayın.")
        
        for alert in budget_alerts:
            recommendations.append(f"DİKKAT: '{alert['category']}' limitinizi {alert['over']} TL aştınız! Kategori harcamalarını durdurun.")

        if not savings:
            recommendations.append("Motivasyon için hemen kendinize bir Tasarruf Hedefi oluşturun!")

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            "stats": {
                "totalIncome": total_income,
                "totalExpense": total_expense,
                "impulsiveExpense": impulsive_expense,
                "impulsivityScore": impulsivity_score,
                "balance": total_income - total_expense
            },
            "budgetAlerts": budget_alerts,
            "categoryExpenses": category_expenses,
            "recommendations": recommendations
        }).encode('utf-8'))

    def chat_ai(self, body):
        user_id = self.get_current_user_id()
        message = body.get('message', '').lower()
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT SUM(amount) FROM transactions WHERE user_id=? AND type='income'", (user_id,))
        inc = c.fetchone()[0] or 0.0
        c.execute("SELECT SUM(amount) FROM transactions WHERE user_id=? AND type='expense'", (user_id,))
        exp = c.fetchone()[0] or 0.0
        c.execute("SELECT SUM(amount) FROM transactions WHERE user_id=? AND type='expense' AND is_impulsive=1", (user_id,))
        imp = c.fetchone()[0] or 0.0
        conn.close()

        bal = inc - exp

        reply = ""
        if "selam" in message or "merhaba" in message:
            reply = "Merhaba! Ben Elim Cebimde Asistanınız. Bütçenizi kontrol etmek veya dürtüsel harcamaları azaltmak için hazır mısınız?"
        elif "durum" in message or "özet" in message or "bakiye" in message:
            reply = f"Mevcut Finansal Özetiniz:\n💵 Gelir: {inc} TL\n💸 Harcama: {exp} TL\n⚡ Dürtüsel: {imp} TL\n⚖️ Bakiye: {bal} TL."
        elif "dürtü" in message or "nasıl önlerim" in message or "plansız" in message:
            reply = "Dürtüsel harcamaları durdurmak için '24 Saat Sepet Kuralı' uygulayabilirsiniz. Almak istediğiniz nesneyi sepete ekleyin ve 24 saat sonra hala ihtiyacınız olup olmadığını değerlendirin."
        elif "yatırım" in message or "tavsiye" in message:
            reply = "Finansal sağlığınız için ilk adım, aylık harcamanızın 3 katı kadar bir 'Acil Durum Fonu' kurmaktır. Sonrasında vadeli hesap, BES veya altın fonu gibi risksiz/orta riskli birikimleri düşünebilirsiniz."
        else:
            reply = "Bunu anladım! Finansal disiplin kazanmak için bütçe limitlerini takip etmeyi ve gereksiz harcamaları ertelemeyi unutmayın."

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"reply": reply}).encode('utf-8'))

# HTML Arayüzü (Premium Tasarım ve Simülatör Kasası)
HTML_UI = """
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Elim Cebimde - AI Destekli Mobil Simülatör</title>
    <style>
        :root {
            --bg-color: #0F172A;
            --card-bg: #1E293B;
            --border-color: #334155;
            --text-main: #F8FAFC;
            --text-sub: #94A3B8;
            --blue: #3B82F6;
            --emerald: #10B981;
            --rose: #F43F5E;
            --amber: #EAB308;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        body {
            background-color: #0a0e1a;
            color: var(--text-main);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }

        /* Telefon Kasası (Simulator Shell) */
        .phone-container {
            width: 390px;
            height: 800px;
            background-color: var(--bg-color);
            border: 12px solid #27272a;
            border-radius: 48px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            position: relative;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Üst Çentik (iPhone Dynamic Island benzeri) */
        .notch {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 110px;
            height: 25px;
            background-color: #27272a;
            border-bottom-left-radius: 18px;
            border-bottom-right-radius: 18px;
            z-index: 100;
        }

        /* Ekran İçeriği */
        .screen {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding-top: 30px; /* Çentik payı */
            height: 100%;
            overflow: hidden;
            position: relative;
        }

        /* Auth Ekranı */
        .auth-screen {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 24px;
            height: 100%;
            text-align: center;
        }

        .auth-logo {
            font-size: 54px;
            margin-bottom: 15px;
        }

        .auth-title {
            font-size: 26px;
            font-weight: 800;
            margin-bottom: 5px;
        }

        .auth-subtitle {
            color: var(--text-sub);
            font-size: 13px;
            margin-bottom: 30px;
        }

        .input-group {
            width: 100%;
            margin-bottom: 15px;
            text-align: left;
        }

        .input-group label {
            display: block;
            font-size: 12px;
            color: var(--text-sub);
            margin-bottom: 5px;
            font-weight: 600;
        }

        .input-field {
            width: 100%;
            background-color: #0b0f19;
            border: 1px solid var(--border-color);
            color: var(--text-main);
            padding: 14px;
            border-radius: 12px;
            font-size: 14px;
            outline: none;
        }

        .input-field:focus {
            border-color: var(--blue);
        }

        .btn {
            width: 100%;
            background-color: var(--blue);
            color: white;
            border: none;
            padding: 14px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            transition: opacity 0.2s;
            margin-top: 10px;
        }

        .btn:hover {
            opacity: 0.9;
        }

        .btn-emerald {
            background-color: var(--emerald);
        }

        .auth-helper {
            font-size: 12px;
            color: var(--amber);
            margin-top: 20px;
            background: rgba(234, 179, 8, 0.1);
            padding: 10px;
            border-radius: 8px;
        }

        /* Ana Uygulama Düzeni */
        .app-layout {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        /* Üst Bar */
        .top-bar {
            background-color: var(--card-bg);
            padding: 14px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
        }

        .profile-name {
            font-weight: bold;
            font-size: 14px;
        }

        .logout-link {
            color: var(--rose);
            font-size: 12px;
            cursor: pointer;
            text-decoration: none;
        }

        /* Ana İçerik Kaydırma Alanı */
        .content-area {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            padding-bottom: 80px;
        }

        .content-area::-webkit-scrollbar {
            display: none;
        }

        /* Alt Navigasyon Bar */
        .bottom-nav {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 65px;
            background-color: var(--card-bg);
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: space-around;
            align-items: center;
            z-index: 10;
        }

        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            color: var(--text-sub);
            flex: 1;
        }

        .nav-item.active {
            color: var(--blue);
            font-weight: bold;
        }

        .nav-icon {
            font-size: 18px;
            margin-bottom: 2px;
        }

        .nav-text {
            font-size: 10px;
        }

        /* Kartlar ve Görsel Ögeler */
        .card {
            background-color: var(--card-bg);
            border-radius: 16px;
            padding: 18px;
            margin-bottom: 16px;
            border: 1px solid var(--border-color);
        }

        .gradient-card {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid #334155;
        }

        .balance-title {
            font-size: 11px;
            color: var(--text-sub);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .balance-value {
            font-size: 28px;
            font-weight: 800;
            margin: 6px 0;
        }

        .balance-row {
            display: flex;
            justify-content: space-between;
            margin-top: 12px;
            border-top: 1px solid var(--border-color);
            padding-top: 10px;
        }

        .balance-stat {
            flex: 1;
        }

        .stat-label {
            font-size: 10px;
            color: var(--text-sub);
        }

        .stat-val-green {
            color: var(--emerald);
            font-weight: bold;
            font-size: 14px;
        }

        .stat-val-red {
            color: var(--rose);
            font-weight: bold;
            font-size: 14px;
        }

        .section-title {
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 12px;
        }

        /* Dürtüsellik Çemberi */
        .impulse-flex {
            display: flex;
            align-items: center;
        }

        .circle-progress {
            position: relative;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 5px solid var(--border-color);
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: bold;
            font-size: 14px;
            margin-right: 15px;
            border-top-color: var(--amber);
        }

        .impulse-desc {
            flex: 1;
            font-size: 11px;
            color: var(--text-sub);
            line-height: 15px;
        }

        /* Bildirim Kartı */
        .notification-card {
            background-color: rgba(244, 63, 94, 0.15);
            border: 1px solid var(--rose);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 16px;
            font-size: 12px;
        }

        .notification-title {
            color: var(--rose);
            font-weight: bold;
            margin-bottom: 4px;
        }

        /* AI Öneri Kartı */
        .ai-banner {
            background-color: rgba(59, 130, 246, 0.1);
            border: 1.5px solid var(--blue);
            border-radius: 16px;
            padding: 15px;
            margin-bottom: 16px;
        }

        .ai-title {
            color: var(--blue);
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 8px;
        }

        .ai-rec-text {
            font-size: 12px;
            line-height: 17px;
            margin-bottom: 6px;
        }

        /* İşlem Listesi */
        .list-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .list-item:last-child {
            border-bottom: none;
        }

        .item-left {
            display: flex;
            align-items: center;
        }

        .item-emoji {
            font-size: 18px;
            margin-right: 10px;
        }

        .item-name {
            font-size: 13px;
            font-weight: 600;
        }

        .item-desc {
            font-size: 11px;
            color: var(--text-sub);
            margin-top: 2px;
        }

        .item-right {
            text-align: right;
        }

        .item-val {
            font-size: 13px;
            font-weight: 700;
        }

        .item-val.income {
            color: var(--emerald);
        }

        .item-val.expense {
            color: var(--rose);
        }

        .durtu-badge {
            background-color: var(--rose);
            color: white;
            font-size: 8px;
            padding: 2px 4px;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
            margin-top: 3px;
        }

        .delete-btn {
            color: var(--text-sub);
            background: none;
            border: none;
            font-size: 12px;
            cursor: pointer;
            margin-left: 8px;
        }

        .delete-btn:hover {
            color: var(--rose);
        }

        /* Ekleme Ekranı */
        .type-tabs {
            display: flex;
            background: #0b0f19;
            padding: 4px;
            border-radius: 10px;
            margin-bottom: 18px;
            border: 1px solid var(--border-color);
        }

        .type-tab {
            flex: 1;
            text-align: center;
            padding: 10px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 8px;
            color: var(--text-sub);
        }

        .type-tab.active.expense {
            background-color: var(--rose);
            color: white;
        }

        .type-tab.active.income {
            background-color: var(--emerald);
            color: white;
        }

        .chips {
            display: flex;
            flex-wrap: wrap;
            margin: 5px -3px 15px -3px;
        }

        .chip {
            background-color: #0b0f19;
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 11px;
            margin: 3px;
            cursor: pointer;
            color: var(--text-sub);
        }

        .chip.active {
            background-color: var(--blue);
            color: white;
            border-color: var(--blue);
        }

        .switch-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #0b0f19;
            padding: 12px;
            border-radius: 12px;
            border: 1.5px solid var(--rose);
            margin-bottom: 20px;
        }

        .switch-left {
            max-width: 80%;
        }

        .switch-title {
            color: var(--rose);
            font-weight: bold;
            font-size: 13px;
        }

        .switch-desc {
            font-size: 10px;
            color: var(--text-sub);
            margin-top: 2px;
        }

        /* Tasarruf & Bütçe Ekranları */
        .progress-bar-container {
            display: flex;
            align-items: center;
            margin: 8px 0;
        }

        .progress-bar-bg {
            flex: 1;
            height: 7px;
            background-color: #0d121f;
            border-radius: 4px;
            overflow: hidden;
            margin-right: 10px;
        }

        .progress-bar-fill {
            height: 100%;
            background-color: var(--emerald);
            width: 0%;
        }

        .percent-text {
            font-size: 11px;
            font-weight: bold;
        }

        .card-footer-flex {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid var(--border-color);
            padding-top: 10px;
            margin-top: 10px;
        }

        .add-money-btn {
            background-color: var(--border-color);
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
        }

        .add-money-btn:hover {
            background-color: var(--blue);
        }

        /* Chatbot Ekranı */
        .chat-list {
            flex: 1;
            overflow-y: auto;
            padding-bottom: 15px;
            display: flex;
            flex-direction: column;
        }

        .chat-bubble {
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 14px;
            margin-bottom: 12px;
            font-size: 12.5px;
            line-height: 17px;
        }

        .chat-bubble.bot {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            align-self: flex-start;
            border-bottom-left-radius: 2px;
        }

        .chat-bubble.user {
            background-color: var(--blue);
            align-self: flex-end;
            border-bottom-right-radius: 2px;
        }

        .chat-input-row {
            display: flex;
            background-color: var(--card-bg);
            padding: 8px;
            border-radius: 20px;
            border: 1px solid var(--border-color);
            margin-top: auto;
        }

        .chat-input {
            flex: 1;
            background: none;
            border: none;
            color: white;
            padding: 6px 12px;
            outline: none;
            font-size: 13px;
        }

        .chat-send-btn {
            background-color: var(--blue);
            color: white;
            border: none;
            padding: 6px 14px;
            border-radius: 16px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
        }

        .quick-tags {
            display: flex;
            overflow-x: auto;
            padding: 8px 0;
            margin-bottom: 6px;
        }

        .quick-tag {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            color: var(--text-sub);
            padding: 6px 10px;
            border-radius: 15px;
            font-size: 10px;
            white-space: nowrap;
            margin-right: 6px;
            cursor: pointer;
        }

        /* Modal popup */
        .modal {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(15, 23, 42, 0.95);
            z-index: 50;
            display: none;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .modal-body {
            background-color: var(--card-bg);
            width: 100%;
            border-radius: 20px;
            padding: 20px;
            border: 1px solid var(--border-color);
        }

        .modal-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
        }

        .modal-buttons {
            display: flex;
            justify-content: flex-end;
            margin-top: 15px;
        }

        .modal-btn-cancel {
            background: none;
            border: none;
            color: var(--text-sub);
            padding: 8px 15px;
            cursor: pointer;
            margin-right: 10px;
        }

        .modal-btn-submit {
            background-color: var(--blue);
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
        }

        /* Map & Radar Animations & Styles */
        .shop-node {
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease;
        }
        .shop-node:hover {
            transform: scale(1.08);
        }
        @keyframes bounce {
            0% { transform: translateY(0); }
            100% { transform: translateY(-8px); }
        }
        @keyframes pulse-radar {
            0% { transform: scale(0.5); opacity: 0.8; }
            100% { transform: scale(1.4); opacity: 0; }
        }
        #map-radar {
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
            background-color: rgba(59, 130, 246, 0.1);
            transition: left 0.1s ease, top 0.1s ease;
        }
        #map-radar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 50%;
            border: 2.5px solid var(--rose);
            animation: pulse-radar 1.5s infinite ease-out;
            pointer-events: none;
        }
    </style>
</head>
<body>

    <div class="phone-container">
        <div class="notch"></div>
        <div class="screen">
            <!-- VIRTUAL BANNER NOTIFICATION -->
            <div id="virtual-notification" style="position: absolute; top: -100px; left: 10px; right: 10px; background-color: var(--rose); color: white; padding: 12px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 200; transition: top 0.4s ease; display: flex; align-items: center; border: 1.5px solid #FFA3B1;">
                <span style="font-size: 20px; margin-right: 10px;">🚨</span>
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 13px;" id="notif-title">Dükkan Yakınındasınız</div>
                    <div style="font-size: 11px; margin-top: 2px;" id="notif-msg">plansız harcama yapmayın.</div>
                </div>
                <button onclick="closeVirtualNotification()" style="background:none; border:none; color:white; font-size:14px; cursor:pointer; font-weight:bold;">×</button>
            </div>

            <!-- 1. AUTH SCREEN -->
            <div id="screen-auth" class="auth-screen">
                <div class="auth-logo">🛡️</div>
                <h1 class="auth-title">Elim Cebimde</h1>
                <p class="auth-subtitle">AI Destekli Finansal Disiplin & Akıllı Bütçe</p>

                <div class="input-group" id="auth-name-group" style="display: none;">
                    <label>AD SOYAD</label>
                    <input type="text" id="auth-name" class="input-field" placeholder="Ad Soyad">
                </div>

                <div class="input-group">
                    <label>E-POSTA ADRESİ</label>
                    <input type="email" id="auth-email" class="input-field" value="test@demo.com">
                </div>

                <div class="input-group" style="margin-bottom: 25px;">
                    <label>ŞİFRE</label>
                    <input type="password" id="auth-password" class="input-field" value="123456">
                </div>

                <button class="btn" id="auth-submit-btn" onclick="handleAuth()">Giriş Yap</button>
                
                <a id="auth-toggle-link" onclick="toggleAuthMode()" style="color: var(--blue); font-size: 13px; margin-top: 15px; cursor: pointer; text-decoration: underline;">Hesabınız yok mu? Kayıt Olun</a>

                <div class="auth-helper" id="auth-helper-box">
                    💡 <b>Demo Hesabı:</b> test@demo.com / 123456
                </div>
            </div>

            <!-- 2. MAIN APP LAYOUT (SWITCHABLE VIEWS) -->
            <div id="app-layout" class="app-layout" style="display: none;">
                
                <!-- Top Profile Bar -->
                <div class="top-bar">
                    <div>
                        <div style="font-size: 10px; color: var(--text-sub);">Hoş Geldin,</div>
                        <div class="profile-name" id="user-display-name">Ahmet Yılmaz</div>
                    </div>
                    <a class="logout-link" onclick="handleLogout()">Çıkış Yap</a>
                </div>

                <!-- Main Content Scroll Area -->
                <div class="content-area">
                    
                    <!-- VIEW: DASHBOARD -->
                    <div id="view-dashboard">
                        <!-- Balance Card -->
                        <div class="card gradient-card">
                            <div class="balance-title">Kullanılabilir Net Bakiye</div>
                            <div class="balance-value" id="dash-balance">0.00 ₺</div>
                            
                            <div class="balance-row">
                                <div class="balance-stat">
                                    <div class="stat-label">📈 Aylık Gelir</div>
                                    <div class="stat-val-green" id="dash-income">+0.00 ₺</div>
                                </div>
                                <div class="balance-stat">
                                    <div class="stat-label">📉 Aylık Gider</div>
                                    <div class="stat-val-red" id="dash-expense">-0.00 ₺</div>
                                </div>
                            </div>
                        </div>

                        <!-- Warnings Container -->
                        <div id="dash-warnings"></div>

                        <!-- Impulse Score -->
                        <div class="card">
                            <div class="section-title">🧠 Dürtüsel Harcama Analizi</div>
                            <div class="impulse-flex">
                                <div class="circle-progress" id="dash-impulse-circle">0%</div>
                                <div class="impulse-desc" id="dash-impulse-text">
                                    Plansız harcama oranınız hesaplanıyor.
                                </div>
                            </div>
                        </div>

                        <!-- AI Advice Banner -->
                        <div class="ai-banner">
                            <div class="ai-title">🤖 Yapay Zeka Finansal Tavsiyesi</div>
                            <div id="dash-ai-rec-list" style="font-size: 12px;"></div>
                        </div>

                        <!-- Recent Transactions -->
                        <div class="card">
                            <div class="section-title">📋 Son Harcamalar</div>
                            <div id="dash-transactions-list"></div>
                        </div>
                    </div>

                    <!-- VIEW: ADD TRANSACTION -->
                    <div id="view-add" style="display: none;">
                        <h2 class="section-title">İşlem Ekle</h2>
                        
                        <div class="type-tabs">
                            <div class="type-tab active expense" id="tab-expense" onclick="setAddType('expense')">Gider 📉</div>
                            <div class="type-tab" id="tab-income" onclick="setAddType('income')">Gelir 📈</div>
                        </div>

                        <div class="input-group">
                            <label>TUTAR (TL)</label>
                            <input type="number" id="add-amount" class="input-field" placeholder="0.00">
                        </div>

                        <div class="input-group">
                            <label>KATEGORİ</label>
                            <div class="chips" id="category-chips"></div>
                        </div>

                        <div class="input-group">
                            <label>AÇIKLAMA</label>
                            <input type="text" id="add-desc" class="input-field" placeholder="Market, Starbucks vb.">
                        </div>

                        <!-- Impulsive Switch (Only for Expense) -->
                        <div class="switch-row" id="add-impulse-row">
                            <div class="switch-left">
                                <div class="switch-title">⚡ Dürtüsel Alışveriş mi?</div>
                                <div class="switch-desc">Planlanmamış, anlık hevesle yapılan harcama.</div>
                            </div>
                            <input type="checkbox" id="add-is-impulsive" style="width: 20px; height: 20px; cursor: pointer;">
                        </div>

                        <button class="btn btn-emerald" onclick="submitTransaction()">Kaydet</button>
                    </div>

                    <!-- VIEW: BUDGETS -->
                    <div id="view-budgets" style="display: none;">
                        <h2 class="section-title">Aylık Bütçe Planı</h2>
                        <p style="font-size: 11px; color: var(--text-sub); margin-top: -10px; margin-bottom: 20px; line-height: 16px;">
                            Kategoriler için harcama sınırlarını belirleyin.
                        </p>
                        <div id="budget-list-container"></div>
                    </div>

                    <!-- VIEW: SAVINGS GOALS -->
                    <div id="view-savings" style="display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h2 class="section-title" style="margin-bottom:0;">Tasarruf Hedefleri</h2>
                            <button class="add-money-btn" onclick="openNewGoalModal()" style="background-color: var(--emerald)">+ Hedef Ekle</button>
                        </div>
                        <div id="savings-list-container"></div>
                    </div>

                    <!-- VIEW: MAP -->
                    <div id="view-map" style="display: none;">
                        <h2 class="section-title">📍 Akıllı Konum Takibi (Simüle)</h2>
                        <p style="font-size: 11px; color: var(--text-sub); margin-top: -10px; margin-bottom: 15px; line-height: 16px;">
                            Haritada gezintiye çıkın. Bir dürtüsel alışveriş tuzağının (dükkan) yanında durduğunuzda asistanınız sizi uyaracaktır.
                        </p>
                        
                        <div id="map-canvas-container" style="position: relative; width: 100%; height: 350px; background-color: #0b0f19; border: 1.5px solid var(--border-color); border-radius: 20px; overflow: hidden; cursor: crosshair;">
                            <!-- Grid lines -->
                            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(var(--border-color) 1px, transparent 1px); background-size: 20px 20px; opacity: 0.5;"></div>
                            
                            <!-- Shops -->
                            <div id="shop-zara" class="shop-node" style="position: absolute; left: 40px; top: 50px; text-align: center; width: 80px; z-index: 5;">
                                <div style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">👕</div>
                                <div style="font-size: 10px; font-weight: bold; background: rgba(30,41,59,0.9); padding: 2px 6px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 4px; display: inline-block;">Zara</div>
                            </div>
                            
                            <div id="shop-starbucks" class="shop-node" style="position: absolute; left: 260px; top: 60px; text-align: center; width: 80px; z-index: 5;">
                                <div style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">☕</div>
                                <div style="font-size: 10px; font-weight: bold; background: rgba(30,41,59,0.9); padding: 2px 6px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 4px; display: inline-block;">Starbucks</div>
                            </div>

                            <div id="shop-apple" class="shop-node" style="position: absolute; left: 40px; top: 230px; text-align: center; width: 80px; z-index: 5;">
                                <div style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">📱</div>
                                <div style="font-size: 10px; font-weight: bold; background: rgba(30,41,59,0.9); padding: 2px 6px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 4px; display: inline-block;">Apple</div>
                            </div>

                            <div id="shop-burger" class="shop-node" style="position: absolute; left: 250px; top: 240px; text-align: center; width: 80px; z-index: 5;">
                                <div style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🍔</div>
                                <div style="font-size: 10px; font-weight: bold; background: rgba(30,41,59,0.9); padding: 2px 6px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 4px; display: inline-block;">Burger King</div>
                            </div>

                            <!-- Avatar representing user -->
                            <div id="map-avatar" style="position: absolute; left: 160px; top: 160px; text-align: center; width: 40px; height: 40px; z-index: 10; cursor: grab; transition: left 0.1s ease, top 0.1s ease;">
                                <div style="font-size: 24px; animation: bounce 1.5s infinite alternate;">🚶‍♂️</div>
                                <div style="width: 10px; height: 10px; background-color: var(--blue); border: 2px solid white; border-radius: 50%; position: absolute; bottom: 0; left: 15px; box-shadow: 0 0 10px var(--blue);"></div>
                            </div>

                            <!-- Proximity Radar rings (shows alert state) -->
                            <div id="map-radar" style="position: absolute; width: 80px; height: 80px; border-radius: 50%; border: 2px dashed rgba(59,130,246,0.3); display: none; pointer-events: none; z-index: 1;"></div>
                        </div>

                        <div style="margin-top: 15px; font-size: 12px; color: var(--text-sub); text-align: center; background: var(--card-bg); padding: 10px; border-radius: 12px; border: 1px solid var(--border-color);">
                            🖱️ <b>Nasıl Gezilir:</b> Haritada gitmek istediğiniz yere <b>tıklayın</b> veya insan simgesini fareniz ile tutup <b>sürükleyin</b>.
                        </div>
                    </div>

                    <!-- VIEW: AI CHAT ASSISTANT -->
                    <div id="view-ai" style="display: none; height: 100%; display: flex; flex-direction: column;">
                        <div class="chat-list" id="chat-messages-container"></div>
                        
                        <div class="quick-tags">
                            <div class="quick-tag" onclick="sendQuickChat('Mevcut durumumu özetle 📊')">Durum Özeti 📊</div>
                            <div class="quick-tag" onclick="sendQuickChat('Dürtüsel harcamaları nasıl önlerim? 💸')">Dürtü Önleme 💸</div>
                            <div class="quick-tag" onclick="sendQuickChat('Yatırım önerisi alabilir miyim? 📈')">Yatırım Önerisi 📈</div>
                        </div>

                        <div class="chat-input-row">
                            <input type="text" id="chat-input-field" class="chat-input" placeholder="Sorunuzu buraya yazın...">
                            <button class="chat-send-btn" onclick="sendChatMessage()">Gönder</button>
                        </div>
                    </div>

                </div>

                <!-- Bottom Navigation Menu -->
                <div class="bottom-nav">
                    <div class="nav-item active" id="nav-dash" onclick="switchView('Dashboard')">
                        <span class="nav-icon">📊</span>
                        <span class="nav-text">Durum</span>
                    </div>
                    <div class="nav-item" id="nav-add" onclick="switchView('Ekle')">
                        <span class="nav-icon">⚡</span>
                        <span class="nav-text">Ekle</span>
                    </div>
                    <div class="nav-item" id="nav-budgets" onclick="switchView('Bütçe')">
                        <span class="nav-icon">🗓️</span>
                        <span class="nav-text">Bütçe</span>
                    </div>
                    <div class="nav-item" id="nav-map" onclick="switchView('Harita')">
                        <span class="nav-icon">📍</span>
                        <span class="nav-text">Harita</span>
                    </div>
                    <div class="nav-item" id="nav-savings" onclick="switchView('Tasarruf')">
                        <span class="nav-icon">🎯</span>
                        <span class="nav-text">Tasarruf</span>
                    </div>
                    <div class="nav-item" id="nav-ai" onclick="switchView('Asistan')">
                        <span class="nav-icon">🤖</span>
                        <span class="nav-text">AI Koç</span>
                    </div>
                </div>

            </div>

        </div>

        <!-- MODAL: ADD MONEY TO GOAL -->
        <div id="modal-add-money" class="modal">
            <div class="modal-body">
                <div class="modal-title">Hedefe Para Ekle</div>
                <input type="hidden" id="modal-goal-id">
                <div class="input-group">
                    <label>Eklenecek Tutar (TL)</label>
                    <input type="number" id="modal-goal-amount" class="input-field" placeholder="0.00">
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn-cancel" onclick="closeModal('modal-add-money')">İptal</button>
                    <button class="modal-btn-submit" onclick="submitAddMoney()">Ekle</button>
                </div>
            </div>
        </div>

        <!-- MODAL: SET BUDGET LIMIT -->
        <div id="modal-set-budget" class="modal">
            <div class="modal-body">
                <div class="modal-title" id="modal-budget-title">Bütçe Limiti Tanımla</div>
                <input type="hidden" id="modal-budget-cat">
                <div class="input-group">
                    <label>Aylık Limit Tutarı (TL)</label>
                    <input type="number" id="modal-budget-limit" class="input-field" placeholder="0.00">
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn-cancel" onclick="closeModal('modal-set-budget')">İptal</button>
                    <button class="modal-btn-submit" onclick="submitSetBudget()">Limit Tanımla</button>
                </div>
            </div>
        </div>

        <!-- MODAL: CREATE SAVINGS GOAL -->
        <div id="modal-new-goal" class="modal">
            <div class="modal-body">
                <div class="modal-title">Yeni Tasarruf Hedefi</div>
                <div class="input-group">
                    <label>HEDEF ADI</label>
                    <input type="text" id="modal-new-goal-title" class="input-field" placeholder="Ev Peşinatı, Tatil vs.">
                </div>
                <div class="input-group">
                    <label>HEDEF MİKTAR (TL)</label>
                    <input type="number" id="modal-new-goal-target" class="input-field" placeholder="0.00">
                </div>
                <div class="input-group">
                    <label>BAŞLANGIÇ TUTARI (TL - İSTEĞE BAĞLI)</label>
                    <input type="number" id="modal-new-goal-current" class="input-field" placeholder="0.00" value="0">
                </div>
                <div class="input-group">
                    <label>HEDEF TARİH (Örn: 2026-12-31)</label>
                    <input type="text" id="modal-new-goal-date" class="input-field" placeholder="YYYY-MM-DD">
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn-cancel" onclick="closeModal('modal-new-goal')">İptal</button>
                    <button class="modal-btn-submit" onclick="submitCreateGoal()">Oluştur</button>
                </div>
            </div>
        </div>

    </div>

    <script>
        // State Management
        let appState = {
            currentView: 'Dashboard',
            addType: 'expense',
            categories: {
                expense: ['Market', 'Giyim', 'Ulaşım', 'Dışarıda Yemek', 'Eğlence', 'Kira/Faturalar', 'Diğer'],
                income: ['Maaş', 'Freelance', 'Yatırım Geliri', 'Hediye', 'Diğer']
            },
            selectedCategory: 'Market'
        };

        // Otomatik Giriş Yaptırma
        let isRegisterMode = false;
        let currentUser = null;

        function getHeaders() {
            const token = currentUser ? "simulated_token_user_" + currentUser.id : "simulated_token_user_1";
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
        }

        function toggleAuthMode() {
            isRegisterMode = !isRegisterMode;
            const nameGroup = document.getElementById('auth-name-group');
            const submitBtn = document.getElementById('auth-submit-btn');
            const toggleLink = document.getElementById('auth-toggle-link');
            const helperBox = document.getElementById('auth-helper-box');

            if (isRegisterMode) {
                nameGroup.style.display = 'block';
                submitBtn.innerText = 'Kayıt Ol';
                toggleLink.innerText = 'Zaten hesabınız var mı? Giriş Yapın';
                helperBox.style.display = 'none';
                document.getElementById('auth-email').value = '';
                document.getElementById('auth-password').value = '';
            } else {
                nameGroup.style.display = 'none';
                submitBtn.innerText = 'Giriş Yap';
                toggleLink.innerText = 'Hesabınız yok mu? Kayıt Olun';
                helperBox.style.display = 'block';
                document.getElementById('auth-email').value = 'test@demo.com';
                document.getElementById('auth-password').value = '123456';
            }
        }

        function handleAuth() {
            if (isRegisterMode) {
                handleRegister();
            } else {
                handleLogin();
            }
        }

        function handleLogin() {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;

            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })
            .then(res => {
                if (!res.ok) throw new Error("Giriş yapılamadı.");
                return res.json();
            })
            .then(data => {
                currentUser = data.user;
                document.getElementById('screen-auth').style.display = 'none';
                document.getElementById('app-layout').style.display = 'flex';
                document.getElementById('user-display-name').innerText = data.user.name;
                initApp();
            })
            .catch(err => alert("Giriş Hatası: " + err.message));
        }

        function handleRegister() {
            const name = document.getElementById('auth-name').value;
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;

            if (!name || !email || !password) {
                alert("Lütfen tüm alanları doldurun.");
                return;
            }

            fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(data => { throw new Error(data.error || "Kayıt olunamadı.") });
                }
                return res.json();
            })
            .then(data => {
                alert("Kayıt başarılı! Giriş yapılıyor...");
                currentUser = data.user;
                document.getElementById('screen-auth').style.display = 'none';
                document.getElementById('app-layout').style.display = 'flex';
                document.getElementById('user-display-name').innerText = data.user.name;
                initApp();
            })
            .catch(err => alert("Kayıt Hatası: " + err.message));
        }

        function handleLogout() {
            currentUser = null;
            document.getElementById('screen-auth').style.display = 'flex';
            document.getElementById('app-layout').style.display = 'none';
        }

        // Uygulama Başlangıç
        function initApp() {
            // Ekleme kategorisi çiplerini oluştur
            renderCategoryChips();
            // Verileri yükle
            loadDashboardData();
            loadBudgetList();
            loadSavingsGoals();
            initChatbot();
            // Harita olaylarını ilklendir
            initMap();
        }

        // Görünüm Değiştirici (Screen Navigation Switcher)
        function switchView(viewName) {
            appState.currentView = viewName;
            
            // Tüm ekran görünümlerini gizle
            document.getElementById('view-dashboard').style.display = 'none';
            document.getElementById('view-add').style.display = 'none';
            document.getElementById('view-budgets').style.display = 'none';
            document.getElementById('view-savings').style.display = 'none';
            document.getElementById('view-map').style.display = 'none';
            document.getElementById('view-ai').style.display = 'none';

            // Navigasyon butonlarının sınıflarını temizle
            document.getElementById('nav-dash').classList.remove('active');
            document.getElementById('nav-add').classList.remove('active');
            document.getElementById('nav-budgets').classList.remove('active');
            document.getElementById('nav-savings').classList.remove('active');
            document.getElementById('nav-map').classList.remove('active');
            document.getElementById('nav-ai').classList.remove('active');

            // Hedef ekranı göster
            if (viewName === 'Dashboard') {
                document.getElementById('view-dashboard').style.display = 'block';
                document.getElementById('nav-dash').classList.add('active');
                loadDashboardData();
            } else if (viewName === 'Ekle') {
                document.getElementById('view-add').style.display = 'block';
                document.getElementById('nav-add').classList.add('active');
            } else if (viewName === 'Bütçe') {
                document.getElementById('view-budgets').style.display = 'block';
                document.getElementById('nav-budgets').classList.add('active');
                loadBudgetList();
            } else if (viewName === 'Tasarruf') {
                document.getElementById('view-savings').style.display = 'block';
                document.getElementById('nav-savings').classList.add('active');
                loadSavingsGoals();
            } else if (viewName === 'Harita') {
                document.getElementById('view-map').style.display = 'block';
                document.getElementById('nav-map').classList.add('active');
                resetMapState();
            } else if (viewName === 'Asistan') {
                document.getElementById('view-ai').style.display = 'flex';
                document.getElementById('nav-ai').classList.add('active');
            }
        }

        // Kategori Çiplerini Çiz
        function renderCategoryChips() {
            const container = document.getElementById('category-chips');
            container.innerHTML = '';
            const cats = appState.categories[appState.addType];
            appState.selectedCategory = cats[0];

            cats.forEach((cat, index) => {
                const chip = document.createElement('div');
                chip.className = `chip ${index === 0 ? 'active' : ''}`;
                chip.innerText = cat;
                chip.onclick = () => {
                    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    appState.selectedCategory = cat;
                };
                container.appendChild(chip);
            });
        }

        function setAddType(type) {
            appState.addType = type;
            document.getElementById('tab-expense').classList.remove('active');
            document.getElementById('tab-income').classList.remove('active');

            if (type === 'expense') {
                document.getElementById('tab-expense').classList.add('active');
                document.getElementById('add-impulse-row').style.display = 'flex';
            } else {
                document.getElementById('tab-income').classList.add('active');
                document.getElementById('add-impulse-row').style.display = 'none';
            }
            renderCategoryChips();
        }

        // --- VERİ ÇEKME VE GÜNCELLEME METOTLARI ---

        function loadDashboardData() {
            // AI Raporu/İstatistikler
            fetch('/api/ai/analysis', { headers: getHeaders() })
            .then(res => res.json())
            .then(data => {
                const stats = data.stats;
                document.getElementById('dash-balance').innerText = stats.balance.toLocaleString('tr-TR') + ' ₺';
                document.getElementById('dash-income').innerText = '+' + stats.totalIncome.toLocaleString('tr-TR') + ' ₺';
                document.getElementById('dash-expense').innerText = '-' + stats.totalExpense.toLocaleString('tr-TR') + ' ₺';
                
                // Dürtü analizi
                document.getElementById('dash-impulse-circle').innerText = '%' + stats.impulsivityScore;
                if (stats.impulsivityScore > 50) {
                    document.getElementById('dash-impulse-text').innerText = `Dürtüsel harcamalarınız (%${stats.impulsivityScore}) yüksek. Toplam plansız harcama: ${stats.impulsiveExpense} TL. Yapay zeka harcamayı kısmayı tavsiye ediyor.`;
                } else if (stats.impulsivityScore > 10) {
                    document.getElementById('dash-impulse-text').innerText = `Genel harcamalarınız normal aralıkta, dürtüsel harcamanız: ${stats.impulsiveExpense} TL.`;
                } else {
                    document.getElementById('dash-impulse-text').innerText = `Finansal disiplininiz harika! Bu ay plansız dürtüsel harcama neredeyse yapmadınız.`;
                }

                // AI Önerileri
                const recContainer = document.getElementById('dash-ai-rec-list');
                recContainer.innerHTML = '';
                data.recommendations.forEach(rec => {
                    const item = document.createElement('div');
                    item.style.marginBottom = '6px';
                    item.innerText = '💡 ' + rec;
                    recContainer.appendChild(item);
                });

                // Bütçe limit aşımları
                const warningContainer = document.getElementById('dash-warnings');
                warningContainer.innerHTML = '';
                if (data.budgetAlerts && data.budgetAlerts.length > 0) {
                    data.budgetAlerts.forEach(alert => {
                        const warnCard = document.createElement('div');
                        warnCard.className = 'notification-card';
                        warnCard.innerHTML = `
                            <div class="notification-title">🚨 Bütçe Sınırı Aşıldı!</div>
                            <div><b>${alert.category}</b> kategorisi için bütçeniz ${alert.over.toLocaleString('tr-TR')} TL aşıldı! (Aylık Limit: ${alert.limit} TL)</div>
                        `;
                        warningContainer.appendChild(warnCard);
                    });
                }
            });

            // Son 5 Harcama
            fetch('/api/transactions', { headers: getHeaders() })
            .then(res => res.json())
            .then(data => {
                const listContainer = document.getElementById('dash-transactions-list');
                listContainer.innerHTML = '';

                if (data.transactions.length === 0) {
                    listContainer.innerHTML = '<div style="color:var(--text-sub); text-align:center; font-size:12px; padding:10px;">İşlem bulunamadı.</div>';
                    return;
                }

                data.transactions.slice(0, 5).forEach(t => {
                    const item = document.createElement('div');
                    item.className = 'list-item';
                    
                    const emoji = t.type === 'income' ? '💵' : (t.is_impulsive ? '⚡' : '🏷️');
                    const colorClass = t.type === 'income' ? 'income' : 'expense';
                    const prefix = t.type === 'income' ? '+' : '-';
                    const impulsiveBadge = t.is_impulsive ? '<span class="durtu-badge">Dürtüsel</span>' : '';

                    item.innerHTML = `
                        <div class="item-left">
                            <span class="item-emoji">${emoji}</span>
                            <div>
                                <div class="item-name">${t.category}</div>
                                <div class="item-desc">${t.description || ''}</div>
                            </div>
                        </div>
                        <div class="item-right">
                            <div class="item-val ${colorClass}">${prefix}${t.amount} ₺</div>
                            ${impulsiveBadge}
                            <button class="delete-btn" onclick="deleteTransaction(${t.id})">❌</button>
                        </div>
                    `;
                    listContainer.appendChild(item);
                });
            });
        }

        // Harcama Ekleme Submit
        function submitTransaction() {
            const amount = parseFloat(document.getElementById('add-amount').value);
            const description = document.getElementById('add-desc').value;
            const is_impulsive = document.getElementById('add-is-impulsive').checked;

            if (!amount || amount <= 0) {
                alert("Geçerli bir tutar girin.");
                return;
            }

            const body = {
                type: appState.addType,
                amount: amount,
                category: appState.selectedCategory,
                description: description,
                is_impulsive: appState.addType === 'expense' ? is_impulsive : false
            };

            fetch('/api/transactions', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body)
            })
            .then(res => res.json())
            .then(data => {
                if (data.alert) {
                    alert(`${data.alert.title}\n\n${data.alert.message}`);
                } else {
                    alert("İşlem başarıyla kaydedildi.");
                }
                
                // Formu sıfırla
                document.getElementById('add-amount').value = '';
                document.getElementById('add-desc').value = '';
                document.getElementById('add-is-impulsive').checked = false;

                switchView('Dashboard');
            })
            .catch(err => alert("Hata oluştu: " + err.message));
        }

        // Harcama Sil
        function deleteTransaction(id) {
            if(!confirm("Bu harcamayı silmek istediğinize emin misiniz?")) return;
            fetch(`/api/transactions/${id}`, { method: 'DELETE', headers: getHeaders() })
            .then(() => loadDashboardData());
        }

        // --- BÜTÇE LİMİTLERİ ---

        function loadBudgetList() {
            Promise.all([
                fetch('/api/budgets', { headers: getHeaders() }).then(res => res.json()),
                fetch('/api/ai/analysis', { headers: getHeaders() }).then(res => res.json())
            ])
            .then(([budgetData, analysisData]) => {
                const container = document.getElementById('budget-list-container');
                container.innerHTML = '';

                // Kategoriye ait harcamaları eşle
                const spentMap = analysisData.categoryExpenses || {};
                
                // Dashboard listesinde bulamadıklarımızı diğer son işlemlerden hesaplayalım
                const budgets = {};
                budgetData.budgets.forEach(b => {
                    budgets[b.category] = b.monthly_limit;
                });

                appState.categories.expense.forEach(cat => {
                    const limit = budgets[cat] || 0;
                    const spent = spentMap[cat] || 0; // Analiz servisinden çekilen
                    const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                    const fillBgColor = spent > limit ? 'var(--rose)' : percent > 85 ? 'var(--amber)' : 'var(--emerald)';

                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-weight:bold; font-size:14px;">🏷️ ${cat}</div>
                            <button class="add-money-btn" onclick="openSetBudgetModal('${cat}', ${limit})">Limit Ayarla</button>
                        </div>
                        ${limit > 0 ? `
                            <div style="margin-top:12px;">
                                <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-sub); margin-bottom:5px;">
                                    <span>Harcanan: ${spent.toLocaleString('tr-TR')} ₺</span>
                                    <span>Limit: ${limit.toLocaleString('tr-TR')} ₺</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar-bg">
                                        <div class="progress-bar-fill" style="width: ${percent}%; background-color: ${fillBgColor}"></div>
                                    </div>
                                    <span class="percent-text" style="color: ${spent > limit ? 'var(--rose)': 'white'}">%${percent}</span>
                                </div>
                                ${spent > limit ? `<div style="color:var(--rose); font-size:9.5px; font-weight:bold; margin-top:5px;">⚠️ Bütçe sınırını aştınız! Harcamaları kısıtlayın.</div>` : ''}
                            </div>
                        ` : `
                            <div style="font-size:11px; color:var(--text-sub); margin-top:10px; font-style:italic;">Tanımlanmış bütçe limiti bulunmuyor.</div>
                        `}
                    `;
                    container.appendChild(card);
                });
            });
        }

        function openSetBudgetModal(cat, currentLimit) {
            document.getElementById('modal-budget-title').innerText = `"${cat}" Aylık Bütçe Sınırı`;
            document.getElementById('modal-budget-cat').value = cat;
            document.getElementById('modal-budget-limit').value = currentLimit || '';
            document.getElementById('modal-set-budget').style.display = 'flex';
        }

        function submitSetBudget() {
            const cat = document.getElementById('modal-budget-cat').value;
            const limit = parseFloat(document.getElementById('modal-budget-limit').value);

            if (isNaN(limit) || limit < 0) {
                alert("Geçerli bir limit girin.");
                return;
            }

            fetch('/api/budgets', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ category: cat, monthly_limit: limit })
            })
            .then(() => {
                closeModal('modal-set-budget');
                loadBudgetList();
            });
        }

        // --- TASARRUF HEDEFLERİ ---

        function loadSavingsGoals() {
            fetch('/api/savings', { headers: getHeaders() })
            .then(res => res.json())
            .then(data => {
                const container = document.getElementById('savings-list-container');
                container.innerHTML = '';

                if (data.savingsGoals.length === 0) {
                    container.innerHTML = '<div style="color:var(--text-sub); text-align:center; font-size:12px; padding:30px;">Henüz tasarruf hedefi eklenmedi.</div>';
                    return;
                }

                data.savingsGoals.forEach(g => {
                    const percent = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `
                        <div style="font-weight:bold; font-size:15px; margin-bottom:8px;">🎯 ${g.title}</div>
                        <div style="font-size:18px; font-weight:bold; color:var(--emerald);">${g.current_amount.toLocaleString('tr-TR')} ₺ <span style="font-size:12px; color:var(--text-sub); font-weight:normal;">/ ${g.target_amount.toLocaleString('tr-TR')} ₺</span></div>
                        
                        <div class="progress-bar-container" style="margin-top:10px;">
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" style="width: ${percent}%;"></div>
                            </div>
                            <span class="percent-text">%${percent}</span>
                        </div>

                        <div class="card-footer-flex">
                            <span style="font-size:10px; color:var(--text-sub);">📅 Son Tarih: ${g.deadline || 'Belirtilmedi'}</span>
                            <button class="add-money-btn" onclick="openAddMoneyModal(${g.id})">Para Ekle</button>
                        </div>
                    `;
                    container.appendChild(card);
                });
            });
        }

        function openNewGoalModal() {
            document.getElementById('modal-new-goal-title').value = '';
            document.getElementById('modal-new-goal-target').value = '';
            document.getElementById('modal-new-goal-current').value = '0';
            document.getElementById('modal-new-goal-date').value = '';
            document.getElementById('modal-new-goal').style.display = 'flex';
        }

        function submitCreateGoal() {
            const title = document.getElementById('modal-new-goal-title').value;
            const target = parseFloat(document.getElementById('modal-new-goal-target').value);
            const current = parseFloat(document.getElementById('modal-new-goal-current').value) || 0;
            const deadline = document.getElementById('modal-new-goal-date').value;

            if (!title || !target || target <= 0) {
                alert("Geçerli başlık ve hedef miktar girin.");
                return;
            }

            fetch('/api/savings', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ title, target_amount: target, current_amount: current, deadline })
            })
            .then(() => {
                closeModal('modal-new-goal');
                loadSavingsGoals();
            });
        }

        function openAddMoneyModal(id) {
            document.getElementById('modal-goal-id').value = id;
            document.getElementById('modal-goal-amount').value = '';
            document.getElementById('modal-add-money').style.display = 'flex';
        }

        function submitAddMoney() {
            const id = document.getElementById('modal-goal-id').value;
            const amount = parseFloat(document.getElementById('modal-goal-amount').value);

            if (isNaN(amount) || amount <= 0) {
                alert("Geçerli tutar girin.");
                return;
            }

            fetch(`/api/savings/${id}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ amount })
            })
            .then(res => res.json())
            .then(data => {
                if (data.alert) {
                    alert(`${data.alert.title}\n\n${data.alert.message}`);
                }
                closeModal('modal-add-money');
                loadSavingsGoals();
            });
        }

        // Modal Kapatma
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        // --- AI SOHBET ASİSTANI ---
        
        function initChatbot() {
            const container = document.getElementById('chat-messages-container');
            container.innerHTML = '';
            
            // İlk bot mesajı
            const welcome = document.createElement('div');
            welcome.className = 'chat-bubble bot';
            welcome.innerText = 'Merhaba! Ben "Elim Cebimde" AI Finansal Asistanınızım. Harcamalarınızı kontrol etme, tasarruf etme veya dürtüsel alışverişlerinizi önleme konularında nasıl yardımcı olabilirim? 🚀';
            container.appendChild(welcome);
        }

        function sendQuickChat(promptText) {
            document.getElementById('chat-input-field').value = promptText;
            sendChatMessage();
        }

        function sendChatMessage() {
            const input = document.getElementById('chat-input-field');
            const text = input.value.trim();
            if (!text) return;

            const container = document.getElementById('chat-messages-container');

            // Kullanıcı Baloncuğu Ekle
            const userBubble = document.createElement('div');
            userBubble.className = 'chat-bubble user';
            userBubble.innerText = text;
            container.appendChild(userBubble);
            input.value = '';

            // AI Yazıyor animasyonu simüle et
            const loadingBubble = document.createElement('div');
            loadingBubble.className = 'chat-bubble bot';
            loadingBubble.id = 'ai-loading-bubble';
            loadingBubble.innerText = 'Düşünülüyor...';
            container.appendChild(loadingBubble);
            container.scrollTop = container.scrollHeight;

            fetch('/api/ai/chat', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ message: text })
            })
            .then(res => res.json())
            .then(data => {
                // Loading kaldır
                const loading = document.getElementById('ai-loading-bubble');
                if (loading) loading.remove();

                // Bot Baloncuğu Ekle
                const botBubble = document.createElement('div');
                botBubble.className = 'chat-bubble bot';
                botBubble.innerText = data.reply;
                container.appendChild(botBubble);
                container.scrollTop = container.scrollHeight;
            })
            .catch(() => {
                const loading = document.getElementById('ai-loading-bubble');
                if (loading) loading.innerText = "Bağlantı hatası oluştu.";
            });
        }

        // --- AKILLI HARİTA & KONUM TAKİBİ SİMÜLASYONU ---
        let mapState = {
            avatarX: 180,
            avatarY: 180,
            isDragging: false,
            proximityTimer: null,
            activeWarningShop: null,
            proximityRadius: 65, // Piksel cinsinden etki alanı
            shops: [
                {
                    id: 'zara',
                    name: 'Zara',
                    x: 80,
                    y: 80,
                    warningMsg: 'Zara vitrin alarmı! 👕 Gardırobunuzu doldurmadan önce 24 saat kuralını uygulayın.',
                    category: 'Giyim'
                },
                {
                    id: 'starbucks',
                    name: 'Starbucks',
                    x: 300,
                    y: 90,
                    warningMsg: 'Kahve kokusu bütçenizi delmesin! ☕ Bu kahve gerçekten gerekli mi?',
                    category: 'Dışarıda Yemek'
                },
                {
                    id: 'apple',
                    name: 'Apple Store',
                    x: 80,
                    y: 260,
                    warningMsg: 'Apple Store uyarısı! 📱 Yeni teknoloji cazip gelebilir ama tasarruf hedefinizi düşünün.',
                    category: 'Elektronik'
                },
                {
                    id: 'burger',
                    name: 'Burger King',
                    x: 290,
                    y: 270,
                    warningMsg: 'Burger King ayaküstü harcama alarmı! 🍔 Ev yapımı yemekler daha ekonomik.',
                    category: 'Dışarıda Yemek'
                }
            ]
        };

        function playNotificationSound() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                function beep(freq, duration, delay) {
                    setTimeout(() => {
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.frequency.value = freq;
                        osc.type = 'sine';
                        gain.gain.setValueAtTime(0, audioCtx.currentTime);
                        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
                        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                        osc.start();
                        osc.stop(audioCtx.currentTime + duration);
                    }, delay);
                }
                beep(880, 0.15, 0);
                beep(1100, 0.25, 150);
            } catch (e) {
                console.log("AudioContext blocked or unsupported", e);
            }
        }

        function triggerProximityAlert(shop) {
            const notif = document.getElementById('virtual-notification');
            document.getElementById('notif-title').innerText = `🚨 Dürtüsel Alışveriş Tuzağı: ${shop.name}`;
            document.getElementById('notif-msg').innerText = shop.warningMsg;
            notif.style.top = '10px';
            playNotificationSound();

            document.querySelectorAll('.shop-node').forEach(node => {
                node.style.transform = 'scale(1)';
                node.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
            });
            const activeShopEl = document.getElementById(`shop-${shop.id}`);
            if (activeShopEl) {
                activeShopEl.style.transform = 'scale(1.15)';
                activeShopEl.style.filter = 'drop-shadow(0 0 15px rgba(244, 63, 94, 0.8))';
            }
        }

        function closeVirtualNotification() {
            document.getElementById('virtual-notification').style.top = '-100px';
            document.querySelectorAll('.shop-node').forEach(node => {
                node.style.transform = 'scale(1)';
                node.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
            });
        }

        function checkProximity(isMoving) {
            let nearAnyShop = false;
            let closestShop = null;
            let minDistance = Infinity;

            mapState.shops.forEach(shop => {
                const dx = mapState.avatarX - shop.x;
                const dy = mapState.avatarY - shop.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mapState.proximityRadius) {
                    nearAnyShop = true;
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestShop = shop;
                    }
                }
            });

            const radar = document.getElementById('map-radar');
            if (nearAnyShop && closestShop) {
                if (radar) {
                    radar.style.display = 'block';
                    radar.style.left = (mapState.avatarX - 40) + 'px';
                    radar.style.top = (mapState.avatarY - 40) + 'px';
                }

                if (mapState.activeWarningShop !== closestShop.id) {
                    clearTimeout(mapState.proximityTimer);
                    mapState.proximityTimer = null;
                    mapState.activeWarningShop = closestShop.id;
                    closeVirtualNotification();
                }

                if (isMoving) {
                    clearTimeout(mapState.proximityTimer);
                    if (document.getElementById('virtual-notification').style.top === '10px') {
                        closeVirtualNotification();
                    }
                    mapState.proximityTimer = setTimeout(() => {
                        triggerProximityAlert(closestShop);
                    }, 1500);
                }
            } else {
                if (radar) radar.style.display = 'none';
                clearTimeout(mapState.proximityTimer);
                mapState.proximityTimer = null;
                mapState.activeWarningShop = null;
                closeVirtualNotification();
            }
        }

        function updateAvatarPosition(x, y) {
            const container = document.getElementById('map-canvas-container');
            if (!container) return;
            const width = container.clientWidth;
            const height = container.clientHeight;

            x = Math.max(20, Math.min(width - 20, x));
            y = Math.max(20, Math.min(height - 20, y));

            mapState.avatarX = x;
            mapState.avatarY = y;

            const avatar = document.getElementById('map-avatar');
            if (avatar) {
                avatar.style.left = (x - 20) + 'px';
                avatar.style.top = (y - 20) + 'px';
            }

            checkProximity(true);
        }

        function resetMapState() {
            clearTimeout(mapState.proximityTimer);
            mapState.proximityTimer = null;
            mapState.activeWarningShop = null;
            closeVirtualNotification();
            updateAvatarPosition(180, 180);
            const radar = document.getElementById('map-radar');
            if (radar) radar.style.display = 'none';
        }

        function initMap() {
            const avatar = document.getElementById('map-avatar');
            const container = document.getElementById('map-canvas-container');
            if (!avatar || !container) return;

            // Drag eventleri
            avatar.addEventListener('mousedown', (e) => {
                mapState.isDragging = true;
                avatar.style.cursor = 'grabbing';
                e.stopPropagation();
                e.preventDefault();
            });

            window.addEventListener('mousemove', (e) => {
                if (!mapState.isDragging) return;
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                updateAvatarPosition(x, y);
            });

            window.addEventListener('mouseup', () => {
                if (mapState.isDragging) {
                    mapState.isDragging = false;
                    avatar.style.cursor = 'grab';
                    checkProximity(true);
                }
            });

            // Mobil cihaz dokunmatik desteği
            avatar.addEventListener('touchstart', (e) => {
                mapState.isDragging = true;
                e.stopPropagation();
                e.preventDefault();
            }, { passive: false });

            window.addEventListener('touchmove', (e) => {
                if (!mapState.isDragging) return;
                if (e.touches.length === 0) return;
                const touch = e.touches[0];
                const rect = container.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                updateAvatarPosition(x, y);
            }, { passive: false });

            window.addEventListener('touchend', () => {
                if (mapState.isDragging) {
                    mapState.isDragging = false;
                    checkProximity(true);
                }
            });

            // Tıklayarak gitme desteği
            container.addEventListener('click', (e) => {
                // Eğer doğrudan avatar'a veya shop-node'a tıklanmadıysa git
                if (e.target.closest('#map-avatar')) return;
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                updateAvatarPosition(x, y);
            });
        }

    </script>
</body>
</html>
"""

# Ana Döngü
if __name__ == '__main__':
    # Veritabanını kur
    init_db()
    
    # Sunucuyu Başlat
    handler = SimulatorHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Elim Cebimde Prototip Simülatörü hazırdır!")
        print(f"Tarayıcınızdan şu adrese gidin: http://localhost:{PORT}")
        print("Çıkmak için Terminal penceresinde Ctrl+C tuşlarına basın.")
        
        # Tarayıcıyı otomatik olarak aç
        webbrowser.open(f"http://localhost:{PORT}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nSunucu kapatılıyor.")
            sys.exit(0)
