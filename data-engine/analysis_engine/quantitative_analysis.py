"""
Quantitative Analysis Module
وحدة التحليل الكمي
ARIMA-GARCH for short-term prediction
"""

import numpy as np
from typing import Tuple, List
from dataclasses import dataclass

@dataclass
class QuantScore:
    """نتيجة التحليل الكمي"""
    total_score: float
    prediction_direction: str
    confidence: float
    signals: List[str]

class QuantitativeAnalyzer:
    """المحلل الكمي"""
    
    def analyze(self, prices: list) -> QuantScore:
        """تحليل كمي بسيط بدون ARIMA"""
        signals = []
        
        if len(prices) < 30:
            return QuantScore(50, 'NEUTRAL', 0.5, ['بيانات غير كافية'])
            
        # Simple trend calculation
        prices = np.array(prices)
        ma_5 = np.mean(prices[-5:])
        ma_20 = np.mean(prices[-20:])
        
        if ma_5 > ma_20:
            score = 70
            direction = 'UP'
            signals.append('📈 اتجاه صعودي قصير المدى')
        elif ma_5 < ma_20:
            score = 35
            direction = 'DOWN'
            signals.append('📉 اتجاه هبوطي قصير المدى')
        else:
            score = 50
            direction = 'NEUTRAL'
            signals.append('➡️ اتجاه محايد')
            
        return QuantScore(
            total_score=score,
            prediction_direction=direction,
            confidence=0.6,
            signals=signals
        )
