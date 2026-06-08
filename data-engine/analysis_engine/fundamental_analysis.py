"""
Fundamental Analysis Module
وحدة التحليل الأساسي النسبي

مقارنة مع متوسط القطاع وليس أرقام مطلقة
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class FundamentalScore:
    """نتيجة التحليل الأساسي"""
    total_score: float
    pe_score: float
    pb_score: float
    roa_score: float
    roe_score: float
    dividend_score: float
    signals: List[str]
    warnings: List[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []

class FundamentalAnalyzer:
    """
    المحلل الأساسي النسبي
    مقارنة مع متوسط القطاع
    """
    
    # Sector averages (can be updated from database)
    SECTOR_AVERAGES = {
        'البنوك': {'pe': 12, 'pb': 1.5, 'roa': 2.0, 'roe': 15},
        'البتروكيماويات': {'pe': 15, 'pb': 2.0, 'roa': 8.0, 'roe': 18},
        'الاتصالات': {'pe': 18, 'pb': 2.5, 'roa': 5.0, 'roe': 12},
        'التجزئة': {'pe': 20, 'pb': 3.0, 'roa': 4.0, 'roe': 10},
        'default': {'pe': 15, 'pb': 2.0, 'roa': 3.0, 'roe': 10}
    }
    
    def analyze(self, fundamentals: Dict, sector: str = 'default') -> FundamentalScore:
        """التحليل الأساسي الشامل"""
        signals = []
        
        # Get sector averages
        sector_avg = self.SECTOR_AVERAGES.get(sector, self.SECTOR_AVERAGES['default'])
        
        # Extract data
        valuation = fundamentals.get('tab_valuation', {})
        profitability = fundamentals.get('tab_profitability', {})
        dividends = fundamentals.get('tab_dividends', {})
        
        # 1. P/E Analysis
        pe_score, pe_signals = self._analyze_pe(valuation, sector_avg['pe'])
        signals.extend(pe_signals)
        
        # 2. P/B Analysis
        pb_score, pb_signals = self._analyze_pb(valuation, sector_avg['pb'])
        signals.extend(pb_signals)
        
        # 3. ROA Analysis
        roa_score, roa_signals = self._analyze_roa(profitability, sector_avg['roa'])
        signals.extend(roa_signals)
        
        # 4. ROE Analysis
        roe_score, roe_signals = self._analyze_roe(profitability, sector_avg['roe'])
        signals.extend(roe_signals)
        
        # 5. Dividend Analysis
        div_score, div_signals = self._analyze_dividend(dividends)
        signals.extend(div_signals)
        
        # Calculate total
        total = (pe_score + pb_score + roa_score + roe_score + div_score) / 5
        
        return FundamentalScore(
            total_score=round(total * 100, 2),
            pe_score=round(pe_score * 100, 2),
            pb_score=round(pb_score * 100, 2),
            roa_score=round(roa_score * 100, 2),
            roe_score=round(roe_score * 100, 2),
            dividend_score=round(div_score * 100, 2),
            signals=signals
        )
    
    def _parse_value(self, val) -> float:
        """تحويل القيمة لرقم"""
        if val is None:
            return 0
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            try:
                return float(val.replace('%', '').replace(',', '').strip())
            except:
                return 0
        return 0
    
    def _analyze_pe(self, valuation: Dict, sector_pe: float) -> Tuple[float, List[str]]:
        """تحليل مكرر الربحية"""
        signals = []
        pe = self._parse_value(valuation.get('pe_ratio', 0))
        
        if pe == 0:
            return 0.5, ['لا توجد بيانات P/E']
            
        # Compare to sector average
        if pe < sector_pe * 0.7:
            score = 0.85
            signals.append(f'✅ P/E={pe:.1f} أقل من متوسط القطاع ({sector_pe}) - مُقيم بأقل')
        elif pe > sector_pe * 1.3:
            score = 0.35
            signals.append(f'⚠️ P/E={pe:.1f} أعلى من متوسط القطاع ({sector_pe}) - مُقيم بأعلى')
        else:
            score = 0.6
            signals.append(f'📊 P/E={pe:.1f} قريب من متوسط القطاع')
            
        return score, signals
    
    def _analyze_pb(self, valuation: Dict, sector_pb: float) -> Tuple[float, List[str]]:
        """تحليل مكرر الدفترية"""
        signals = []
        pb = self._parse_value(valuation.get('pb_ratio', 0))
        
        if pb == 0:
            return 0.5, ['لا توجد بيانات P/B']
            
        if pb < sector_pb * 0.8:
            score = 0.75
            signals.append(f'✅ P/B={pb:.1f} جذاب')
        elif pb > sector_pb * 1.5:
            score = 0.4
            signals.append(f'⚠️ P/B={pb:.1f} مرتفع')
        else:
            score = 0.55
            signals.append(f'📊 P/B={pb:.1f}')
            
        return score, signals
    
    def _analyze_roa(self, profitability: Dict, sector_roa: float) -> Tuple[float, List[str]]:
        """تحليل العائد على الأصول"""
        signals = []
        roa = self._parse_value(profitability.get('roa', 0))
        
        if roa == 0:
            return 0.5, ['لا توجد بيانات ROA']
            
        if roa > sector_roa * 1.5:
            score = 0.9
            signals.append(f'🌟 ROA={roa:.1f}% ممتاز!')
        elif roa > sector_roa:
            score = 0.7
            signals.append(f'✅ ROA={roa:.1f}% جيد')
        else:
            score = 0.4
            signals.append(f'⚠️ ROA={roa:.1f}% أقل من المتوقع')
            
        return score, signals
    
    def _analyze_roe(self, profitability: Dict, sector_roe: float) -> Tuple[float, List[str]]:
        """تحليل العائد على حقوق الملكية"""
        signals = []
        roe = self._parse_value(profitability.get('roe', 0))
        
        if roe == 0:
            return 0.5, ['لا توجد بيانات ROE']
            
        if roe > sector_roe * 1.5:
            score = 0.9
            signals.append(f'🌟 ROE={roe:.1f}% ممتاز!')
        elif roe > sector_roe:
            score = 0.7
            signals.append(f'✅ ROE={roe:.1f}% جيد')
        else:
            score = 0.4
            signals.append(f'⚠️ ROE={roe:.1f}%')
            
        return score, signals
    
    def _analyze_dividend(self, dividends: Dict) -> Tuple[float, List[str]]:
        """تحليل التوزيعات"""
        signals = []
        div_yield = self._parse_value(dividends.get('div_yield', 0))
        
        if div_yield == 0:
            return 0.3, ['❌ لا توجد توزيعات']
            
        if div_yield >= 5:
            score = 0.85
            signals.append(f'💰 عائد توزيعات {div_yield:.1f}% ممتاز!')
        elif div_yield >= 3:
            score = 0.65
            signals.append(f'💵 عائد توزيعات {div_yield:.1f}% جيد')
        else:
            score = 0.4
            signals.append(f'📊 عائد توزيعات {div_yield:.1f}%')
            
        return score, signals
