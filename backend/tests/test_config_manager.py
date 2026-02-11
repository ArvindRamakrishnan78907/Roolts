import unittest
import os
from unittest.mock import patch
import sys
from pathlib import Path

# Add backend to path to import config_manager
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from config_manager import ConfigManager

class TestConfigManager(unittest.TestCase):
    def setUp(self):
        # Reset singleton for each test
        ConfigManager._instance = None

    @patch.dict(os.environ, {
        "DEEPSEEK_API_KEY": "sk-1234567890abcdef",
        "FLASK_ENV": "production",
        "FLASK_DEBUG": "0"
    })
    def test_load_config_from_env(self):
        cm = ConfigManager()
        self.assertEqual(cm.ai.deepseek_api_key, "sk-1234567890abcdef")
        self.assertEqual(cm.config.flask_env, "production")
        self.assertFalse(cm.config.flask_debug)

    def test_deepseek_validation_valid(self):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "sk-valid-key-123"}):
            cm = ConfigManager()
            self.assertTrue(cm.config.ai.validate_deepseek_key())

    def test_deepseek_validation_invalid(self):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "your-api-key"}):
            cm = ConfigManager()
            self.assertFalse(cm.config.ai.validate_deepseek_key())

    def test_deepseek_validation_missing(self):
        with patch.dict(os.environ, {}, clear=True):
            cm = ConfigManager()
            self.assertFalse(cm.config.ai.validate_deepseek_key())

    def test_singleton(self):
        cm1 = ConfigManager.get_instance()
        cm2 = ConfigManager.get_instance()
        self.assertIs(cm1, cm2)

if __name__ == '__main__':
    unittest.main()
