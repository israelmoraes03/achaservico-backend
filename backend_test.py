#!/usr/bin/env python3
"""
Backend API Testing for AchaServiço
Tests all endpoints according to test_result.md requirements
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "https://achaservico.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        
    def log_result(self, endpoint, method, status, expected_status, details=""):
        """Log test result"""
        success = status == expected_status
        result = {
            "endpoint": f"{method} {endpoint}",
            "status": status,
            "expected": expected_status,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {method} {endpoint} - {status} (expected {expected_status})")
        if details:
            print(f"   Details: {details}")
        if not success:
            print(f"   ❌ FAILED: Expected {expected_status}, got {status}")
        print()
        
    def test_public_endpoints(self):
        """Test all public endpoints that should work without authentication"""
        print("=== TESTING PUBLIC ENDPOINTS ===\n")
        
        # 1. Root endpoint
        try:
            response = self.session.get(f"{BASE_URL}/")
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            details = f"Response: {data.get('message', 'No message')}"
            self.log_result("/", "GET", response.status_code, 200, details)
        except Exception as e:
            self.log_result("/", "GET", "ERROR", 200, f"Exception: {str(e)}")
            
        # 2. Health check
        try:
            response = self.session.get(f"{BASE_URL}/health")
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            details = f"Status: {data.get('status', 'No status')}"
            self.log_result("/health", "GET", response.status_code, 200, details)
        except Exception as e:
            self.log_result("/health", "GET", "ERROR", 200, f"Exception: {str(e)}")
            
        # 3. Categories
        try:
            response = self.session.get(f"{BASE_URL}/categories")
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else []
            details = f"Categories count: {len(data) if isinstance(data, list) else 'Invalid format'}"
            if isinstance(data, list) and len(data) > 0:
                details += f", First category: {data[0].get('name', 'No name') if isinstance(data[0], dict) else 'Invalid item'}"
            self.log_result("/categories", "GET", response.status_code, 200, details)
        except Exception as e:
            self.log_result("/categories", "GET", "ERROR", 200, f"Exception: {str(e)}")
            
        # 4. Neighborhoods
        try:
            response = self.session.get(f"{BASE_URL}/neighborhoods")
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else []
            details = f"Neighborhoods count: {len(data) if isinstance(data, list) else 'Invalid format'}"
            if isinstance(data, list) and len(data) > 0:
                details += f", First: {data[0] if isinstance(data[0], str) else 'Invalid item'}"
            self.log_result("/neighborhoods", "GET", response.status_code, 200, details)
        except Exception as e:
            self.log_result("/neighborhoods", "GET", "ERROR", 200, f"Exception: {str(e)}")
            
        # 5. Providers (no filters)
        try:
            response = self.session.get(f"{BASE_URL}/providers")
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else []
            details = f"Providers count: {len(data) if isinstance(data, list) else 'Invalid format'}"
            if isinstance(data, list) and len(data) > 0:
                details += f", First provider: {data[0].get('name', 'No name') if isinstance(data[0], dict) else 'Invalid item'}"
            self.log_result("/providers", "GET", response.status_code, 200, details)
        except Exception as e:
            self.log_result("/providers", "GET", "ERROR", 200, f"Exception: {str(e)}")
            
        # 6. Providers with category filter
        try:
            response = self.session.get(f"{BASE_URL}/providers?category=eletricista")
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else []
            details = f"Eletricista providers: {len(data) if isinstance(data, list) else 'Invalid format'}"
            self.log_result("/providers?category=eletricista", "GET", response.status_code, 200, details)
        except Exception as e:
            self.log_result("/providers?category=eletricista", "GET", "ERROR", 200, f"Exception: {str(e)}")
            
        # 7. Providers with neighborhood filter
        try:
            response = self.session.get(f"{BASE_URL}/providers?neighborhood=Centro")
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else []
            details = f"Centro providers: {len(data) if isinstance(data, list) else 'Invalid format'}"
            self.log_result("/providers?neighborhood=Centro", "GET", response.status_code, 200, details)
        except Exception as e:
            self.log_result("/providers?neighborhood=Centro", "GET", "ERROR", 200, f"Exception: {str(e)}")
            
        # 8. Providers with search
        try:
            response = self.session.get(f"{BASE_URL}/providers?search=João")
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else []
            details = f"Search 'João' results: {len(data) if isinstance(data, list) else 'Invalid format'}"
            self.log_result("/providers?search=João", "GET", response.status_code, 200, details)
        except Exception as e:
            self.log_result("/providers?search=João", "GET", "ERROR", 200, f"Exception: {str(e)}")
            
        # 9. Test specific provider IDs from test data
        provider_ids = ["prov_001", "prov_002", "prov_003", "prov_004", "prov_005"]
        for provider_id in provider_ids:
            try:
                response = self.session.get(f"{BASE_URL}/providers/{provider_id}")
                if response.status_code == 200:
                    data = response.json()
                    details = f"Provider: {data.get('name', 'No name')}, Category: {data.get('category', 'No category')}"
                elif response.status_code == 404:
                    details = "Provider not found (expected if no test data)"
                else:
                    details = f"Unexpected status code"
                self.log_result(f"/providers/{provider_id}", "GET", response.status_code, [200, 404], details)
            except Exception as e:
                self.log_result(f"/providers/{provider_id}", "GET", "ERROR", [200, 404], f"Exception: {str(e)}")
                
        # 10. Test provider reviews for existing providers
        for provider_id in provider_ids[:2]:  # Test first 2 only
            try:
                response = self.session.get(f"{BASE_URL}/providers/{provider_id}/reviews")
                data = response.json() if response.headers.get('content-type', '').startswith('application/json') else []
                details = f"Reviews count: {len(data) if isinstance(data, list) else 'Invalid format'}"
                self.log_result(f"/providers/{provider_id}/reviews", "GET", response.status_code, 200, details)
            except Exception as e:
                self.log_result(f"/providers/{provider_id}/reviews", "GET", "ERROR", 200, f"Exception: {str(e)}")
                
    def test_auth_endpoints_structure(self):
        """Test auth endpoints structure (should return proper error codes without valid auth)"""
        print("=== TESTING AUTH ENDPOINTS STRUCTURE ===\n")
        
        # 1. Session exchange (should fail without X-Session-ID)
        try:
            response = self.session.post(f"{BASE_URL}/auth/session")
            details = "Should fail without X-Session-ID header"
            self.log_result("/auth/session", "POST", response.status_code, 400, details)
        except Exception as e:
            self.log_result("/auth/session", "POST", "ERROR", 400, f"Exception: {str(e)}")
            
        # 2. Get me (should return 401 without auth)
        try:
            response = self.session.get(f"{BASE_URL}/auth/me")
            details = "Should return 401 without authentication"
            self.log_result("/auth/me", "GET", response.status_code, 401, details)
        except Exception as e:
            self.log_result("/auth/me", "GET", "ERROR", 401, f"Exception: {str(e)}")
            
        # 3. Logout (should work even without auth)
        try:
            response = self.session.post(f"{BASE_URL}/auth/logout")
            details = "Should work even without authentication"
            self.log_result("/auth/logout", "POST", response.status_code, 200, details)
        except Exception as e:
            self.log_result("/auth/logout", "POST", "ERROR", 200, f"Exception: {str(e)}")
            
    def test_protected_endpoints(self):
        """Test protected endpoints (should return 401 without authentication)"""
        print("=== TESTING PROTECTED ENDPOINTS (Should return 401) ===\n")
        
        # 1. Create provider
        try:
            provider_data = {
                "name": "João Silva",
                "phone": "(67) 99999-9999",
                "category": "eletricista",
                "neighborhood": "Centro",
                "description": "Eletricista experiente"
            }
            response = self.session.post(f"{BASE_URL}/providers", json=provider_data)
            details = "Should require authentication"
            self.log_result("/providers", "POST", response.status_code, 401, details)
        except Exception as e:
            self.log_result("/providers", "POST", "ERROR", 401, f"Exception: {str(e)}")
            
        # 2. Update provider
        try:
            update_data = {"name": "João Silva Updated"}
            response = self.session.put(f"{BASE_URL}/providers/prov_001", json=update_data)
            details = "Should require authentication"
            self.log_result("/providers/prov_001", "PUT", response.status_code, 401, details)
        except Exception as e:
            self.log_result("/providers/prov_001", "PUT", "ERROR", 401, f"Exception: {str(e)}")
            
        # 3. Create review
        try:
            review_data = {
                "provider_id": "prov_001",
                "rating": 5,
                "comment": "Excelente serviço"
            }
            response = self.session.post(f"{BASE_URL}/reviews", json=review_data)
            details = "Should require authentication"
            self.log_result("/reviews", "POST", response.status_code, 401, details)
        except Exception as e:
            self.log_result("/reviews", "POST", "ERROR", 401, f"Exception: {str(e)}")
            
        # 4. Create subscription
        try:
            response = self.session.post(f"{BASE_URL}/subscriptions/create")
            details = "Should require authentication"
            self.log_result("/subscriptions/create", "POST", response.status_code, 401, details)
        except Exception as e:
            self.log_result("/subscriptions/create", "POST", "ERROR", 401, f"Exception: {str(e)}")
            
        # 5. Get subscription status
        try:
            response = self.session.get(f"{BASE_URL}/subscriptions/status")
            details = "Should require authentication"
            self.log_result("/subscriptions/status", "GET", response.status_code, 401, details)
        except Exception as e:
            self.log_result("/subscriptions/status", "GET", "ERROR", 401, f"Exception: {str(e)}")
            
    def run_all_tests(self):
        """Run all test suites"""
        print(f"🚀 Starting AchaServiço Backend API Tests")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"⏰ Started at: {datetime.now().isoformat()}\n")
        
        self.test_public_endpoints()
        self.test_auth_endpoints_structure()
        self.test_protected_endpoints()
        
        # Summary
        print("=== TEST SUMMARY ===")
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📈 Success Rate: {(passed_tests/total_tests*100):.1f}%\n")
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.results:
                if not result['success']:
                    print(f"   - {result['endpoint']}: {result['status']} (expected {result['expected']})")
                    if result['details']:
                        print(f"     Details: {result['details']}")
            print()
            
        return failed_tests == 0

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All tests passed!")
        sys.exit(0)
    else:
        print("💥 Some tests failed!")
        sys.exit(1)