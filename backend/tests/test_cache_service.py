import unittest
import time
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from services.cache_service import ResponseCache

class TestResponseCache(unittest.TestCase):
    
    def setUp(self):
        self.cache = ResponseCache(default_ttl=1) # 1 sec TTL for testing

    def test_set_get_hit(self):
        key = self.cache._generate_key("arg1", kw="arg2")
        self.cache.set(key, "value")
        
        result = self.cache.get(key)
        self.assertEqual(result, "value")
        self.assertEqual(self.cache.hits, 1)

    def test_get_miss(self):
        key = self.cache._generate_key("missing")
        result = self.cache.get(key)
        self.assertIsNone(result)
        self.assertEqual(self.cache.misses, 1)

    def test_expiration(self):
        key = self.cache._generate_key("expire")
        self.cache.set(key, "data", ttl=0.1)
        
        time.sleep(0.2)
        result = self.cache.get(key)
        self.assertIsNone(result)

    def test_stats(self):
        k1 = self.cache._generate_key("a")
        self.cache.set(k1, 1)
        self.cache.get(k1) # Hit
        
        k2 = self.cache._generate_key("b")
        self.cache.get(k2) # Miss
        
        stats = self.cache.get_stats()
        self.assertEqual(stats['hits'], 1)
        self.assertEqual(stats['misses'], 1)
        self.assertEqual(stats['size'], 1)

if __name__ == '__main__':
    unittest.main()
