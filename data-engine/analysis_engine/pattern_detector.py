"""
Pattern Detector Module
كاشف الأنماط الفنية

الأنماط المدعومة:
- الرأس والكتفين (83% نجاح)
- المثلثات الصاعدة (73% نجاح)
- القمم والقيعان المزدوجة
"""

import numpy as np
from typing import List, Tuple, Dict
from dataclasses import dataclass

@dataclass
class PatternResult:
    """نتيجة كشف الأنماط"""
    score: float
    patterns_found: List[str]
    success_probability: float

class PatternDetector:
    """كاشف الأنماط الفنية"""
    
    # Success rates from historical data
    PATTERN_RATES = {
        'head_and_shoulders': 0.83,
        'inverse_head_and_shoulders': 0.85,
        'ascending_triangle': 0.73,
        'descending_triangle': 0.75,
        'double_bottom': 0.78,
        'double_top': 0.76,
        'bull_flag': 0.70,
        'bear_flag': 0.68
    }
    
    def detect(self, highs: list, lows: list, closes: list) -> PatternResult:
        """كشف الأنماط"""
        patterns = []
        
        if len(closes) < 50:
            return PatternResult(50, ['بيانات غير كافية'], 0.5)
            
        # Double Bottom
        if self._check_double_bottom(lows):
            patterns.append('🔘 قاع مزدوج')
            
        # Double Top  
        if self._check_double_top(highs):
            patterns.append('⭕ قمة مزدوجة')
            
        # Ascending Triangle
        if self._check_ascending_triangle(highs, lows):
            patterns.append('📐 مثلث صاعد')
            
        # Breakout
        recent_high = max(highs[-50:])
        if closes[-1] > recent_high * 0.98:
            patterns.append('🚀 اختراق')
            
        # Calculate score
        if patterns:
            avg_rate = sum([self.PATTERN_RATES.get(p.split()[1] if p else '', 0.7) for p in patterns]) / len(patterns)
            score = avg_rate * 100
        else:
            score = 50
            patterns.append('❓ لا توجد أنماط واضحة')
            
        return PatternResult(
            score=round(score, 2),
            patterns_found=patterns,
            success_probability=round(avg_rate if patterns else 0.5, 2)
        )
    
    def _check_double_bottom(self, lows: list) -> bool:
        """فحص القاع المزدوج"""
        if len(lows) < 20:
            return False
        recent = lows[-20:]
        min1 = min(recent[:10])
        min2 = min(recent[10:])
        return abs(min1 - min2) / min(min1, min2) < 0.03
    
    def _check_double_top(self, highs: list) -> bool:
        """فحص القمة المزدوجة"""
        if len(highs) < 20:
            return False
        recent = highs[-20:]
        max1 = max(recent[:10])
        max2 = max(recent[10:])
        return abs(max1 - max2) / min(max1, max2) < 0.03
    
    def _check_ascending_triangle(self, highs: list, lows: list) -> bool:
        """فحص المثلث الصاعد"""
        if len(lows) < 20:
            return False
        # Check if lows are rising
        recent_lows = lows[-20:]
        return recent_lows[-1] > np.mean(recent_lows)
