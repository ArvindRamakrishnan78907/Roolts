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
    # Non-streaming
    response = client.chat_completion(
        model=model,
        messages=[{"role": "user", "content": "Hello"}],
        max_tokens=20,
        stream=False
    )
    print(f"RESPONSE TYPE: {type(response)}")
    print(f"RESPONSE CONTENT: {response.choices[0].message.content}")
except Exception as e:
    print(f"FAILED: {e}")
