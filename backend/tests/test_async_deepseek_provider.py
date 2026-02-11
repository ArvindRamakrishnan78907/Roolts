import unittest
import sys
import json
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from services.async_deepseek_provider import AsyncDeepSeekProvider

# Simple Mock for aiohttp request context manager
class MockRequestContextManager:
    def __init__(self, response):
        self.response = response

    async def __aenter__(self):
        return self.response

    async def __aexit__(self, exc_type, exc, tb):
        pass

class TestAsyncDeepSeekProvider(unittest.IsolatedAsyncioTestCase):
    
    async def asyncSetUp(self):
        self.patcher = patch('services.async_deepseek_provider.aiohttp.ClientSession')
        self.mock_session_cls = self.patcher.start()
        self.mock_session = AsyncMock()
        self.mock_session_cls.return_value = self.mock_session
        # aiohttp.ClientSession.post is NOT async, it returns a CM immediately
        self.mock_session.post = MagicMock()
        self.provider = AsyncDeepSeekProvider(api_key="sk-test-key")

    async def asyncTearDown(self):
        self.patcher.stop()

    async def test_generate_async_success(self):
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = {
            'choices': [{'message': {'content': 'Hello world'}}]
        }
        
        # Determine correct behavior
        self.mock_session.post.return_value = MockRequestContextManager(mock_response)

        result = await self.provider.generate_async("Hi")
        self.assertEqual(result['response'], 'Hello world')

    async def test_generate_async_error(self):
        mock_response = AsyncMock()
        mock_response.status = 401
        mock_response.text.return_value = "Unauthorized"
        
        self.mock_session.post.return_value = MockRequestContextManager(mock_response)

        result = await self.provider.generate_async("Hi")
        self.assertIn('error', result)
        self.assertIn('401', result['error'])

    async def test_retry_logic(self):
        bad_response = AsyncMock()
        bad_response.status = 500
        bad_response.text.return_value = "Server Error"
        
        good_response = AsyncMock()
        good_response.status = 200
        good_response.json.return_value = {'choices': [{'message': {'content': 'Success'}}]}

        # Side effect receives callables or exceptions/iterables
        # post() is called, returns CM
        self.mock_session.post.side_effect = [
            MockRequestContextManager(bad_response), 
            MockRequestContextManager(bad_response), 
            MockRequestContextManager(good_response)
        ]

        self.provider.retry_delay = 0.01

        result = await self.provider.generate_async("Test")
        self.assertEqual(result['response'], 'Success')
        self.assertEqual(self.mock_session.post.call_count, 3)

    async def test_stream_chat(self):
        mock_response = AsyncMock()
        mock_response.status = 200
        
        # Mock streaming content
        lines = [
            b'data: {"choices": [{"delta": {"content": "Hello"}}]}\n',
            b'\n',
            b'data: {"choices": [{"delta": {"content": " World"}}]}\n',
            b'data: [DONE]\n'
        ]
        
        # Create an async iterator for readline
        async def mock_readline():
            for line in lines:
                yield line
            # Continue yielding empty bytes to simulate EOF like readline
            while True:
                yield b''
                
        # We need readline to be an async method that returns next line
        # AsyncMock side_effect can be an iterator?
        # AsyncMock return_value?
        # Best way: mock_response.content.readline = AsyncMock(side_effect=lines + [b''])
        
        mock_response.content.readline = AsyncMock(side_effect=lines + [b''])
        
        self.mock_session.post.return_value = MockRequestContextManager(mock_response)

        chunks = []
        async for chunk in self.provider.stream_chat("Test"):
            chunks.append(chunk)

        self.assertEqual(chunks, ["Hello", " World"])

if __name__ == '__main__':
    unittest.main()
