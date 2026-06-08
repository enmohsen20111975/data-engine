"""
Configuration & Weights for Analysis Engine
الإعدادات والأوزان لمحرك التحليل
"""

from dataclasses import dataclass
from typing import Dict, List
from enum import Enum

class MarketRegime(Enum):
    """اتجاه السوق العام"""
    BULL = "bull"        # صاعد
    BEAR = "bear"        # هابط
    SIDEWAYS = "sideways"  # عرضي

class PersonalityType(Enum):
    """الشخصيات السبع للمستثمرين"""
    CONSERVATIVE = "conservative"      # محافظ جداً
    MODERATE = "moderate"              # معتدل
    BALANCED = "balanced"              # متوازن
    GROWTH = "growth"                  # نمو
    AGGRESSIVE = "aggressive"          # عدواني
    SPECULATIVE = "speculative"        # مضارب
    GAMBLER = "gambler"                # مقامر

@dataclass
class Weights:
    """أوزان التحليل"""
    # أسهم
    STOCK_TECHNICAL: float = 0.30      # 30% للتحليل الفني
    STOCK_FUNDAMENTAL: float = 0.25    # 25% للتحليل الأساسي
    STOCK_QUANTITATIVE: float = 0.15   # 15% للتحليل الكمي
    STOCK_SENTIMENT: float = 0.30      # 30% للتحليل المعنوي
    
    # كريبتو
    CRYPTO_TECHNICAL: float = 0.25     # 25%
    CRYPTO_FUNDAMENTAL: float = 0.20   # 20%
    CRYPTO_QUANTITATIVE: float = 0.15  # 15%
    CRYPTO_SENTIMENT: float = 0.40     # 40%
    
    # التحليل الفني الداخلي
    VOLUME_PROFILE: float = 0.25       # Volume Profile
    ORDER_FLOW: float = 0.20           # Order Flow
    VOLATILITY_SQUEEZE: float = 0.15   # Volatility Squeeze
    TREND_ANALYSIS: float = 0.15       # Trend Analysis
    MOMENTUM: float = 0.15             # Momentum
    PATTERN_RECOGNITION: float = 0.10  # Pattern Recognition

@dataclass
class Thresholds:
    """عتبات القرار حسب الشخصية"""
    CONSERVATIVE_BUY: int = 60         # محافظ: >= 60 للشراء
    MODERATE_BUY: int = 55
    BALANCED_BUY: int = 50
    GROWTH_BUY: int = 45
    AGGRESSIVE_BUY: int = 40
    SPECULATIVE_BUY: int = 35
    GAMBLER_BUY: int = 30              # مقامر: >= 30

@dataclass
class LiquidityFilter:
    """فلتر السيولة"""
    MIN_VOLUME_SHARES: int = 500_000   # 500 ألف سهم
    MIN_VALUE_EGP: float = 2_000_000   # 2 مليون جنيه
    MIN_VOLUME_CRYPTO: float = 100_000 # للكريبتو

@dataclass
class RiskParams:
    """معاملات إدارة المخاطر"""
    MAX_POSITION_SIZE: float = 0.10     # 10% من رأس المال
    STOP_LOSS_ATR_MULTIPLIER: float = 4.0  # 4x ATR
    TIME_STOP_DAYS: int = 15           # 15 يوم للمراجعة
    TAKE_PROFIT_LEVELS: int = 3        # 3 مستويات للجني

class Config:
    """الإعدادات الرئيسية"""
    
    # الأوزان
    WEIGHTS = Weights()
    
    # العتبات
    THRESHOLDS = Thresholds()
    
    # فلتر السيولة
    LIQUIDITY = LiquidityFilter()
    
    # إدارة المخاطر
    RISK = RiskParams()
    
    # SMA للاتجاه العام
    MARKET_REGIME_SMA = 200
    
    # مستويات فيبوناتشي الذهبية
    FIBONACCI_LEVELS = {
        'golden': 0.618,      # المستوى الذهبي
        'cluster_zone': [0.5, 0.618, 0.786],  # منطقة الكلستر
        'extension': [1.272, 1.414, 1.618]    # امتدادات
    }
    
    # أنماط الشموع الانعكاسية
    REVERSAL_CANDLES = [
        'hammer', 'inverse_hammer', 'bullish_engulfing',
        'piercing_line', 'morning_star', 'three_white_soldiers'
    ]
    
    # ذروة البيع للـ Stochastics
    STOCH_OVERSOLD = 20
    STOCH_OVERBOUGHT = 80
    
    # معدل نجاح الأنماط
    PATTERN_SUCCESS_RATES = {
        'head_and_shoulders': 0.83,
        'inverse_head_and_shoulders': 0.85,
        'ascending_triangle': 0.73,
        'descending_triangle': 0.75,
        'double_bottom': 0.78,
        'double_top': 0.76,
        'flag': 0.70,
        'wedge': 0.68
    }
    
    @classmethod
    def get_buy_threshold(cls, personality: PersonalityType) -> int:
        """الحصول على عتبة الشراء حسب الشخصية"""
        thresholds = {
            PersonalityType.CONSERVATIVE: cls.THRESHOLDS.CONSERVATIVE_BUY,
            PersonalityType.MODERATE: cls.THRESHOLDS.MODERATE_BUY,
            PersonalityType.BALANCED: cls.THRESHOLDS.BALANCED_BUY,
            PersonalityType.GROWTH: cls.THRESHOLDS.GROWTH_BUY,
            PersonalityType.AGGRESSIVE: cls.THRESHOLDS.AGGRESSIVE_BUY,
            PersonalityType.SPECULATIVE: cls.THRESHOLDS.SPECULATIVE_BUY,
            PersonalityType.GAMBLER: cls.THRESHOLDS.GAMBLER_BUY,
        }
        return thresholds.get(personality, 75)
    
    @classmethod
    def get_weights_for_asset(cls, asset_type: str) -> Dict[str, float]:
        """الحصول على الأوزان حسب نوع الأصل"""
        if asset_type == 'stock':
            return {
                'technical': cls.WEIGHTS.STOCK_TECHNICAL,
                'fundamental': cls.WEIGHTS.STOCK_FUNDAMENTAL,
                'quantitative': cls.WEIGHTS.STOCK_QUANTITATIVE,
                'sentiment': cls.WEIGHTS.STOCK_SENTIMENT
            }
        else:  # crypto
            return {
                'technical': cls.WEIGHTS.CRYPTO_TECHNICAL,
                'fundamental': cls.WEIGHTS.CRYPTO_FUNDAMENTAL,
                'quantitative': cls.WEIGHTS.CRYPTO_QUANTITATIVE,
                'sentiment': cls.WEIGHTS.CRYPTO_SENTIMENT
            }
