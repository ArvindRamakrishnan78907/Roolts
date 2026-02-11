
import threading
import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Apply nest_asyncio just like app.py
import nest_asyncio
nest_asyncio.apply()

# Force Windows Policy
if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from utils.async_utils import run_async
from services.connection_pool import global_connection_pool

def worker_task(i):
    print(f"Worker {i} started in Thread {threading.get_ident()}")
    
    async def make_request():
        print(f"   Worker {i} inside async coroutine")
        # Initialize/Get session (should be thread-local now)
        session = await global_connection_pool.get_session()
        print(f"   Worker {i} got session {id(session)} on loop {id(asyncio.get_running_loop())}")
        
        # Simple fetch
        async with session.get('https://httpbin.org/get') as resp:
            print(f"   Worker {i} response: {resp.status}")
            return resp.status

    try:
        status = run_async(make_request())
        print(f"Worker {i} FINISHED with success: {status}")
    except Exception as e:
        print(f"!!! Worker {i} FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print(">>> STARTING THREADING REPRODUCTION TEST <<<")
    
    threads = []
    for i in range(3):
        t = threading.Thread(target=worker_task, args=(i,))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    print(">>> REPRODUCTION TEST COMPLETE <<<")
