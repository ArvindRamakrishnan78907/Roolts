#!/usr/bin/env python3
"""
Terminal Test Script
Tests the secure terminal functionality in development mode
"""

import requests
import json

BASE_URL = 'http://localhost:5000'

def test_terminal():
    """Test terminal commands"""
    print("🧪 Testing Roolts Terminal API")
    print("=" * 40)
    
    # Test health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            print("   ✅ Health check passed")
            health_data = response.json()
            print(f"   📊 Service: {health_data.get('service')}")
            print(f"   🔒 Security features enabled: {health_data.get('security', {})}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
        return False
    
    # Test terminal health
    print("\n2. Testing terminal health...")
    try:
        response = requests.get(f"{BASE_URL}/api/terminal/health")
        if response.status_code == 200:
            print("   ✅ Terminal health check passed")
        else:
            print(f"   ❌ Terminal health check failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Terminal health error: {e}")
    
    # Test development status
    print("\n3. Testing development status...")
    try:
        response = requests.get(f"{BASE_URL}/api/dev-auth/dev-status")
        if response.status_code == 200:
            dev_status = response.json()
            print(f"   📋 Development mode: {dev_status.get('development_mode')}")
            print(f"   🔓 Auth bypass: {dev_status.get('auth_bypass')}")
            print(f"   👤 Dev user ID: {dev_status.get('dev_user_id')}")
        else:
            print(f"   ⚠️  Dev status check failed: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  Dev status error: {e}")
    
    # Test terminal commands
    test_commands = [
        'ls',
        'dir', 
        'pwd',
        'echo "Hello from Roolts Terminal!"',
        'python --version'
    ]
    
    print("\n4. Testing terminal commands...")
    for i, command in enumerate(test_commands, 1):
        print(f"\n   4.{i} Testing: {command}")
        try:
            response = requests.post(
                f"{BASE_URL}/api/terminal/execute",
                headers={'Content-Type': 'application/json'},
                json={'command': command}
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print(f"        ✅ Success: {result.get('output', '').strip()[:100]}")
                else:
                    print(f"        ⚠️  Command failed: {result.get('error')}")
            else:
                print(f"        ❌ Request failed: {response.status_code}")
                if response.text:
                    print(f"        📝 Response: {response.text[:200]}")
                    
        except Exception as e:
            print(f"        ❌ Command error: {e}")
    
    # Test workspace info
    print("\n5. Testing workspace info...")
    try:
        response = requests.get(f"{BASE_URL}/api/terminal/workspace/info")
        if response.status_code == 200:
            workspace_info = response.json()
            print(f"   📁 Workspace root: {workspace_info.get('workspaceRoot')}")
            print(f"   📍 Current dir: {workspace_info.get('currentDirectory')}")
        else:
            print(f"   ⚠️  Workspace info failed: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  Workspace info error: {e}")
    
    print("\n" + "=" * 40)
    print("🎉 Terminal test completed!")
    print("If you see ✅ symbols above, the terminal is working correctly.")
    print("If you see ❌ symbols, check the server logs for errors.")

if __name__ == '__main__':
    test_terminal()