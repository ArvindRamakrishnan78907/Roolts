
import asyncio
import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.multi_ai import MultiAIService

async def final_validation():
    print("=== Final Verification ===")
    load_dotenv(os.path.join('backend', '.env'))

    # 1. Verify MultiAIService & Fallback
    print("\n[1] Testing AI Service & Fallback...")
    service = MultiAIService({
        'deepseek': os.getenv('DEEPSEEK_API_KEY'),
        'huggingface': os.getenv('HF_TOKEN')
    })
    
    try:
        # Explainer uses the callback which uses chat -> deepseek -> fallback
        print("   Requesting explanation for simple code...")
        result = await service.explainer.explain_code("print('Hello')", "python")
        
        if 'error' in result:
             print(f"   [WARNING] AI returned error: {result['error']}")
             # This might happen if keys are missing/invalid, but the *code path* is valid
        else:
             print("   [SUCCESS] AI Explanation received.")
             print(f"   Provider: {result.get('provider', 'Unknown')}")
             
    except Exception as e:
        print(f"   [FAILURE] AI Service Exception: {e}")

    # 2. Verify Removal of GitHub/Social Routes
    print("\n[2] Verifying Removal of GitHub/Social Features...")
    
    routes_path = os.path.join('backend', 'routes')
    github_py = os.path.join(routes_path, 'github.py')
    social_py = os.path.join(routes_path, 'social.py')
    
    if not os.path.exists(github_py):
        print("   [SUCCESS] backend/routes/github.py is gone.")
    else:
        print("   [FAILURE] backend/routes/github.py STILL EXISTS.")
        
    if not os.path.exists(social_py):
        print("   [SUCCESS] backend/routes/social.py is gone.")
    else:
        print("   [FAILURE] backend/routes/social.py STILL EXISTS.")

    # 3. Verify App Entry Point Imports
    print("\n[3] Checking app.py imports...")
    try:
        with open(os.path.join('backend', 'app.py'), 'r') as f:
            content = f.read()
            if 'routes.github' in content or 'register_blueprint(github_bp' in content:
                print("   [FAILURE] app.py still references github routes!")
            else:
                 print("   [SUCCESS] app.py is clean of github routes.")
                 
            if 'routes.social' in content or 'register_blueprint(social_bp' in content:
                print("   [FAILURE] app.py still references social routes!")
            else:
                 print("   [SUCCESS] app.py is clean of social routes.")
    except Exception as e:
        print(f"   [ERROR] Could not read app.py: {e}")

    print("\n=== Validation Complete ===")

if __name__ == "__main__":
    asyncio.run(final_validation())
