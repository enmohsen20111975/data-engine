"""
Data Pipeline for Analysis Engine
خط أنابيب البيانات لمحرك التحليل
"""

import sqlite3
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from .config import Config, MarketRegime, LiquidityFilter

# Database path
DB_PATH = Path(__file__).parent.parent / 'data' / 'data_engine.db'

@dataclass
class StockData:
    """بيانات السهم"""
    symbol: str
    name: str
    market: str
    price: float
    change_percent: float
    volume: float
    ohlcv: pd.DataFrame  # Open, High, Low, Close, Volume
    fundamentals: Dict
    technical_indicators: Dict

class DataPipeline:
    """
    خط أنابيب البيانات
    مسئول عن: جلب البيانات، التنظيف، الفلترة
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or str(DB_PATH)
        self.conn = None
        
    def connect(self):
        """الاتصال بقاعدة البيانات"""
        self.conn = sqlite3.connect(self.db_path)
        
    def disconnect(self):
        """إغلاق الاتصال"""
        if self.conn:
            self.conn.close()
            
    def get_all_stocks(self) -> List[Dict]:
        """جلب كل الأسهم"""
        query = """
            SELECT symbol, name, market, price, change_percent, 
                   volume, market_cap, logo_url
            FROM stocks
            WHERE price IS NOT NULL AND price > 0
        """
        df = pd.read_sql_query(query, self.conn)
        return df.to_dict('records')
    
    def get_historical_data(self, symbol: str, days: int = 365) -> pd.DataFrame:
        """
        جلب البيانات التاريخية (OHLCV)
        """
        query = f"""
            SELECT date, open, high, low, close, volume
            FROM historical_data
            WHERE symbol = ?
            ORDER BY date DESC
            LIMIT {days}
        """
        df = pd.read_sql_query(query, self.conn, params=[symbol])
        
        if df.empty:
            return pd.DataFrame()
            
        # Convert and sort
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        df = df.rename(columns={
            'date': 'Date',
            'open': 'Open',
            'high': 'High', 
            'low': 'Low',
            'close': 'Close',
            'volume': 'Volume'
        })
        
        # Clean data
        for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
        df = df.dropna()
        return df
    
    def get_fundamentals(self, symbol: str) -> Dict:
        """جلب البيانات الأساسية"""
        tables = [
            'tab_valuation',
            'tab_profitability', 
            'tab_dividends',
            'tab_income_statement',
            'tab_balance_sheet'
        ]
        
        result = {}
        for table in tables:
            try:
                query = f'SELECT * FROM "{table}" WHERE symbol = ? LIMIT 1'
                df = pd.read_sql_query(query, self.conn, params=[symbol])
                if not df.empty:
                    result[table] = df.iloc[0].to_dict()
            except:
                pass
                
        return result
    
    def get_technical_data(self, symbol: str) -> Dict:
        """جلب البيانات الفنية"""
        try:
            query = 'SELECT * FROM tab_technical_analysis WHERE symbol = ? LIMIT 1'
            df = pd.read_sql_query(query, self.conn, params=[symbol])
            if not df.empty:
                return df.iloc[0].to_dict()
        except:
            pass
        return {}
    
    def calculate_market_regime(self, ohlcv: pd.DataFrame) -> MarketRegime:
        """
        تحديد اتجاه السوق العام عبر SMA 200
        إذا كان السعر تحته = BEAR (تجميد إشارات الشراء)
        """
        if ohlcv.empty or len(ohlcv) < 200:
            return MarketRegime.SIDEWAYS
            
        sma_200 = ohlcv['Close'].rolling(window=200).mean().iloc[-1]
        current_price = ohlcv['Close'].iloc[-1]
        
        if current_price > sma_200 * 1.02:  # 2% above SMA
            return MarketRegime.BULL
        elif current_price < sma_200 * 0.98:  # 2% below SMA
            return MarketRegime.BEAR
        else:
            return MarketRegime.SIDEWAYS
    
    def filter_by_liquidity(self, stocks: List[Dict]) -> List[Dict]:
        """
        فلترة الأسهم حسب السيولة
        استبعاد الأسهم الميتة (أقل من 500 ألف سهم أو 2 مليون جنيه)
        """
        filtered = []
        
        for stock in stocks:
            volume = stock.get('volume', 0) or 0
            price = stock.get('price', 0) or 0
            
            # Parse volume if string
            if isinstance(volume, str):
                volume = float(volume.replace(',', '')) if volume else 0
            if isinstance(price, str):
                price = float(price.replace(',', '').replace('SAR', '').replace('EGP', '')) if price else 0
            
            # Calculate daily value
            daily_value = volume * price
            
            # Apply liquidity filter
            if volume >= Config.LIQUIDITY.MIN_VOLUME_SHARES or daily_value >= Config.LIQUIDITY.MIN_VALUE_EGP:
                filtered.append(stock)
                
        return filtered
    
    def _parse_numeric(self, val, default=0.0) -> float:
        """تحويل القيمة لرقم مع التعامل مع التنسيقات المختلفة"""
        if val is None:
            return default
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            val = val.strip()
            # Handle M (millions) and B (billions)
            multiplier = 1
            if val.endswith('M') or val.endswith('م'):
                multiplier = 1_000_000
                val = val[:-1]
            elif val.endswith('B') or val.endswith('ب'):
                multiplier = 1_000_000_000
                val = val[:-1]
            elif val.endswith('K') or val.endswith('ك'):
                multiplier = 1_000
                val = val[:-1]
            
            # Remove non-numeric chars except . and -
            val = ''.join(c for c in val if c.isdigit() or c == '.' or c == '-')
            
            try:
                return float(val) * multiplier if val else default
            except:
                return default
        return default
    
    def get_stock_data(self, symbol: str) -> Optional[StockData]:
        """جلب كل بيانات سهم معين"""
        # Get basic info
        query = "SELECT * FROM stocks WHERE symbol = ?"
        df = pd.read_sql_query(query, self.conn, params=[symbol])
        
        if df.empty:
            return None
            
        row = df.iloc[0]
        
        # Get historical data
        ohlcv = self.get_historical_data(symbol)
        
        # Get fundamentals
        fundamentals = self.get_fundamentals(symbol)
        
        # Get technical indicators
        technical = self.get_technical_data(symbol)
        
        return StockData(
            symbol=row['symbol'],
            name=str(row.get('name', '')),
            market=str(row.get('market', '')),
            price=self._parse_numeric(row.get('price', 0)),
            change_percent=str(row.get('change_percent', '0')),
            volume=self._parse_numeric(row.get('volume', 0)),
            ohlcv=ohlcv,
            fundamentals=fundamentals,
            technical_indicators=technical
        )
    
    def prepare_analysis_data(self, market: str = None) -> List[StockData]:
        """
        تحضير البيانات للتحليل
        - جلب كل الأسهم
        - فلترة السيولة
        - جلب البيانات التاريخية
        """
        self.connect()
        
        try:
            # Get all stocks
            stocks = self.get_all_stocks()
            
            # Filter by market if specified
            if market:
                stocks = [s for s in stocks if s.get('market') == market]
            
            # Filter by liquidity
            stocks = self.filter_by_liquidity(stocks)
            
            print(f"✓ {len(stocks)} stocks passed liquidity filter")
            
            # Get detailed data for each
            result = []
            for stock in stocks[:50]:  # Limit for performance
                try:
                    data = self.get_stock_data(stock['symbol'])
                    if data and not data.ohlcv.empty:
                        result.append(data)
                except Exception as e:
                    print(f"  ⚠ Error processing {stock['symbol']}: {e}")
                    
            print(f"✓ {len(result)} stocks with complete data")
            return result
            
        finally:
            self.disconnect()


if __name__ == '__main__':
    # Test
    pipeline = DataPipeline()
    stocks = pipeline.prepare_analysis_data(market='السعودية')
    print(f"\n{len(stocks)} stocks ready for analysis")
