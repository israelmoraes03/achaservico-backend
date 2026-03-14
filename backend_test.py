#!/usr/bin/env python3
"""
Backend API Testing - AchaServiço Notification System
Testing notification endpoints as specified in review request.
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from the review request
BACKEND_URL = "https://acha-notif-hub.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def test_notifications_require_auth():
    """Test that notification endpoints require authentication (should return 401)"""
    print("\n=== Testing Notification Auth Protection ===")
    results = []
    
    # Test endpoints that should require authentication
    auth_required_endpoints = [
        ("GET", "/notifications", "Get notifications"),
        ("GET", "/notifications/unread-count", "Get unread count"),
        ("POST", "/notifications/mark-read", "Mark notifications as read")
    ]
    
    for method, endpoint, description in auth_required_endpoints:
        print(f"\nTesting {method} {endpoint} - {description}")
        try:
            url = f"{API_BASE}{endpoint}"
            
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json={}, timeout=10)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 401:
                print("✅ PASS: Correctly requires authentication")
                results.append((endpoint, True, "Returns 401 as expected"))
            else:
                print(f"❌ FAIL: Expected 401, got {response.status_code}")
                print(f"Response: {response.text[:200]}")
                results.append((endpoint, False, f"Got {response.status_code} instead of 401"))
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            results.append((endpoint, False, f"Request failed: {str(e)}"))
    
    return results

def test_broadcast_notification():
    """Test the admin broadcast notification endpoint"""
    print("\n=== Testing Admin Broadcast Notification ===")
    
    endpoint = "/admin/broadcast-notification"
    url = f"{API_BASE}{endpoint}"
    
    # Test data for broadcast notification
    test_notification = {
        "title": "🔔 Teste de Notificação - AchaServiço",
        "message": "Esta é uma mensagem de teste do sistema de notificações. Enviado em " + datetime.now().strftime("%H:%M:%S")
    }
    
    print(f"Testing POST {endpoint}")
    print(f"Test data: {json.dumps(test_notification, indent=2)}")
    
    try:
        response = requests.post(
            url,
            json=test_notification,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("✅ PASS: Broadcast notification endpoint working")
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Check if response has expected fields
                if "success" in data and data["success"]:
                    print("✅ Success flag is True")
                if "sent" in data:
                    print(f"✅ Push notifications sent: {data['sent']}")
                if "total_providers" in data:
                    print(f"✅ Total providers: {data['total_providers']}")
                    
                return (endpoint, True, f"Broadcast sent successfully - {data.get('message', 'No message')}")
                
            except json.JSONDecodeError:
                print("❌ FAIL: Invalid JSON response")
                print(f"Raw response: {response.text}")
                return (endpoint, False, "Invalid JSON response")
        
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:300]}")
            return (endpoint, False, f"HTTP {response.status_code}: {response.text[:100]}")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return (endpoint, False, f"Request failed: {str(e)}")

def test_notifications_flow():
    """Test the complete notifications flow if possible"""
    print("\n=== Testing Complete Notification Flow ===")
    
    # This is more of a verification that the structure is correct
    print("Testing notification model structure...")
    
    # Test if we can reach the endpoints (even if they return 401)
    endpoints_to_verify = [
        "/notifications",
        "/notifications/unread-count", 
        "/notifications/mark-read",
        "/admin/broadcast-notification"
    ]
    
    results = []
    for endpoint in endpoints_to_verify:
        try:
            url = f"{API_BASE}{endpoint}"
            response = requests.get(url, timeout=10)
            
            # We expect 401 for protected endpoints, 405 for POST-only endpoints
            if response.status_code in [401, 405, 200]:
                print(f"✅ {endpoint}: Endpoint exists and responds (HTTP {response.status_code})")
                results.append((endpoint, True, f"Endpoint accessible (HTTP {response.status_code})"))
            else:
                print(f"❓ {endpoint}: Unexpected response {response.status_code}")
                results.append((endpoint, False, f"Unexpected HTTP {response.status_code}"))
                
        except Exception as e:
            print(f"❌ {endpoint}: {str(e)}")
            results.append((endpoint, False, f"Connection error: {str(e)}"))
    
    return results

def main():
    """Run all notification tests"""
    print("🔔 AchaServiço Notification System Testing")
    print("=" * 50)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    
    all_results = []
    
    # Test 1: Auth protection
    auth_results = test_notifications_require_auth()
    all_results.extend(auth_results)
    
    # Test 2: Broadcast notification
    broadcast_result = test_broadcast_notification()
    all_results.append(broadcast_result)
    
    # Test 3: Flow verification
    flow_results = test_notifications_flow()
    all_results.extend(flow_results)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    failed = 0
    
    for endpoint, success, message in all_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {endpoint}")
        if not success:
            print(f"   └── {message}")
        
        if success:
            passed += 1
        else:
            failed += 1
    
    total = passed + failed
    print(f"\nResults: {passed}/{total} tests passed ({(passed/total*100):.1f}%)")
    
    if failed == 0:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {failed} test(s) failed")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)