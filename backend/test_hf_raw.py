import os
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

token = os.getenv('HF_TOKEN')
model = os.getenv('HF_MODEL_ID', 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B')

client = InferenceClient(api_key=token)

try:
    print(f"Calling client.post...")
    # Direct post to see what's really happening
    res = client.post(json={
        "model": model,
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 50
    }, model=model, task="chat-completion")
    import json
    print(f"RAW JSON: {json.loads(res.decode('utf-8'))}")
except Exception as e:
    print(f"FAILED: {e}")
