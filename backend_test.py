#!/usr/bin/env python3
"""
Backend API Testing Script for AchaServiço Report/Denunciation Feature
Tests the report endpoints as specified in the review request.
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

def test_create_report():
    """Test POST /api/reports - Create a report"""
    print_test_header("POST /api/reports - Create Report")
    
    # Test 1: Non-existent provider (should return 404)
    url = f"{API_BASE}/reports"
    payload = {
        "provider_id": "test_provider_123",
        "reason": "inappropriate_content", 
        "description": "Test report"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"Request URL: {url}")
        print(f"Request Payload: {json.dumps(payload, indent=2)}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 404:
            print_result(True, "Expected 404 for non-existent provider (test_provider_123)", 
                        "This is correct behavior since the provider doesn't exist")
        else:
            print_result(False, f"Expected 404, got {response.status_code}", response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Request failed: {str(e)}")
        return False
    
    # Test 2: Real provider (should create report successfully)
    real_provider_payload = {
        "provider_id": "prov_04de6b0e2bb0",  # Real provider ID from admin API
        "reason": "inappropriate_content", 
        "description": "Test report for real provider"
    }
    
    try:
        response = requests.post(url, json=real_provider_payload, timeout=10)
        print(f"\n--- Testing with real provider ---")
        print(f"Request Payload: {json.dumps(real_provider_payload, indent=2)}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get("success"):
                print_result(True, "Report created successfully for real provider", response_data.get("message"))
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

def test_admin_stats():
    """Test GET /api/admin/stats - Verify stats include pending_reports field"""
    print_test_header("GET /api/admin/stats - Check Pending Reports Field")
    
    url = f"{API_BASE}/admin/stats"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Request URL: {url}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            response_data = response.json()
            if "pending_reports" in response_data:
                pending_count = response_data["pending_reports"]
                print_result(True, f"Stats include pending_reports field", 
                           f"pending_reports: {pending_count}")
                return True
            else:
                print_result(False, "Stats missing pending_reports field", 
                           f"Available fields: {list(response_data.keys())}")
                return False
        elif response.status_code == 404:
            print_result(False, "Admin stats endpoint not found", 
                        "The /api/admin/stats endpoint may not be implemented")
            return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}", response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Request failed: {str(e)}")
        return False

def test_accept_report():
    """Test PUT /api/admin/reports/{report_id}/accept - Accept a report"""
    print_test_header("PUT /api/admin/reports/{report_id}/accept - Accept Report")
    
    # First, get all reports to find one to accept
    try:
        reports_response = requests.get(f"{API_BASE}/admin/reports", timeout=10)
        if reports_response.status_code == 200:
            reports = reports_response.json()
            if reports and len(reports) > 0:
                # Use the first report
                report_id = reports[0].get("report_id")
                url = f"{API_BASE}/admin/reports/{report_id}/accept"
                
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
            else:
                print_result(True, "No reports available to accept", "This is expected if no reports exist")
                return True
        else:
            print_result(False, f"Failed to get reports: {reports_response.status_code}", reports_response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Request failed: {str(e)}")
        return False

def test_discard_nonexistent_report():
    """Test PUT /api/admin/reports/fake_id/discard - Try to discard non-existing report"""
    print_test_header("PUT /api/admin/reports/fake_id/discard - Discard Non-existing Report")
    
    url = f"{API_BASE}/admin/reports/fake_id/discard"
    
    try:
        response = requests.put(url, timeout=10)
        print(f"Request URL: {url}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 404:
            print_result(True, "Expected 404 for non-existent report", 
                        "Correctly returns 404 when trying to discard non-existent report")
            return True
        else:
            print_result(False, f"Expected 404, got {response.status_code}", response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print_result(False, f"Request failed: {str(e)}")
        return False

def run_all_tests():
    """Run all report API tests"""
    print(f"🚀 Starting Report/Denunciation API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tests = [
        ("Create Report", test_create_report),
        ("Get Admin Reports", test_get_admin_reports), 
        ("Admin Stats with Pending Reports", test_admin_stats),
        ("Accept Report", test_accept_report),
        ("Discard Non-existent Report", test_discard_nonexistent_report)
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