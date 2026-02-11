import asyncio
import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env variables
load_dotenv()

from services.multi_ai import MultiAIService

async def test_explainer():
    print("Testing AI Explainer via MultiAIService (with Fallback)...")
    
    # Check keys
    ds_key = os.getenv('DEEPSEEK_API_KEY')
    hf_token = os.getenv('HF_TOKEN')
    print(f"DeepSeek Key present: {bool(ds_key)}")
    print(f"HF Token present: {bool(hf_token)}")
    
    # Initialize service
    try:
        # MultiAIService handles env vars internally if not passed, but let's pass explicity for debug
        api_keys = {
            'deepseek': ds_key,
            'huggingface': hf_token
        }
        service = MultiAIService(api_keys)
        print("MultiAIService initialized.")
    except Exception as e:
        print(f"Initialization failed: {e}")
        return

    # Test code
    code = "def hello(): print('world')"
    language = "python"
    
    print(f"Explaining code: {code}")
    print("Expected behavior: DeepSeek might fail (402), should fallback to HuggingFace or return improved error.")
    
    try:
        # Use the explainer property of MultiAIService
        result = await service.explainer.explain_code(code, language)
        
        if 'error' in result:
             print(f"Error Result: {result}")
        else:
             print("Success!")
             print(f"Overview: {result.get('overview')}")
             print(f"Logic Flow: {result.get('logic_flow')}")
             
    except Exception as e:
        print(f"Exception during explanation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_explainer())
