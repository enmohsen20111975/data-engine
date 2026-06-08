"""
Risk Manager Module
وحدة إدارة المخاطر

- حساب حجم المركز
- وقف الخسارة الذكي
- الشخصيات السبع
"""

from typing import Tuple
from dataclasses import dataclass
from enum import Enum

class PersonalityType(Enum):
    """الشخصيات السبع"""
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    BALANCED = "balanced"
    GROWTH = "growth"
    AGGRESSIVE = "aggressive"
    SPECULATIVE = "speculative"
    GAMBLER = "gambler"

@dataclass
class RiskParams:
    """معاملات المخاطرة"""
    position_size_percent: float
    stop_loss_percent: float
    max_risk_per_trade: float
    risk_reward_ratio: float

class RiskManager:
    """مدير المخاطر"""
    
    # Risk parameters by personality
    PERSONALITY_PARAMS = {
        PersonalityType.CONSERVATIVE: RiskParams(5, 3, 1, 3.0),
        PersonalityType.MODERATE: RiskParams(7, 4, 1.5, 2.5),
        PersonalityType.BALANCED: RiskParams(10, 5, 2, 2.0),
        PersonalityType.GROWTH: RiskParams(12, 6, 2.5, 1.8),
        PersonalityType.AGGRESSIVE: RiskParams(15, 7, 3, 1.5),
        PersonalityType.SPECULATIVE: RiskParams(18, 8, 4, 1.3),
        PersonalityType.GAMBLER: RiskParams(20, 10, 5, 1.0)
    }
    
    def calculate_position_size(self, 
                               capital: float,
                               entry_price: float,
                               stop_loss: float,
                               personality: PersonalityType) -> float:
        """حساب حجم المركز"""
        params = self.PERSONALITY_PARAMS[personality]
        
        # Risk amount
        risk_amount = capital * (params.max_risk_per_trade / 100)
        
        # Risk per share
        risk_per_share = abs(entry_price - stop_loss)
        
        if risk_per_share == 0:
            return 0
            
        # Position size
        position_size = risk_amount / risk_per_share
        
        # Limit by max position percent
        max_position = (capital * params.position_size_percent / 100) / entry_price
        
        return min(position_size, max_position)
    
    def calculate_stop_loss(self, 
                           entry_price: float,
                           atr: float,
                           method: str = 'atr') -> float:
        """حساب وقف الخسارة الذكي"""
        if method == 'atr':
            # 4x ATR below entry
            return entry_price - (atr * 4)
        elif method == 'percent':
            # 5% below entry
            return entry_price * 0.95
        else:
            return entry_price * 0.95
    
    def calculate_take_profits(self,
                               entry_price: float,
                               atr: float) -> Tuple[float, float, float]:
        """حساب مستويات جني الأرباح"""
        return (
            entry_price + (atr * 2),   # TP1
            entry_price + (atr * 3.5), # TP2
            entry_price + (atr * 5)    # TP3
        )
