import os
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

token = os.getenv('HF_TOKEN')
model = os.getenv('HF_MODEL_ID', 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B')

print(f"Testing with Token: {token[:10]}...")
print(f"Model ID: {model}")

client = InferenceClient(api_key=token)

try:
    response = ""
    for message in client.chat_completion(
        model=model,
        messages=[{"role": "user", "content": "Hello"}],
        max_tokens=20,
        stream=True,
    ):
        print(f"CHUNK: {message}")
        if hasattr(message, 'choices') and len(message.choices) > 0:
            content = message.choices[0].delta.content
            if content:
                response += content
    print(f"COMPLETE RESPONSE: {response}")
except Exception as e:
    import traceback
    traceback.print_exc()
