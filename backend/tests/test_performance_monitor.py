import unittest
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from services.performance_monitor import PerformanceMonitor

class TestPerformanceMonitor(unittest.TestCase):
    
    def setUp(self):
        PerformanceMonitor._instance = None
        self.monitor = PerformanceMonitor.get_instance()

    def test_record_and_get_stats(self):
        self.monitor.record_request('provider1', 0.1, True, 10)
        self.monitor.record_request('provider1', 0.2, True, 20)
        
        stats = self.monitor.get_stats('provider1')
        self.assertEqual(stats['requests'], 2)
        self.assertEqual(stats['total_tokens'], 30)
        self.assertEqual(stats['avg_latency'], 0.15)

    def test_error_tracking(self):
        self.monitor.record_request('provider2', 0.1, False)
        stats = self.monitor.get_stats('provider2')
        self.assertEqual(stats['errors'], 1)
        self.assertEqual(stats['requests'], 1)

    def test_latency_history_limit(self):
        # Fill with more than history limit
        for _ in range(110):
            self.monitor.record_request('provider3', 0.1, True)
            
        stats = self.monitor.metrics['provider3']
        self.assertEqual(len(stats['latencies']), 100) # Should be capped at 100

if __name__ == '__main__':
    unittest.main()
