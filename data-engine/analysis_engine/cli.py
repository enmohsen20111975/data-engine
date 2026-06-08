#!/usr/bin/env python3
"""
Analysis Engine CLI
واجهة سطر الأوامر لمحرك التحليل

Usage:
    python cli.py --action analyze --symbol 1150 --personality balanced
    python cli.py --action market --market السعودية --personality conservative
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from analysis_engine import MasterAnalyzer
from analysis_engine.config import PersonalityType
from analysis_engine.master_analyzer import to_json

def main():
    parser = argparse.ArgumentParser(description='Unified Analysis Engine CLI')
    
    parser.add_argument('--action', choices=['analyze', 'market'], 
                        required=True, help='Action to perform')
    parser.add_argument('--symbol', type=str, help='Stock symbol to analyze')
    parser.add_argument('--market', type=str, help='Market to analyze')
    parser.add_argument('--personality', type=str, default='balanced',
                        choices=['conservative', 'moderate', 'balanced', 
                                'growth', 'aggressive', 'speculative', 'gambler'],
                        help='Investor personality type')
    parser.add_argument('--limit', type=int, default=10, help='Max results for market analysis')
    
    args = parser.parse_args()
    
    # Map personality string to enum
    personality_map = {
        'conservative': PersonalityType.CONSERVATIVE,
        'moderate': PersonalityType.MODERATE,
        'balanced': PersonalityType.BALANCED,
        'growth': PersonalityType.GROWTH,
        'aggressive': PersonalityType.AGGRESSIVE,
        'speculative': PersonalityType.SPECULATIVE,
        'gambler': PersonalityType.GAMBLER
    }
    
    personality = personality_map.get(args.personality, PersonalityType.BALANCED)
    
    try:
        analyzer = MasterAnalyzer()
        
        if args.action == 'analyze':
            if not args.symbol:
                result = {'error': 'Symbol is required for analyze action'}
            else:
                rec = analyzer.analyze_stock(args.symbol, personality)
                if rec:
                    result = to_json(rec)
                else:
                    result = {'error': f'No data found for symbol {args.symbol}'}
                    
        elif args.action == 'market':
            recs = analyzer.analyze_market(args.market, personality, args.limit)
            result = {
                'market': args.market or 'All',
                'personality': args.personality,
                'total_recommendations': len(recs),
                'recommendations': [to_json(r) for r in recs]
            }
        
        # Output JSON
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == '__main__':
    main()
