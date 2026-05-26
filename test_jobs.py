#!/usr/bin/env python3
"""
AchaServiço Job Listings Backend Testing
Tests all job-related endpoints (public and admin)
"""

import asyncio
import httpx
import time
import json
from typing import Dict, List, Any

# Backend URL
BACKEND_URL = "https://service-finder-416.preview.emergentagent.com/api"

class JobTester:
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
    
    async def test_get_jobs_empty(self):
        """Test GET /api/jobs - should return empty array initially"""
        try:
            response = await self.client.get(f"{BACKEND_URL}/jobs")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET /api/jobs (empty)", "PASS", 
                                  f"Returns list with {len(data)} jobs")
                else:
                    self.log_result("GET /api/jobs (empty)", "FAIL", 
                                  f"Expected list, got {type(data)}")
            else:
                self.log_result("GET /api/jobs (empty)", "FAIL", 
                              f"Expected 200, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/jobs (empty)", "ERROR", str(e))
    
    async def test_get_jobs_with_city_filter(self):
        """Test GET /api/jobs?city=tres_lagoas"""
        try:
            response = await self.client.get(f"{BACKEND_URL}/jobs?city=tres_lagoas")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET /api/jobs?city=tres_lagoas", "PASS", 
                                  f"Returns list with {len(data)} jobs")
                else:
                    self.log_result("GET /api/jobs?city=tres_lagoas", "FAIL", 
                                  f"Expected list, got {type(data)}")
            else:
                self.log_result("GET /api/jobs?city=tres_lagoas", "FAIL", 
                              f"Expected 200, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/jobs?city=tres_lagoas", "ERROR", str(e))
    
    async def test_get_jobs_with_search_filter(self):
        """Test GET /api/jobs?search=assistente"""
        try:
            response = await self.client.get(f"{BACKEND_URL}/jobs?search=assistente")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET /api/jobs?search=assistente", "PASS", 
                                  f"Returns list with {len(data)} jobs")
                else:
                    self.log_result("GET /api/jobs?search=assistente", "FAIL", 
                                  f"Expected list, got {type(data)}")
            else:
                self.log_result("GET /api/jobs?search=assistente", "FAIL", 
                              f"Expected 200, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/jobs?search=assistente", "ERROR", str(e))
    
    async def test_get_job_by_id_not_found(self):
        """Test GET /api/jobs/{job_id} - should return 404 for non-existent job"""
        try:
            fake_job_id = "job_nonexistent123"
            response = await self.client.get(f"{BACKEND_URL}/jobs/{fake_job_id}")
            
            if response.status_code == 404:
                self.log_result("GET /api/jobs/{job_id} (404)", "PASS", 
                              "Returns 404 for non-existent job")
            else:
                self.log_result("GET /api/jobs/{job_id} (404)", "FAIL", 
                              f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/jobs/{job_id} (404)", "ERROR", str(e))
    
    async def test_create_job_without_auth(self):
        """Test POST /api/admin/jobs - should return 401 without auth"""
        try:
            job_data = {
                "company_name": "Empresa XPTO",
                "job_title": "Assistente",
                "email": "rh@xpto.com",
                "phone": "67999999999",
                "requirements": "Ensino médio",
                "description": "Auxiliar nas rotinas",
                "city": "tres_lagoas"
            }
            response = await self.client.post(f"{BACKEND_URL}/admin/jobs", json=job_data)
            
            if response.status_code == 401:
                self.log_result("POST /api/admin/jobs (401)", "PASS", 
                              "Returns 401 without authentication")
            else:
                self.log_result("POST /api/admin/jobs (401)", "FAIL", 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("POST /api/admin/jobs (401)", "ERROR", str(e))
    
    async def test_update_job_without_auth(self):
        """Test PUT /api/admin/jobs/{job_id} - should return 401 without auth"""
        try:
            fake_job_id = "job_test123"
            job_data = {
                "job_title": "Assistente Administrativo"
            }
            response = await self.client.put(f"{BACKEND_URL}/admin/jobs/{fake_job_id}", json=job_data)
            
            if response.status_code == 401:
                self.log_result("PUT /api/admin/jobs/{job_id} (401)", "PASS", 
                              "Returns 401 without authentication")
            else:
                self.log_result("PUT /api/admin/jobs/{job_id} (401)", "FAIL", 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("PUT /api/admin/jobs/{job_id} (401)", "ERROR", str(e))
    
    async def test_delete_job_without_auth(self):
        """Test DELETE /api/admin/jobs/{job_id} - should return 401 without auth"""
        try:
            fake_job_id = "job_test123"
            response = await self.client.delete(f"{BACKEND_URL}/admin/jobs/{fake_job_id}")
            
            if response.status_code == 401:
                self.log_result("DELETE /api/admin/jobs/{job_id} (401)", "PASS", 
                              "Returns 401 without authentication")
            else:
                self.log_result("DELETE /api/admin/jobs/{job_id} (401)", "FAIL", 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("DELETE /api/admin/jobs/{job_id} (401)", "ERROR", str(e))
    
    async def test_get_all_jobs_without_auth(self):
        """Test GET /api/admin/all-jobs - should return 401 without auth"""
        try:
            response = await self.client.get(f"{BACKEND_URL}/admin/all-jobs")
            
            if response.status_code == 401:
                self.log_result("GET /api/admin/all-jobs (401)", "PASS", 
                              "Returns 401 without authentication")
            else:
                self.log_result("GET /api/admin/all-jobs (401)", "FAIL", 
                              f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/admin/all-jobs (401)", "ERROR", str(e))
    
    async def run_all_tests(self):
        """Run all job endpoint tests"""
        print(f"💼 Starting AchaServiço Job Listings Tests")
        print(f"🌐 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test 1: GET /api/jobs (empty)
        print("\n1️⃣ Testing GET /api/jobs (empty)...")
        await self.test_get_jobs_empty()
        
        # Test 2: GET /api/jobs with city filter
        print("\n2️⃣ Testing GET /api/jobs?city=tres_lagoas...")
        await self.test_get_jobs_with_city_filter()
        
        # Test 3: GET /api/jobs with search filter
        print("\n3️⃣ Testing GET /api/jobs?search=assistente...")
        await self.test_get_jobs_with_search_filter()
        
        # Test 4: GET /api/jobs/{job_id} (404)
        print("\n4️⃣ Testing GET /api/jobs/{job_id} (404)...")
        await self.test_get_job_by_id_not_found()
        
        # Test 5: POST /api/admin/jobs (401)
        print("\n5️⃣ Testing POST /api/admin/jobs (401)...")
        await self.test_create_job_without_auth()
        
        # Test 6: PUT /api/admin/jobs/{job_id} (401)
        print("\n6️⃣ Testing PUT /api/admin/jobs/{job_id} (401)...")
        await self.test_update_job_without_auth()
        
        # Test 7: DELETE /api/admin/jobs/{job_id} (401)
        print("\n7️⃣ Testing DELETE /api/admin/jobs/{job_id} (401)...")
        await self.test_delete_job_without_auth()
        
        # Test 8: GET /api/admin/all-jobs (401)
        print("\n8️⃣ Testing GET /api/admin/all-jobs (401)...")
        await self.test_get_all_jobs_without_auth()
        
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
    tester = JobTester()
    try:
        results = await tester.run_all_tests()
        return results
    finally:
        await tester.close()

if __name__ == "__main__":
    results = asyncio.run(main())
