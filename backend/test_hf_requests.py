import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

token = os.getenv('HF_TOKEN')
model = os.getenv('HF_MODEL_ID', 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B')

API_URL = "https://router.huggingface.co/v1/chat/completions"
headers = {"Authorization": f"Bearer {token}"}

def query(payload):
	response = requests.post(API_URL, headers=headers, json=payload)
	return response.json()

try:
    print(f"Querying {API_URL}...")
    output = query({
        "model": model,
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 50
    })
    print(f"RAW OUTPUT: {output}")
except Exception as e:
    print(f"FAILED: {e}")
