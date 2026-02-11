import asyncio
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.multi_ai import MultiAIService

class TestMultiAIServiceRefactor(unittest.TestCase):
    
    def setUp(self):
        self.api_keys = {'deepseek': 'sk-test-key', 'gemini': 'gemini-key'}
        self.service = MultiAIService(self.api_keys)
        
    def test_initialization(self):
        """Test that services are initialized correctly."""
        self.assertTrue(self.service.async_deepseek.is_configured())
        self.assertIsNotNone(self.service.explainer)
        self.assertIsNotNone(self.service.code_champ)
        self.assertIn('deepseek', self.service.providers)
        
    @patch('services.async_deepseek_provider.AsyncDeepSeekProvider.generate_async')
    def test_chat_async_deepseek(self, mock_generate):
        """Test async chat with deepseek provider."""
        async def run_test():
            mock_generate.return_value = {'response': 'Async response', 'model': 'deepseek'}
            
            result = await self.service.chat("Hello", model="deepseek")
            
            self.assertEqual(result['response'], 'Async response')
            mock_generate.assert_called_once()
            
        asyncio.run(run_test())

    @patch('services.ai_explainer.AIExplainerService.explain_code')
    def test_explainer_integration(self, mock_explain):
        """Test integration with AIExplainerService."""
        async def run_test():
            mock_explain.return_value = {'overview': 'Test overview'}
            
            result = await self.service.explainer.explain_code("print('hello')", "python")
            
            self.assertEqual(result['overview'], 'Test overview')
            mock_explain.assert_called_once()
            
        asyncio.run(run_test())

    @patch('services.code_champ.CodeChampService.analyze_code')
    def test_code_champ_integration(self, mock_analyze):
        """Test integration with CodeChampService."""
        async def run_test():
            mock_analyze.return_value = {'quality_score': 95}
            
            result = await self.service.code_champ.analyze_code("print('hello')", "python")
            
            self.assertEqual(result['quality_score'], 95)
            mock_analyze.assert_called_once()
            
        asyncio.run(run_test())

if __name__ == '__main__':
    unittest.main()
