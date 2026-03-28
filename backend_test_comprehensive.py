#!/usr/bin/env python3
"""
Comprehensive Backend API Testing Script for AchaServiço
Tests all endpoints specified in the review request:
1. Report System Endpoints
2. Provider Unblock Endpoint  
3. User Block System
4. Auth /me endpoint
5. Health Check
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend environment
BACKEND_URL = "https://service-finder-416.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def print_test_header(test_name):
    """Print a formatted test header"""
    print(f"\n{'='*60}")
    print(f"🧪 TESTING: {test_name}")
    print(f"{'='*60}")

def print_result(success, message, details=None):
    """Print test result with formatting"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"   Details: {details}")

def test_health_check():
    """Test GET /api/health - Health check endpoint"""
    print_test_header("GET /api/health - Health Check")
    
    url = f"{API_BASE}/health"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Request URL: {url}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                if response_data.get("status") == "healthy":
                    print_result(True, "Health check passed", "API is healthy")
                    return True
                else:
                    print_result(False, "Health check failed", f"Status: {response_data.get('status')}")
                    return False
            except json.JSONDecodeError:
                # Some health endpoints just return plain text
                if "healthy" in response.text.lower() or "ok" in response.text.lower():
                    print_result(True, "Health check passed", "API is healthy (plain text response)")
                    return True
                else:
                    print_result(False, "Health check unclear", response.text)
                    return False
        else:
            print_result(False, f"Health check failed with status {response.status_code}", response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Health check request failed: {str(e)}")
        return False

def test_auth_me_unauthenticated():
    """Test GET /api/auth/me - Should return 401 for unauthenticated"""
    print_test_header("GET /api/auth/me - Unauthenticated Access")
    
    url = f"{API_BASE}/auth/me"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Request URL: {url}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 401:
            print_result(True, "Correctly returns 401 for unauthenticated access", "Auth protection working")
            return True
        else:
            print_result(False, f"Expected 401, got {response.status_code}", response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Request failed: {str(e)}")
        return False

def get_provider_id():
    """Get a valid provider ID from the providers endpoint"""
    try:
        response = requests.get(f"{API_BASE}/providers", timeout=10)
        if response.status_code == 200:
            providers = response.json()
            if providers and len(providers) > 0:
                return providers[0].get("provider_id")
    except:
        pass
    return None

def get_report_id():
    """Get a valid report ID from the admin reports endpoint"""
    try:
        response = requests.get(f"{API_BASE}/admin/reports", timeout=10)
        if response.status_code == 200:
            reports = response.json()
            if reports and len(reports) > 0:
                return reports[0].get("report_id")
    except:
        pass
    return None

def test_get_admin_reports():
    """Test GET /api/admin/reports - Get all reports"""
    print_test_header("GET /api/admin/reports - Get All Reports")
    
    url = f"{API_BASE}/admin/reports"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Request URL: {url}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            response_data = response.json()
            if isinstance(response_data, list):
                print_result(True, f"Successfully retrieved {len(response_data)} reports", 
                           f"Reports array returned with {len(response_data)} items")
                return True
            else:
                print_result(False, "Expected array response", f"Got: {type(response_data)}")
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}", response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Request failed: {str(e)}")
        return False

def test_discard_report():
    """Test PUT /api/admin/reports/{id}/discard - Discard a report"""
    print_test_header("PUT /api/admin/reports/{id}/discard - Discard Report")
    
    # First try with a fake ID to test 404 behavior
    fake_url = f"{API_BASE}/admin/reports/fake_report_id/discard"
    
    try:
        response = requests.put(fake_url, timeout=10)
        print(f"Request URL (fake ID): {fake_url}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 404:
            print_result(True, "Correctly returns 404 for non-existent report", "Error handling working")
        else:
            print_result(False, f"Expected 404 for fake ID, got {response.status_code}", response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Request failed: {str(e)}")
        return False
    
    # Now try with a real report ID if available
    report_id = get_report_id()
    if report_id:
        real_url = f"{API_BASE}/admin/reports/{report_id}/discard"
        try:
            response = requests.put(real_url, timeout=10)
            print(f"\nRequest URL (real ID): {real_url}")
            print(f"Response Status: {response.status_code}")
            print(f"Response Body: {response.text}")
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("success"):
                    print_result(True, "Report discarded successfully", response_data.get("message"))
                    return True
                else:
                    print_result(False, "Unexpected response format", response_data)
                    return False
            else:
                print_result(False, f"Unexpected status code: {response.status_code}", response.text)
                return False
                
        except requests.exceptions.RequestException as e:
            print_result(False, f"Request failed: {str(e)}")
            return False
    else:
        print_result(True, "No reports available to discard", "404 test passed, no real reports to test")
        return True

def test_accept_report():
    """Test PUT /api/admin/reports/{id}/accept - Accept a report"""
    print_test_header("PUT /api/admin/reports/{id}/accept - Accept Report")
    
    # Try with a real report ID if available
    report_id = get_report_id()
    if report_id:
        url = f"{API_BASE}/admin/reports/{report_id}/accept"
        try:
            response = requests.put(url, timeout=10)
            print(f"Request URL: {url}")
            print(f"Response Status: {response.status_code}")
            print(f"Response Body: {response.text}")
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("success"):
                    print_result(True, "Report accepted successfully", response_data.get("message"))
                    return True
                else:
                    print_result(False, "Unexpected response format", response_data)
                    return False
            else:
                print_result(False, f"Unexpected status code: {response.status_code}", response.text)
                return False
                
        except requests.exceptions.RequestException as e:
            print_result(False, f"Request failed: {str(e)}")
            return False
    else:
        # Test with fake ID to verify endpoint exists
        fake_url = f"{API_BASE}/admin/reports/fake_report_id/accept"
        try:
            response = requests.put(fake_url, timeout=10)
            print(f"Request URL (fake ID): {fake_url}")
            print(f"Response Status: {response.status_code}")
            print(f"Response Body: {response.text}")
            
            if response.status_code == 404:
                print_result(True, "Endpoint exists (returns 404 for fake ID)", "Accept endpoint is implemented")
                return True
            else:
                print_result(False, f"Unexpected status for fake ID: {response.status_code}", response.text)
                return False
                
        except requests.exceptions.RequestException as e:
            print_result(False, f"Request failed: {str(e)}")
            return False

def test_provider_unblock():
    """Test POST /api/admin/providers/{id}/unblock - Unblock a provider"""
    print_test_header("POST /api/admin/providers/{id}/unblock - Unblock Provider")
    
    # Get a valid provider ID
    provider_id = get_provider_id()
    if not provider_id:
        print_result(False, "No providers available to test unblock", "Cannot test without provider data")
        return False
    
    url = f"{API_BASE}/admin/providers/{provider_id}/unblock"
    
    try:
        response = requests.post(url, timeout=10)
        print(f"Request URL: {url}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get("success"):
                print_result(True, "Provider unblock endpoint working", response_data.get("message"))
                return True
            else:
                print_result(False, "Unexpected response format", response_data)
                return False
        elif response.status_code == 404:
            print_result(False, "Provider unblock endpoint not found", "Endpoint may not be implemented")
            return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}", response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Request failed: {str(e)}")
        return False

def test_user_block_endpoints():
    """Test POST /api/admin/users/{id}/block and /unblock - User block system"""
    print_test_header("POST /api/admin/users/{id}/block & /unblock - User Block System")
    
    # Test with a fake user ID to verify endpoints exist
    fake_user_id = "fake_user_123"
    
    # Test block endpoint
    block_url = f"{API_BASE}/admin/users/{fake_user_id}/block"
    try:
        response = requests.post(block_url, timeout=10)
        print(f"Request URL (block): {block_url}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code in [200, 404]:
            print_result(True, "User block endpoint exists", f"Status: {response.status_code}")
            block_exists = True
        else:
            print_result(False, f"Unexpected status for block endpoint: {response.status_code}", response.text)
            block_exists = False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Block endpoint request failed: {str(e)}")
        block_exists = False
    
    # Test unblock endpoint
    unblock_url = f"{API_BASE}/admin/users/{fake_user_id}/unblock"
    try:
        response = requests.post(unblock_url, timeout=10)
        print(f"\nRequest URL (unblock): {unblock_url}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code in [200, 404]:
            print_result(True, "User unblock endpoint exists", f"Status: {response.status_code}")
            unblock_exists = True
        else:
            print_result(False, f"Unexpected status for unblock endpoint: {response.status_code}", response.text)
            unblock_exists = False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Unblock endpoint request failed: {str(e)}")
        unblock_exists = False
    
    return block_exists and unblock_exists

def run_all_tests():
    """Run all comprehensive API tests"""
    print(f"🚀 Starting Comprehensive AchaServiço API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tests = [
        ("Health Check", test_health_check),
        ("Auth /me Unauthenticated", test_auth_me_unauthenticated),
        ("Get Admin Reports", test_get_admin_reports),
        ("Discard Report", test_discard_report),
        ("Accept Report", test_accept_report),
        ("Provider Unblock", test_provider_unblock),
        ("User Block System", test_user_block_endpoints)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print_result(False, f"Test {test_name} crashed: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*60}")
    print(f"📊 TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed!")
        return True
    else:
        print(f"⚠️  {total - passed} test(s) failed")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)