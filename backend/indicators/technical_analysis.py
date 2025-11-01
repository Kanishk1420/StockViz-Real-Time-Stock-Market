import talib
import numpy as np
import pandas as pd

class TechnicalAnalysis:
    @staticmethod
    def calculate_indicators(df):
        """Calculate technical indicators using TA-Lib"""
        try:
            indicators = {}

            # Convert to numpy arrays for TA-Lib
            close = df['Close'].values
            high = df['High'].values
            low = df['Low'].values
            open_price = df['Open'].values  # Fixed: was using built-in 'open' function
            volume = df['Volume'].values
            
            # Moving Averages
            indicators['SMA_20'] = talib.SMA(close, timeperiod=20)
            indicators['EMA_20'] = talib.EMA(close, timeperiod=20)
            indicators['SMA_50'] = talib.SMA(close, timeperiod=50)
            
            # RSI
            indicators['RSI'] = talib.RSI(close, timeperiod=14)
            
            # MACD
            macd, signal, hist = talib.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)
            indicators['MACD'] = macd
            indicators['MACD_Signal'] = signal
            indicators['MACD_Hist'] = hist
            
            # Bollinger Bands
            upper, middle, lower = talib.BBANDS(close, timeperiod=20)
            indicators['BB_Upper'] = upper
            indicators['BB_Middle'] = middle
            indicators['BB_Lower'] = lower
            
            # Volume indicators
            indicators['OBV'] = talib.OBV(close, volume)
            
            # Momentum indicators
            indicators['MOM'] = talib.MOM(close, timeperiod=10)
            indicators['ROC'] = talib.ROC(close, timeperiod=10)
            
            # Candlestick patterns
            indicators['DOJI'] = talib.CDLDOJI(open_price, high, low, close)
            indicators['HAMMER'] = talib.CDLHAMMER(open_price, high, low, close)
            indicators['ENGULFING'] = talib.CDLENGULFING(open_price, high, low, close)
            
            return indicators
        except Exception as e:
            print(f"Error calculating indicators: {e}")
            return None

    @staticmethod
    def get_support_resistance(df, window=20):
        """Calculate support and resistance levels using TA-Lib"""
        try:
            high = df['High'].values
            low = df['Low'].values
            close = df['Close'].values
            
            # Calculate pivot points
            pivot = (high + low + close) / 3
            r1 = 2 * pivot - low
            s1 = 2 * pivot - high
            
            return {
                'pivot': pivot[-1],
                'resistance1': r1[-1],
                'support1': s1[-1]
            }
        except Exception as e:
            print(f"Error calculating support/resistance: {e}")
            return None