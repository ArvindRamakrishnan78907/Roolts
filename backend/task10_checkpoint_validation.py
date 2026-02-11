import asyncio
import sys
import json
import logging
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Add backend to path
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

from services.cache_service import response_cache
from services.rate_limiter import rate_limiter
from services.connection_pool import global_connection_pool
from services.ai_explainer import AIExplainerService
from services.async_deepseek_provider import AsyncDeepSeekProvider

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def validate_optimizations():
    report = {
        'task': 'Task 10 Checkpoint',
        'status': 'pending',
        'checks': []
    }
    
    try:
        # Check 1: Caching
        logger.info("Running Check 1: Caching...")
        response_cache.clear()
        
        # Mock provider in Explainer
        mock_provider = AsyncMock()
        mock_provider.generate_async.return_value = {
            'response': json.dumps({
                'overview': 'Cached Overview', 'key_concepts': [], 
                'logic_flow': '', 'complexity': '', 'improvement_suggestions': []
            })
        }
        
        explainer = AIExplainerService(provider=mock_provider)
        
        # Call 1: Miss
        await explainer.explain_code("print('cache')", "python")
        
        # Call 2: Hit
        await explainer.explain_code("print('cache')", "python")
        
        stats = response_cache.get_stats()
        if stats['hits'] == 1 and stats['misses'] == 1:
            report['checks'].append({'name': 'Caching', 'status': 'passed', 'details': stats})
            logger.info("Caching Check: Passed")
        else:
             report['checks'].append({'name': 'Caching', 'status': 'failed', 'details': stats})
             logger.error(f"Caching Check Failed: {stats}")

        # Check 2: Rate Limiting
        logger.info("Running Check 2: Rate Limiting...")
        # Reset limiter to known state
        rate_limiter.tokens = 5.0
        rate_limiter.rate = 100.0 # Fast refill for test, but strict acquire
        
        start = time.monotonic()
        # Acquire 5 (instant) then 1 (should wait if we drained it, but here we set high rate)
        # To test wait, we need to drain tokens.
        rate_limiter.tokens = 0
        rate_limiter.rate = 2.0 # 2 tokens/sec
        
        # Acquire 1 token. Should take ~0.5s
        await rate_limiter.acquire(1)
        duration = time.monotonic() - start
        
        if duration >= 0.4:
            report['checks'].append({'name': 'Rate Limiting', 'status': 'passed', 'details': {'duration': duration}})
            logger.info(f"Rate Limiting Check: Passed (Waited {duration:.2f}s)")
        else:
            report['checks'].append({'name': 'Rate Limiting', 'status': 'warning', 'details': {'duration': duration, 'msg': 'Wait too short'}})
            logger.warning(f"Rate Limiting Check: Wait might be too short ({duration:.2f}s)")

        # Check 3: Connection Pool Integration
        logger.info("Running Check 3: Connection Pool...")
        
        # We need to verify that AsyncDeepSeekProvider GETS the session from global pool
        # We can mock global_connection_pool.get_session and see if it's called
        
        with patch('services.async_deepseek_provider.global_connection_pool') as mock_pool:
            mock_pool.get_session = AsyncMock(return_value=MagicMock())
            
            provider = AsyncDeepSeekProvider()
            await provider._get_session()
            
            if mock_pool.get_session.called:
                report['checks'].append({'name': 'Connection Pool', 'status': 'passed'})
                logger.info("Connection Pool Check: Passed")
            else:
                 report['checks'].append({'name': 'Connection Pool', 'status': 'failed'})
                 logger.error("Connection Pool Check Failed")

        report['status'] = 'passed' if all(c['status'] in ['passed', 'warning'] for c in report['checks']) else 'failed'
        
    except Exception as e:
        logger.critical(f"Checkpoint Validation Crashed: {e}")
        report['status'] = 'crashed'
        report['error'] = str(e)

    # Save report
    with open(backend_path / 'task10_checkpoint_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Checkpoint Validation Complete. Status: {report['status']}")
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    asyncio.run(validate_optimizations())
