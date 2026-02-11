
import asyncio
import os
import sys
import traceback
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.multi_ai import MultiAIService

# Mock Flask request context if needed, but we are testing the service directly first
# to see if the error is in the service layer.

async def debug_backend():
    print("=== Debugging Backend 500 Errors ===")
    load_dotenv(os.path.join('backend', '.env'))

    # Load keys
    keys = {
        'gemini': os.getenv('GEMINI_API_KEY'),
        'deepseek': os.getenv('DEEPSEEK_API_KEY'),
        'huggingface': os.getenv('HF_TOKEN')
    }
    
    print(f"Loaded Keys: {list(keys.keys())}")
    
    try:
        service = MultiAIService(keys)
        print("MultiAIService initialized successfully.")
    except Exception as e:
        print(f"CRITICAL: Failed to initialize MultiAIService: {e}")
        traceback.print_exc()
        return

    # Test 1: Chat (MultiAIService.chat) based on the user error report
    print("\n[Test 1] Testing chat()...")
    try:
        # Mocking a request that might fail
        result = await service.chat("Hello, are you working?", model='deepseek')
        print(f"Chat Result: {result}")
        if 'error' in result:
             print(f"Chat returned error (handled): {result['error']}")
    except Exception as e:
        print(f"CRITICAL: Chat raised unhandled exception: {e}")
        traceback.print_exc()

    # Test 2: Code Champ (MultiAIService.code_champ.analyze_code)
    print("\n[Test 2] Testing code_champ.analyze_code()...")
    try:
        code = "def hello(): print('world')"
        result = await service.code_champ.analyze_code(code, "python")
        print(f"CodeChamp Result keys: {result.keys() if isinstance(result, dict) else result}")
        if 'error' in result:
             print(f"CodeChamp returned error (handled): {result['error']}")
    except Exception as e:
        print(f"CRITICAL: CodeChamp raised unhandled exception: {e}")
        traceback.print_exc()
        
    # Test 3: Simulating AsyncDeepSeekProvider internal failure
    # We suspect the error might be in the async provider's error handling or session management
    print("\n[Test 3] Testing AsyncDeepSeekProvider directly...")
    try:
        if service.async_deepseek:
             # Force a call
             res = await service.async_deepseek.generate_async("Quick test", stream=False)
             print(f"DeepSeek direct result: {res}")
    except Exception as e:
        print(f"CRITICAL: AsyncDeepSeekProvider raised unhandled exception: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(debug_backend())
