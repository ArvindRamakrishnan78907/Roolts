import unittest
import sys
import json
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from services.code_champ import CodeChampService, AnalysisResult

class TestCodeChampService(unittest.IsolatedAsyncioTestCase):
    
    def setUp(self):
        self.mock_provider = AsyncMock()
        self.service = CodeChampService(provider=self.mock_provider)

    async def test_analyze_code_success(self):
        # Mock valid JSON response
        params = {
            'quality_score': 85,
            'summary': 'Good code',
            'bugs': [
                {'line': 10, 'severity': 'Critical', 'description': 'NPE', 'fix_suggestion': 'Check null'}
            ],
            'improvements': [
                {'category': 'Performance', 'description': 'Use list comp', 'code_snippet': '[x for x in y]'}
            ]
        }
        self.mock_provider.generate_async.return_value = {
            'response': json.dumps(params)
        }

        result = await self.service.analyze_code("code", "python")
        
        self.assertEqual(result['quality_score'], 85)
        self.assertEqual(len(result['bugs']), 1)
        self.assertEqual(result['bugs'][0]['line'], 10)
        self.assertEqual(len(result['improvements']), 1)

    async def test_analyze_code_markdown_wrapped(self):
        json_content = json.dumps({
            'quality_score': 90,
            'summary': 'Wrapped',
            'bugs': [],
            'improvements': []
        })
        self.mock_provider.generate_async.return_value = {
            'response': f"```json\n{json_content}\n```"
        }

        result = await self.service.analyze_code("code")
        self.assertEqual(result['quality_score'], 90)

    async def test_analyze_code_provider_error(self):
        self.mock_provider.generate_async.return_value = {'error': 'Service unavailable'}
        
        result = await self.service.analyze_code("code")
        self.assertIn('error', result)

    async def test_analyze_code_invalid_json(self):
        self.mock_provider.generate_async.return_value = {'response': 'Invalid'}
        
        result = await self.service.analyze_code("code")
        self.assertIn('error', result)
        self.assertIn('Failed to parse analysis format', result['error'])

if __name__ == '__main__':
    unittest.main()
