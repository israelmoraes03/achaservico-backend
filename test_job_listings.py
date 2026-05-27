#!/usr/bin/env python3
"""
AchaServiço Job Listings Feature Testing
Tests all job-related endpoints including approval workflow
"""

import asyncio
import httpx
import time
import json
from typing import Dict, List, Any

# Backend URL from environment
BACKEND_URL = "https://service-finder-416.preview.emergentagent.com/api"

class JobListingsTester:
    def __init__(self):
        self.results = []
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        await self.client.aclose()
    
    def log_result(self, test_name: str, status: str, details: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "status": status,  # PASS, FAIL, ERROR
            "details": details,
            "timestamp": time.strftime("%H:%M:%S")
        }
        self.results.append(result)
        status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_emoji} {test_name}: {status}")
        if details:
            print(f"   Details: {details}")
    
    async def test_get_jobs_public(self):
        """Test GET /api/jobs - Should return only approved+active jobs"""
        try:
            response = await self.client.get(f"{BACKEND_URL}/jobs")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET /api/jobs", "PASS", 
                                  f"Returns {len(data)} approved+active jobs (empty initially is expected)")
                else:
                    self.log_result("GET /api/jobs", "FAIL", 
                                  f"Expected list, got {type(data)}")
            else:
                self.log_result("GET /api/jobs", "FAIL", 
                              f"Expected 200, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/jobs", "ERROR", str(e))
    
    async def test_get_jobs_filters(self):
        """Test GET /api/jobs/filters - Should return {companies: [], cities: []}"""
        try:
            response = await self.client.get(f"{BACKEND_URL}/jobs/filters")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and "companies" in data and "cities" in data:
                    if isinstance(data["companies"], list) and isinstance(data["cities"], list):
                        self.log_result("GET /api/jobs/filters", "PASS", 
                                      f"Returns correct structure: companies={len(data['companies'])}, cities={len(data['cities'])}")
                    else:
                        self.log_result("GET /api/jobs/filters", "FAIL", 
                                      f"companies and cities should be lists")
                else:
                    self.log_result("GET /api/jobs/filters", "FAIL", 
                                  f"Expected dict with 'companies' and 'cities' keys, got {data}")
            else:
                self.log_result("GET /api/jobs/filters", "FAIL", 
                              f"Expected 200, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/jobs/filters", "ERROR", str(e))
    
    async def test_submit_job_requires_auth(self):
        """Test POST /api/jobs/submit - Should return 401 without auth"""
        try:
            job_data = {
                "company_name": "Test Company",
                "job_title": "Test Position",
                "email": "test@example.com",
                "phone": "67999999999",
                "requirements": "Test requirements",
                "description": "Test description",
                "city": "Três Lagoas"
            }
            response = await self.client.post(f"{BACKEND_URL}/jobs/submit", json=job_data)
            
            if response.status_code == 401:
                self.log_result("POST /api/jobs/submit (no auth)", "PASS", 
                              "Correctly returns 401 without authentication")
            else:
                self.log_result("POST /api/jobs/submit (no auth)", "FAIL", 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("POST /api/jobs/submit (no auth)", "ERROR", str(e))
    
    async def test_admin_create_job_requires_auth(self):
        """Test POST /api/admin/jobs - Should return 401 without admin auth"""
        try:
            job_data = {
                "company_name": "Admin Test Company",
                "job_title": "Admin Test Position",
                "email": "admin@example.com",
                "phone": "67999999999",
                "requirements": "Admin test requirements",
                "description": "Admin test description",
                "city": "Três Lagoas"
            }
            response = await self.client.post(f"{BACKEND_URL}/admin/jobs", json=job_data)
            
            if response.status_code == 401:
                self.log_result("POST /api/admin/jobs (no auth)", "PASS", 
                              "Correctly returns 401 without admin authentication")
            else:
                self.log_result("POST /api/admin/jobs (no auth)", "FAIL", 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("POST /api/admin/jobs (no auth)", "ERROR", str(e))
    
    async def test_approve_job_requires_auth(self):
        """Test PUT /api/admin/jobs/{id}/approve - Should return 401 without admin auth"""
        try:
            fake_job_id = "job_test123456"
            response = await self.client.put(f"{BACKEND_URL}/admin/jobs/{fake_job_id}/approve")
            
            if response.status_code == 401:
                self.log_result("PUT /api/admin/jobs/{id}/approve (no auth)", "PASS", 
                              "Correctly returns 401 without admin authentication")
            else:
                self.log_result("PUT /api/admin/jobs/{id}/approve (no auth)", "FAIL", 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("PUT /api/admin/jobs/{id}/approve (no auth)", "ERROR", str(e))
    
    async def test_reject_job_requires_auth(self):
        """Test PUT /api/admin/jobs/{id}/reject - Should return 401 without admin auth"""
        try:
            fake_job_id = "job_test123456"
            response = await self.client.put(f"{BACKEND_URL}/admin/jobs/{fake_job_id}/reject")
            
            if response.status_code == 401:
                self.log_result("PUT /api/admin/jobs/{id}/reject (no auth)", "PASS", 
                              "Correctly returns 401 without admin authentication")
            else:
                self.log_result("PUT /api/admin/jobs/{id}/reject (no auth)", "FAIL", 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("PUT /api/admin/jobs/{id}/reject (no auth)", "ERROR", str(e))
    
    async def test_admin_list_all_jobs_requires_auth(self):
        """Test GET /api/admin/all-jobs - Should return 401 without admin auth"""
        try:
            response = await self.client.get(f"{BACKEND_URL}/admin/all-jobs")
            
            if response.status_code == 401:
                self.log_result("GET /api/admin/all-jobs (no auth)", "PASS", 
                              "Correctly returns 401 without admin authentication")
            else:
                self.log_result("GET /api/admin/all-jobs (no auth)", "FAIL", 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/admin/all-jobs (no auth)", "ERROR", str(e))
    
    async def test_delete_job_requires_auth(self):
        """Test DELETE /api/admin/jobs/{id} - Should return 401 without admin auth"""
        try:
            fake_job_id = "job_test123456"
            response = await self.client.delete(f"{BACKEND_URL}/admin/jobs/{fake_job_id}")
            
            if response.status_code == 401:
                self.log_result("DELETE /api/admin/jobs/{id} (no auth)", "PASS", 
                              "Correctly returns 401 without admin authentication")
            else:
                self.log_result("DELETE /api/admin/jobs/{id} (no auth)", "FAIL", 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("DELETE /api/admin/jobs/{id} (no auth)", "ERROR", str(e))
    
    async def run_all_tests(self):
        """Run all job listings tests"""
        print(f"💼 Starting AchaServiço Job Listings Tests")
        print(f"🌐 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test 1: GET /api/jobs (public)
        print("\n1️⃣ Testing GET /api/jobs (public endpoint)...")
        await self.test_get_jobs_public()
        
        # Test 2: GET /api/jobs/filters (public)
        print("\n2️⃣ Testing GET /api/jobs/filters (public endpoint)...")
        await self.test_get_jobs_filters()
        
        # Test 3: POST /api/jobs/submit (requires auth)
        print("\n3️⃣ Testing POST /api/jobs/submit (requires auth)...")
        await self.test_submit_job_requires_auth()
        
        # Test 4: POST /api/admin/jobs (requires admin auth)
        print("\n4️⃣ Testing POST /api/admin/jobs (requires admin auth)...")
        await self.test_admin_create_job_requires_auth()
        
        # Test 5: PUT /api/admin/jobs/{id}/approve (requires admin auth)
        print("\n5️⃣ Testing PUT /api/admin/jobs/{id}/approve (requires admin auth)...")
        await self.test_approve_job_requires_auth()
        
        # Test 6: PUT /api/admin/jobs/{id}/reject (requires admin auth)
        print("\n6️⃣ Testing PUT /api/admin/jobs/{id}/reject (requires admin auth)...")
        await self.test_reject_job_requires_auth()
        
        # Test 7: GET /api/admin/all-jobs (requires admin auth)
        print("\n7️⃣ Testing GET /api/admin/all-jobs (requires admin auth)...")
        await self.test_admin_list_all_jobs_requires_auth()
        
        # Test 8: DELETE /api/admin/jobs/{id} (requires admin auth)
        print("\n8️⃣ Testing DELETE /api/admin/jobs/{id} (requires admin auth)...")
        await self.test_delete_job_requires_auth()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = len([r for r in self.results if r["status"] == "PASS"])
        failed = len([r for r in self.results if r["status"] == "FAIL"])
        errors = len([r for r in self.results if r["status"] == "ERROR"])
        total = len(self.results)
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"⚠️  ERRORS: {errors}")
        print(f"📈 TOTAL:  {total}")
        
        if failed > 0 or errors > 0:
            print("\n🚨 FAILED/ERROR TESTS:")
            for result in self.results:
                if result["status"] in ["FAIL", "ERROR"]:
                    print(f"   {result['status']}: {result['test']} - {result['details']}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return {
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "total": total,
            "success_rate": success_rate,
            "results": self.results
        }

async def main():
    """Main test runner"""
    tester = JobListingsTester()
    try:
        results = await tester.run_all_tests()
        return results
    finally:
        await tester.close()

if __name__ == "__main__":
    results = asyncio.run(main())
