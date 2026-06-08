"""
Master Analyzer - The Unified Brain
المحرك الرئيسي للتحليل الموحد

يقوم بحساب Master Score من 0 إلى 100
"""

import json
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

from .config import Config, PersonalityType, MarketRegime
from .data_pipeline import DataPipeline, StockData
from .technical_analysis import TechnicalAnalyzer, TechnicalScore
from .fundamental_analysis import FundamentalAnalyzer, FundamentalScore

@dataclass
class Recommendation:
    """التوصية النهائية"""
    symbol: str
    name: str
    market: str
    action: str              # BUY, SELL, HOLD
    master_score: float      # 0-100
    confidence: str          # HIGH, MEDIUM, LOW
    
    # Price targets
    entry_price: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    take_profit_3: float
    
    # Position sizing
    position_size_percent: float
    
    # Scores breakdown
    technical_score: float
    fundamental_score: float
    
    # Signals & reasons
    signals: List[str]
    warnings: List[str]
    reason: str
    
    # Metadata
    market_regime: str
    personality_match: bool
    timestamp: str

class MasterAnalyzer:
    """
    المحرك الرئيسي للتحليل
    بايثون هو العقل - كل المنطق هنا
    """
    
    def __init__(self, db_path: str = None):
        self.pipeline = DataPipeline(db_path)
        self.technical = TechnicalAnalyzer()
        self.fundamental = FundamentalAnalyzer()
        
    def analyze_stock(self, symbol: str, 
                      personality: PersonalityType = PersonalityType.BALANCED) -> Optional[Recommendation]:
        """
        تحليل سهم واحد وإنتاج توصية
        """
        print(f"\n{'='*50}")
        print(f"🔍 Analyzing: {symbol}")
        
        # 1. Get data
        self.pipeline.connect()
        stock_data = self.pipeline.get_stock_data(symbol)
        self.pipeline.disconnect()
        
        if not stock_data or stock_data.ohlcv.empty:
            print(f"❌ No data for {symbol}")
            return None
            
        # 2. Check market regime
        market_regime = self.pipeline.calculate_market_regime(stock_data.ohlcv)
        print(f"📊 Market Regime: {market_regime.value}")
        
        # 3. Run technical analysis
        tech_result = self.technical.analyze(stock_data.ohlcv, stock_data.technical_indicators)
        print(f"📈 Technical Score: {tech_result.total_score}")
        
        # 4. Run fundamental analysis
        fund_result = self.fundamental.analyze(stock_data.fundamentals)
        print(f"📊 Fundamental Score: {fund_result.total_score}")
        
        # 5. Calculate Master Score (weighted)
        weights = Config.get_weights_for_asset('stock')
        master_score = (
            tech_result.total_score * weights['technical'] +
            fund_result.total_score * weights['fundamental'] +
            50 * weights['quantitative'] +  # Placeholder
            50 * weights['sentiment']        # Placeholder
        )
        
        # 6. Determine action based on personality
        buy_threshold = Config.get_buy_threshold(personality)
        action = self._determine_action(master_score, buy_threshold, market_regime)
        
        # 7. Calculate price levels
        current_price = stock_data.price
        atr = self._calculate_atr(stock_data.ohlcv)
        
        stop_loss = current_price - (atr * Config.RISK.STOP_LOSS_ATR_MULTIPLIER)
        take_profit_1 = current_price + (atr * 2)
        take_profit_2 = current_price + (atr * 3.5)
        take_profit_3 = current_price + (atr * 5)
        
        # 8. Position sizing based on confidence
        confidence = self._get_confidence(master_score)
        position_size = self._calculate_position_size(master_score, confidence)
        
        # 9. Build recommendation
        signals = tech_result.signals + fund_result.signals
        warnings = tech_result.warnings + fund_result.warnings
        
        reason = self._generate_reason(action, master_score, signals)
        
        return Recommendation(
            symbol=stock_data.symbol,
            name=stock_data.name,
            market=stock_data.market,
            action=action,
            master_score=round(master_score, 2),
            confidence=confidence,
            entry_price=current_price,
            stop_loss=round(stop_loss, 2),
            take_profit_1=round(take_profit_1, 2),
            take_profit_2=round(take_profit_2, 2),
            take_profit_3=round(take_profit_3, 2),
            position_size_percent=position_size,
            technical_score=tech_result.total_score,
            fundamental_score=fund_result.total_score,
            signals=signals,
            warnings=warnings,
            reason=reason,
            market_regime=market_regime.value,
            personality_match=master_score >= buy_threshold,
            timestamp=datetime.now().isoformat()
        )
    
    def analyze_market(self, market: str = None, 
                       personality: PersonalityType = PersonalityType.BALANCED,
                       limit: int = 20) -> List[Recommendation]:
        """
        تحليل سوق كامل
        """
        print(f"\n{'='*60}")
        print(f"🚀 Master Analyzer - Market Analysis")
        print(f"📊 Market: {market or 'All'} | Personality: {personality.value}")
        print(f"{'='*60}")
        
        # Get stocks data
        stocks = self.pipeline.prepare_analysis_data(market)
        
        results = []
        for i, stock in enumerate(stocks[:limit]):
            try:
                rec = self.analyze_stock(stock.symbol, personality)
                if rec and rec.action == 'BUY':
                    results.append(rec)
            except Exception as e:
                print(f"Error: {e}")
                
        # Sort by score
        results.sort(key=lambda x: x.master_score, reverse=True)
        
        print(f"\n{'='*60}")
        print(f"✅ Found {len(results)} BUY recommendations")
        print(f"{'='*60}")
        
        return results
    
    def _determine_action(self, score: float, threshold: int, 
                         regime: MarketRegime) -> str:
        """تحديد الإجراء"""
        # Freeze buy signals in bear market
        if regime == MarketRegime.BEAR and score < 90:
            return 'HOLD'
            
        if score >= threshold:
            return 'BUY'
        elif score <= 30:
            return 'SELL'
        else:
            return 'HOLD'
    
    def _calculate_atr(self, df, period=14) -> float:
        """حساب ATR"""
        if df.empty or len(df) < period:
            return 1.0
            
        high = df['High']
        low = df['Low']
        close = df['Close'].shift(1)
        
        tr1 = high - low
        tr2 = abs(high - close)
        tr3 = abs(low - close)
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(period).mean().iloc[-1]
        
        return atr if not pd.isna(atr) else 1.0
    
    def _get_confidence(self, score: float) -> str:
        """تحديد مستوى الثقة"""
        if score >= 80:
            return 'HIGH'
        elif score >= 65:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _calculate_position_size(self, score: float, confidence: str) -> float:
        """حساب حجم المركز"""
        if confidence == 'HIGH':
            return Config.RISK.MAX_POSITION_SIZE  # 10%
        elif confidence == 'MEDIUM':
            return Config.RISK.MAX_POSITION_SIZE * 0.5  # 5%
        else:
            return Config.RISK.MAX_POSITION_SIZE * 0.25  # 2.5%
    
    def _generate_reason(self, action: str, score: float, signals: List[str]) -> str:
        """توليد سبب التوصية"""
        if action == 'BUY':
            top_signals = signals[:3]
            return f"درجة التحليل {score:.0f}% - " + ' | '.join(top_signals)
        elif action == 'SELL':
            return f"درجة التحليل {score:.0f}% - يُنصح بالبيع"
        else:
            return f"درجة التحليل {score:.0f}% - انتظار فرصة أفضل"


# Import pandas for ATR calculation
import pandas as pd

def to_json(recommendation: Recommendation) -> Dict:
    """تحويل التوصية لـ JSON"""
    return asdict(recommendation)


if __name__ == '__main__':
    # Test
    analyzer = MasterAnalyzer()
    
    # Analyze single stock
    rec = analyzer.analyze_stock('1150')  # Saudi Aramco
    
    if rec:
        print(f"\n{'='*50}")
        print(f"📋 RECOMMENDATION: {rec.action}")
        print(f"📊 Score: {rec.master_score}/100")
        print(f"💰 Entry: {rec.entry_price}")
        print(f"🛑 Stop Loss: {rec.stop_loss}")
        print(f"🎯 Targets: {rec.take_profit_1} → {rec.take_profit_2} → {rec.take_profit_3}")
        print(f"\n📝 Reason: {rec.reason}")
        print(f"\n🔔 Signals: {rec.signals[:5]}")
