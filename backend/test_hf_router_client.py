import os
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

token = os.getenv('HF_TOKEN')
model = os.getenv('HF_MODEL_ID', 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B')

# Use the router base URL
client = InferenceClient(api_key=token, base_url="https://router.huggingface.co/v1")

try:
    response = ""
    for chunk in client.chat_completion(
        model=model,
        messages=[{"role": "user", "content": "Hello"}],
        max_tokens=20,
        stream=True,
    ):
        print(f"DEBUG CHUNK: {chunk}")
        if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
            content = chunk.choices[0].delta.content
            if content:
                response += content
    print(f"SUCCESS: {response}")
except Exception as e:
    print(f"FAILED: {e}")
