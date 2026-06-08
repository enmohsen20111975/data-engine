"""
Technical Analysis Module
وحدة التحليل الفني المتقدم

يتضمن:
- Volume Profile Analysis
- Order Flow Analysis  
- Volatility Squeeze Detection
- Trend & Momentum Analysis
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

from .config import Config, Weights

@dataclass
class TechnicalScore:
    """نتيجة التحليل الفني"""
    total_score: float       # 0-100
    volume_profile: float    # نقاط Volume Profile
    order_flow: float        # نقاط Order Flow
    volatility: float        # نقاط Volatility
    trend: float             # نقاط الاتجاه
    momentum: float          # نقاط الزخم
    signals: List[str]       # الإشارات
    warnings: List[str]      # التحذيرات

class TechnicalAnalyzer:
    """
    المحلل الفني المتقدم
    """
    
    def __init__(self):
        self.weights = Config.WEIGHTS
        
    def analyze(self, df: pd.DataFrame, technical_data: Dict = None) -> TechnicalScore:
        """
        التحليل الفني الشامل
        """
        if df.empty or len(df) < 50:
            return TechnicalScore(0, 0, 0, 0, 0, 0, [], ['بيانات غير كافية'])
            
        signals = []
        warnings = []
        
        # 1. Volume Profile Analysis (25%)
        volume_score, volume_signals = self._analyze_volume_profile(df)
        signals.extend(volume_signals)
        
        # 2. Order Flow Analysis (20%)
        flow_score, flow_signals = self._analyze_order_flow(df)
        signals.extend(flow_signals)
        
        # 3. Volatility Squeeze (15%)
        vol_score, vol_signals = self._analyze_volatility_squeeze(df)
        signals.extend(vol_signals)
        
        # 4. Trend Analysis (15%)
        trend_score, trend_signals = self._analyze_trend(df)
        signals.extend(trend_signals)
        
        # 5. Momentum (15%)
        momentum_score, mom_signals = self._analyze_momentum(df)
        signals.extend(mom_signals)
        
        # 6. Pattern Recognition (10%)
        pattern_score, pattern_signals = self._detect_patterns(df)
        signals.extend(pattern_signals)
        
        # Calculate weighted total
        total = (
            volume_score * self.weights.VOLUME_PROFILE +
            flow_score * self.weights.ORDER_FLOW +
            vol_score * self.weights.VOLATILITY_SQUEEZE +
            trend_score * self.weights.TREND_ANALYSIS +
            momentum_score * self.weights.MOMENTUM +
            pattern_score * self.weights.PATTERN_RECOGNITION
        ) / (
            self.weights.VOLUME_PROFILE +
            self.weights.ORDER_FLOW +
            self.weights.VOLATILITY_SQUEEZE +
            self.weights.TREND_ANALYSIS +
            self.weights.MOMENTUM +
            self.weights.PATTERN_RECOGNITION
        ) * 100
        
        return TechnicalScore(
            total_score=round(total, 2),
            volume_profile=round(volume_score * 100, 2),
            order_flow=round(flow_score * 100, 2),
            volatility=round(vol_score * 100, 2),
            trend=round(trend_score * 100, 2),
            momentum=round(momentum_score * 100, 2),
            signals=signals,
            warnings=warnings
        )
    
    def _analyze_volume_profile(self, df: pd.DataFrame) -> Tuple[float, List[str]]:
        """
        تحليل Volume Profile
        مراقبة هجرة نقطة السيطرة (POC)
        """
        signals = []
        score = 0.5  # Neutral
        
        if 'Volume' not in df.columns or df['Volume'].sum() == 0:
            return score, ['لا توجد بيانات حجم']
            
        # Calculate Volume Profile
        price_range = df['High'] - df['Low']
        typical_price = (df['High'] + df['Low'] + df['Close']) / 3
        volume_price = typical_price * df['Volume']
        
        # Find POC (Point of Control) - price with most volume
        recent = df.tail(20)
        poc_price = recent.loc[recent['Volume'].idxmax(), 'Close']
        current_price = df['Close'].iloc[-1]
        
        # POC Migration Analysis
        if current_price > poc_price:
            # Price above POC - accumulation
            score = 0.75
            signals.append('📈 السعر فوق POC - تجميع مؤسسي محتمل')
        elif current_price < poc_price:
            # Price below POC - distribution
            score = 0.35
            signals.append('📉 السعر تحت POC - توزيع محتمل')
        else:
            score = 0.5
            signals.append('➡️ السعر عند POC - توازن')
            
        # Volume trend
        vol_sma = df['Volume'].rolling(20).mean()
        if df['Volume'].iloc[-1] > vol_sma.iloc[-1] * 1.5:
            signals.append('🔥 حجم تداول مرتفع')
            score += 0.1
            
        return min(score, 1.0), signals
    
    def _analyze_order_flow(self, df: pd.DataFrame) -> Tuple[float, List[str]]:
        """
        تحليل Order Flow
        قياس عدم التوازن بين الطلب والعرض
        """
        signals = []
        score = 0.5
        
        # Calculate buying/selling pressure
        df['buying_pressure'] = (df['Close'] - df['Low']) / (df['High'] - df['Low'] + 0.0001)
        df['selling_pressure'] = (df['High'] - df['Close']) / (df['High'] - df['Low'] + 0.0001)
        
        avg_buying = df['buying_pressure'].tail(10).mean()
        avg_selling = df['selling_pressure'].tail(10).mean()
        
        imbalance = avg_buying - avg_selling
        
        if imbalance > 0.2:
            score = 0.8
            signals.append(f'💪 ضغط شراء قوي ({imbalance:.2%})')
        elif imbalance < -0.2:
            score = 0.3
            signals.append(f'⚠️ ضغط بيع قوي ({abs(imbalance):.2%})')
        else:
            score = 0.5
            signals.append('⚖️ توازن بين الطلب والعرض')
            
        return score, signals
    
    def _analyze_volatility_squeeze(self, df: pd.DataFrame) -> Tuple[float, List[str]]:
        """
        تحليل Volatility Squeeze
        مراقبة ضيق بولنجر باندز للتنبؤ بالانفجار السعري
        """
        signals = []
        score = 0.5
        
        # Bollinger Bands
        period = 20
        df['sma'] = df['Close'].rolling(period).mean()
        df['std'] = df['Close'].rolling(period).std()
        df['upper'] = df['sma'] + (2 * df['std'])
        df['lower'] = df['sma'] - (2 * df['std'])
        
        # Bandwidth (measure of squeeze)
        df['bandwidth'] = (df['upper'] - df['lower']) / df['sma']
        
        current_bandwidth = df['bandwidth'].iloc[-1]
        avg_bandwidth = df['bandwidth'].tail(100).mean()
        
        if current_bandwidth < avg_bandwidth * 0.5:
            # Extreme squeeze - breakout imminent
            score = 0.85
            signals.append('🔔 انضغاط شديد - انفجار سعري وشيك!')
        elif current_bandwidth < avg_bandwidth * 0.75:
            score = 0.7
            signals.append('📊 انضغاط متوسط - استعداد للحركة')
        else:
            score = 0.5
            signals.append('↔️ نطاق طبيعي')
            
        return score, signals
    
    def _analyze_trend(self, df: pd.DataFrame) -> Tuple[float, List[str]]:
        """
        تحليل الاتجاه
        SMA 20, 50, 200
        """
        signals = []
        score = 0.5
        
        # Moving Averages
        df['sma_20'] = df['Close'].rolling(20).mean()
        df['sma_50'] = df['Close'].rolling(50).mean()
        
        current_price = df['Close'].iloc[-1]
        sma_20 = df['sma_20'].iloc[-1]
        sma_50 = df['sma_50'].iloc[-1]
        
        # Trend determination
        if current_price > sma_20 > sma_50:
            score = 0.85
            signals.append('📈 اتجاه صاعد قوي')
        elif current_price > sma_20:
            score = 0.7
            signals.append('↗️ اتجاه صاعد')
        elif current_price < sma_20 < sma_50:
            score = 0.25
            signals.append('📉 اتجاه هابط')
        elif current_price < sma_20:
            score = 0.35
            signals.append('↘️ اتجاه هابط ضعيف')
        else:
            score = 0.5
            signals.append('➡️ اتجاه عرضي')
            
        return score, signals
    
    def _analyze_momentum(self, df: pd.DataFrame) -> Tuple[float, List[str]]:
        """
        تحليل الزخم
        RSI, MACD, Stochastic
        """
        signals = []
        score = 0.5
        
        # RSI
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / (loss + 0.0001)
        df['rsi'] = 100 - (100 / (1 + rs))
        rsi = df['rsi'].iloc[-1]
        
        # Stochastic
        low_14 = df['Low'].rolling(14).min()
        high_14 = df['High'].rolling(14).max()
        df['stoch_k'] = 100 * (df['Close'] - low_14) / (high_14 - low_14 + 0.0001)
        stoch = df['stoch_k'].iloc[-1]
        
        # Scoring based on oversold/overbought
        if rsi < 30 and stoch < 20:
            score = 0.85
            signals.append(f'🟢 ذروة بيع! RSI={rsi:.1f}, Stoch={stoch:.1f}')
        elif rsi > 70 and stoch > 80:
            score = 0.25
            signals.append(f'🔴 ذروة شراء! RSI={rsi:.1f}, Stoch={stoch:.1f}')
        elif rsi < 40 and stoch < 30:
            score = 0.7
            signals.append(f'🟡 قرب ذروة البيع RSI={rsi:.1f}')
        elif 40 <= rsi <= 60:
            score = 0.5
            signals.append(f'⚪ RSI محايد={rsi:.1f}')
        else:
            score = 0.5
            signals.append(f'📊 RSI={rsi:.1f}, Stoch={stoch:.1f}')
            
        return score, signals
    
    def _detect_patterns(self, df: pd.DataFrame) -> Tuple[float, List[str]]:
        """
        كشف الأنماط الفنية
        """
        signals = []
        score = 0.5
        
        if len(df) < 50:
            return score, ['بيانات غير كافية لكشف الأنماط']
            
        # Simple pattern detection
        recent = df.tail(20)
        
        # Double Bottom
        lows = recent['Low'].nsmallest(2)
        if len(lows) == 2 and abs(lows.iloc[0] - lows.iloc[1]) / lows.mean() < 0.02:
            score = 0.8
            signals.append('🔘 قاع مزدوج محتمل')
            
        # Double Top
        highs = recent['High'].nlargest(2)
        if len(highs) == 2 and abs(highs.iloc[0] - highs.iloc[1]) / highs.mean() < 0.02:
            score = 0.3
            signals.append('⭕ قمة مزدوجة محتملة')
            
        # Breakout
        resistance = df['High'].tail(50).max()
        if df['Close'].iloc[-1] > resistance * 0.98:
            score = 0.75
            signals.append(f'🚀 اختراق مقاومة عند {resistance:.2f}')
            
        return score, signals
