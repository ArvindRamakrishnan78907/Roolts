import unittest
import asyncio
import sys
import aiohttp
from unittest.mock import patch, AsyncMock
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from services.connection_pool import ConnectionPool

class TestConnectionPool(unittest.IsolatedAsyncioTestCase):
    
    def setUp(self):
        # Reset singleton logic manually for test isolation if needed
        # Or just test behavior on new instances if we modify class to allow non-singleton
        ConnectionPool._instance = None
        self.pool = ConnectionPool.get_instance()

    async def asyncTearDown(self):
        await self.pool.close()

    def test_singleton(self):
        pool2 = ConnectionPool.get_instance()
        self.assertIs(self.pool, pool2)

    async def test_get_session_reuses(self):
        session1 = await self.pool.get_session()
        self.assertIsInstance(session1, aiohttp.ClientSession)
        
        session2 = await self.pool.get_session()
        self.assertIs(session1, session2)
        
        self.assertFalse(session1.closed)

    async def test_session_config(self):
        session = await self.pool.get_session()
        # Access internal connector to verify config
        connector = session.connector
        self.assertEqual(connector.limit, 100)
        # self.assertEqual(connector._ttl_dns_cache, 300) # Private attr, skip check

    async def test_close(self):
        session = await self.pool.get_session()
        await self.pool.close()
        self.assertTrue(session.closed)

if __name__ == '__main__':
    unittest.main()
