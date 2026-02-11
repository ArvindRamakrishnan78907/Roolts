import unittest
import asyncio
import time
import sys
from unittest.mock import patch, AsyncMock
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from services.rate_limiter import RateLimiter

class TestRateLimiter(unittest.IsolatedAsyncioTestCase):
    
    def setUp(self):
        self.limiter = RateLimiter(signs_per_second=10, capacity=10)

    async def test_acquire_immediate(self):
        start = time.monotonic()
        await self.limiter.acquire(1)
        duration = time.monotonic() - start
        
        # Should be almost instant
        self.assertLess(duration, 0.1)
        self.assertLess(self.limiter.tokens, 10)

    async def test_refill(self):
        self.limiter.tokens = 0
        self.limiter.last_refill = time.monotonic() - 0.5 # 0.5s ago
        
        # Should simulate refill: 0.5 * 10 = 5 tokens
        self.limiter._refill()
        self.assertAlmostEqual(self.limiter.tokens, 5.0, delta=1.0)

    async def test_wait(self):
        self.limiter.tokens = 0
        self.limiter.last_refill = time.monotonic()
        
        # Need 1 token. Rate 10/s. Wait should be ~0.1s
        start = time.monotonic()
        await self.limiter.acquire(1)
        duration = time.monotonic() - start
        
        self.assertGreaterEqual(duration, 0.09)
        self.assertLess(duration, 0.3)

if __name__ == '__main__':
    unittest.main()
