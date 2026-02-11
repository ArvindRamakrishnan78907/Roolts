import asyncio
import sys
import json
import logging
from pathlib import Path
from unittest.mock import AsyncMock

# Add backend to path
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

from services.ai_explainer import AIExplainerService
from services.code_champ import CodeChampService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def validate_checkpoint():
    report = {
        'task': 'Task 6 Checkpoint',
        'status': 'pending',
        'checks': []
    }
    
    try:
        # Check 1: AI Explainer Initialization & Structure
        logger.info("Running Check 1: AI Explainer...")
        explainer_status = 'passed'
        try:
            # Mock provider for validation to avoid API costs/keys
            mock_provider = AsyncMock()
            mock_provider.generate_async.return_value = {
                'response': json.dumps({
                    'overview': 'Validation Overview',
                    'key_concepts': ['Valid'],
                    'logic_flow': 'Flow',
                    'complexity': 'O(1)',
                    'improvement_suggestions': []
                })
            }
            
            service = AIExplainerService(provider=mock_provider)
            result = await service.explain_code("print('test')", "python")
            
            if result.get('overview') != 'Validation Overview':
                raise ValueError("Unexpected result from Explainer")
            
            report['checks'].append({
                'name': 'AI Explainer Service',
                'status': 'passed',
                'details': {'structured_output': True}
            })
            logger.info("AI Explainer Check: Passed")
        except Exception as e:
            explainer_status = 'failed'
            report['checks'].append({
                'name': 'AI Explainer Service',
                'status': 'failed',
                'error': str(e)
            })
            logger.error(f"AI Explainer Check Failed: {e}")

        # Check 2: Code Champ Initialization & Structure
        logger.info("Running Check 2: Code Champ...")
        champ_status = 'passed'
        try:
            mock_provider = AsyncMock()
            mock_provider.generate_async.return_value = {
                'response': json.dumps({
                    'quality_score': 100,
                    'summary': 'Perfect',
                    'bugs': [],
                    'improvements': []
                })
            }
            
            service = CodeChampService(provider=mock_provider)
            result = await service.analyze_code("print('good')", "python")
            
            if result.get('quality_score') != 100:
                raise ValueError("Unexpected result from CodeChamp")
            
            report['checks'].append({
                'name': 'Code Champ Service',
                'status': 'passed',
                'details': {'structured_analysis': True}
            })
            logger.info("Code Champ Check: Passed")
        except Exception as e:
            champ_status = 'failed'
            report['checks'].append({
                'name': 'Code Champ Service',
                'status': 'failed',
                'error': str(e)
            })
            logger.error(f"Code Champ Check Failed: {e}")

        report['status'] = 'passed' if all(c['status'] == 'passed' for c in report['checks']) else 'failed'
        
    except Exception as e:
        logger.critical(f"Checkpoint Validation Crashed: {e}")
        report['status'] = 'crashed'
        report['error'] = str(e)

    # Save report
    with open(backend_path / 'task6_checkpoint_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Checkpoint Validation Complete. Status: {report['status']}")
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    asyncio.run(validate_checkpoint())
