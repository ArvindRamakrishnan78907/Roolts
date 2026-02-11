import unittest
import sys
import json
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from services.ai_explainer import AIExplainerService, ExplanationResult

class TestAIExplainerService(unittest.IsolatedAsyncioTestCase):
    
    def setUp(self):
        self.mock_provider = AsyncMock()
        self.service = AIExplainerService(provider=self.mock_provider)

    async def test_explain_code_success(self):
        # Mock valid JSON response
        params = {
            'overview': 'Test overview',
            'key_concepts': ['A', 'B'],
            'logic_flow': 'Step 1...',
            'complexity': 'O(n)',
            'improvement_suggestions': ['Fix loop'],
            'diagram_description': 'Flowchart def'
        }
        self.mock_provider.generate_async.return_value = {
            'response': json.dumps(params)
        }

        result = await self.service.explain_code("print('hello')", "python")
        
        self.assertEqual(result['overview'], 'Test overview')
        self.assertIsInstance(result['processing_time_ms'], float)
        self.assertEqual(result['language'], 'python')

    async def test_explain_code_markdown_wrapped(self):
        # Mock response wrapped in markdown code block
        json_content = json.dumps({
            'overview': 'Markdown test',
            'key_concepts': [],
            'logic_flow': '',
            'complexity': '',
            'improvement_suggestions': []
        })
        self.mock_provider.generate_async.return_value = {
            'response': f"Here is the JSON:\n```json\n{json_content}\n```"
        }

        result = await self.service.explain_code("code", "java")
        self.assertEqual(result['overview'], 'Markdown test')

    async def test_explain_code_provider_error(self):
        self.mock_provider.generate_async.return_value = {'error': 'API quota exceeded'}
        
        result = await self.service.explain_code("code")
        self.assertIn('error', result)
        self.assertEqual(result['error'], 'API quota exceeded')

    async def test_explain_code_invalid_json(self):
        self.mock_provider.generate_async.return_value = {'response': 'Not JSON'}
        
        result = await self.service.explain_code("code")
        self.assertIn('error', result)
        self.assertIn('Failed to parse explanation format', result['error'])

if __name__ == '__main__':
    unittest.main()
