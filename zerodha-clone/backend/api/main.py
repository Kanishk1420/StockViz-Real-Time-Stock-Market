import logging
import asyncio
import json
import yfinance as yf
import talib
import numpy as np
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
from starlette.websockets import WebSocketState
from typing import List, Dict, Any
from datetime import datetime
import pandas as pd

logging.basicConfig(level=logging.INFO)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STOCKS = [
    ('RELIANCE.NS', 'Reliance Industries', 'Energy'),
    ('TCS.NS', 'Tata Consultancy Services', 'Technology'),
    ('HDFCBANK.NS', 'HDFC Bank', 'Banking'),
    ('INFY.NS', 'Infosys', 'Technology'),
    ('ICICIBANK.NS', 'ICICI Bank', 'Banking'),
    ('HINDUNILVR.NS', 'Hindustan Unilever', 'Consumer Goods'),
    ('ITC.NS', 'ITC', 'Consumer Goods'),
    ('SBIN.NS', 'State Bank of India', 'Banking'),
    ('BHARTIARTL.NS', 'Bharti Airtel', 'Telecommunications'),
    ('LT.NS', 'Larsen & Toubro', 'Engineering')
]

class StockDataManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.last_updates: Dict[str, datetime] = {}
        self.connection_durations: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, duration: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_durations[websocket] = duration
        logging.info(f"New WebSocket connection established with duration: {duration}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            self.connection_durations.pop(websocket, None)
            logging.info("WebSocket connection closed")

    def get_duration_params(self, duration: str) -> tuple:
        return {
            '1m': ('1d', '1m'),
            '5m': ('1d', '5m'),
            '15m': ('1d', '15m'),
            '30m': ('5d', '30m'),
            '1h': ('1mo', '1h'),
            '4h': ('3mo', '1h'),
            '1d': ('1mo', '1d'),
            '1w': ('6mo', '1wk'),
            '1mo': ('2y', '1mo')
        }.get(duration, ('1d', '5m'))

    def get_update_interval(self, duration: str) -> int:
        return {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '30m': 1800,
            '1h': 3600,
            '4h': 14400,
            '1d': 86400,
            '1w': 604800,
            '1mo': 2592000
        }.get(duration, 300)

    def should_update(self, symbol: str, duration: str) -> bool:
        current_time = datetime.now()
        last_update_key = f"{symbol}_{duration}"
        last_update = self.last_updates.get(last_update_key)
        
        if not last_update:
            self.last_updates[last_update_key] = current_time
            return True

        interval = self.get_update_interval(duration)
        return (current_time - last_update).total_seconds() >= interval

    def process_historical_data(self, hist: pd.DataFrame) -> List[Dict]:
        historical = []
        for index, row in hist.iterrows():
            if pd.isna(row['Close']) or pd.isna(row['Volume']):
                continue
                
            data_point = {
                "time": int(index.timestamp() * 1000),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume']),
                "price": float(row['Close'])
            }
            historical.append(data_point)
        return historical

    def empty_response(self, symbol: str, duration: str) -> Dict[str, Any]:
        return {
            "symbol": symbol,
            "duration": duration,
            "price": 0,
            "change": 0,
            "historical": [],
            "high": 0,
            "low": 0,
            "volume": 0,
            "lastUpdate": int(datetime.now().timestamp() * 1000)
        }

    async def get_stock_data(self, symbol: str, duration: str = '1d') -> Dict[str, Any]:
        try:
            cache_key = f"{symbol}_{duration}"
            if not self.should_update(symbol, duration) and cache_key in self.cache:
                return self.cache[cache_key]['data']

            stock = yf.Ticker(symbol)
            period, interval = self.get_duration_params(duration)
            
            hist = await asyncio.to_thread(lambda: stock.history(period=period, interval=interval))
            
            if hist.empty:
                return self.empty_response(symbol, duration)

            # Ensure numeric columns are properly converted
            numeric_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
            for col in numeric_columns:
                hist[col] = pd.to_numeric(hist[col], errors='coerce')

            historical = self.process_historical_data(hist)
            
            current_price = float(hist['Close'].iloc[-1])
            open_price = float(hist['Open'].iloc[0])
            price_change = ((current_price - open_price) / open_price * 100) if open_price != 0 else 0
            
            data = {
                "symbol": symbol,
                "duration": duration,
                "price": current_price,
                "change": float(price_change),
                "historical": historical,
                "high": float(hist['High'].max()),
                "low": float(hist['Low'].min()),
                "volume": int(hist['Volume'].sum()),
                "lastUpdate": int(datetime.now().timestamp() * 1000)
            }

            self.cache[cache_key] = {
                'data': data,
                'timestamp': datetime.now()
            }

            return data

        except Exception as e:
            logging.error(f"Error getting stock data for {symbol}: {e}")
            return self.empty_response(symbol, duration)

    async def broadcast_price_updates(self):
        while True:
            try:
                for stock in STOCKS:
                    symbol = stock[0]
                    duration_groups = {}
                    for conn in self.active_connections:
                        if conn.client_state == WebSocketState.CONNECTED:
                            duration = self.connection_durations.get(conn, '1d')
                            duration_groups.setdefault(duration, []).append(conn)

                    for duration, connections in duration_groups.items():
                        if self.should_update(symbol, duration):
                            try:
                                data = await self.get_stock_data(symbol, duration)
                                for connection in connections:
                                    await connection.send_json(data)
                            except Exception as e:
                                logging.error(f"Error broadcasting {symbol} for duration {duration}: {e}")

                await asyncio.sleep(1)
            except Exception as e:
                logging.error(f"Broadcast error: {e}")
                await asyncio.sleep(5)

stock_manager = StockDataManager()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(stock_manager.broadcast_price_updates())

@app.get("/api/stocks")
async def get_stocks():
    return STOCKS

@app.get("/api/stock/{symbol}")
async def get_stock(symbol: str, duration: str = '1d'):
    return await stock_manager.get_stock_data(symbol, duration)
last_fetch_time = 0
cached_data = None
CACHE_DURATION = 30 * 60  # 30 minutes in seconds

@app.get("/api/market-indices")
async def get_market_indices():
    global last_fetch_time, cached_data
    
    current_time = time.time()
    if cached_data and (current_time - last_fetch_time) < CACHE_DURATION:
        return JSONResponse(cached_data)
        
    try:
        nifty = yf.Ticker("^NSEI")
        sensex = yf.Ticker("^BSESN")
        
        nifty_data = nifty.history(period="1d")
        sensex_data = sensex.history(period="1d")
        
        cached_data = {
            "nifty": {
                "value": float(nifty_data['Close'].iloc[-1]),
                "change": float(((nifty_data['Close'].iloc[-1] - nifty_data['Open'].iloc[0]) / nifty_data['Open'].iloc[0]) * 100)
            },
            "sensex": {
                "value": float(sensex_data['Close'].iloc[-1]),
                "change": float(((sensex_data['Close'].iloc[-1] - sensex_data['Open'].iloc[0]) / sensex_data['Open'].iloc[0]) * 100)
            }
        }
        last_fetch_time = current_time
        return JSONResponse(cached_data)
        
    except Exception as e:
        logging.error(f"Error fetching market indices: {e}")
        return {"error": str(e)}

@app.websocket("/ws/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str, duration: str = '1d'):
    await stock_manager.connect(websocket, duration)
    try:
        initial_data = await stock_manager.get_stock_data(symbol, duration)
        await websocket.send_json(initial_data)
        
        while True:
            try:
                data = await websocket.receive_text()
                if data:
                    try:
                        client_data = json.loads(data)
                        if 'duration' in client_data:
                            stock_manager.connection_durations[websocket] = client_data['duration']
                    except json.JSONDecodeError:
                        pass
            except Exception as e:
                logging.error(f"WebSocket receive error: {e}")
                break
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
    finally:
        stock_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)