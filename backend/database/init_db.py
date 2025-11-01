import sqlite3
from contextlib import contextmanager
from datetime import datetime
import yfinance as yf

class DatabaseManager:
    def __init__(self, db_name='stock_data.db'):
        self.db_name = db_name
        self.conn = None
        self.create_tables()

    def connect(self):
        if not self.conn:
            self.conn = sqlite3.connect(self.db_name)

    def close(self):
        if self.conn:
            self.conn.close()
            self.conn = None

    @contextmanager
    def get_connection(self):
        self.connect()
        try:
            yield self.conn
        finally:
            self.close()

    def create_tables(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS stocks (
                    id INTEGER PRIMARY KEY,
                    symbol TEXT UNIQUE,
                    company_name TEXT,
                    sector TEXT,
                    last_price REAL,
                    last_update TIMESTAMP
                )
            ''')
            conn.commit()

    def get_latest_price(self, symbol):
        try:
            stock = yf.Ticker(symbol)
            hist = stock.history(period='1d')

            if hist.empty:
                return {"price": 0, "change": 0}

            current_price = hist['Close'].iloc[-1]
            prev_price = hist['Open'].iloc[0]
            price_change = ((current_price - prev_price) / prev_price) * 100

            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE stocks 
                    SET last_price = ?, last_update = ?
                    WHERE symbol = ?
                ''', (current_price, datetime.now(), symbol))
                conn.commit()

            return {
                "price": round(current_price, 2),
                "change": round(price_change, 2)
            }
        except Exception as e:
            print(f"Error fetching price for {symbol}: {e}")
            return {"price": 0, "change": 0}