#!/usr/bin/env python3
"""
AchaServiço - Test New Features
Tests: 1) Cascading delete, 2) Toggle job active/inactive, 3) Company logo, 4) Job attachment
"""

import asyncio
import httpx
import base64
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Backend URL
BACKEND_URL = "https://service-finder-416.preview.emergentagent.com/api"
ADMIN_EMAIL = "israel.moraes03@gmail.com"

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "achaservico"

class FeatureTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        self.mongo_client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.mongo_client[DB_NAME]
        self.admin_token = None
        self.company_user_token = None
        self.company_user_id = None
        self.company_user_email = None
        self.test_results = []
        
    async def close(self):
        await self.client.aclose()
        self.mongo_client.close()
    
    def log(self, test_name: str, status: str, details: str = ""):
        """Log test result"""
        emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{emoji} {test_name}: {status}")
        if details:
            print(f"   {details}")
        self.test_results.append({
            "test": test_name,
            "status": status,
            "details": details
        })
    
    async def setup_auth(self):
        """Setup authentication for admin and company user"""
        print("\n🔐 Setting up authentication...")
        
        # Create admin user and session
        admin_user_id = str(uuid.uuid4())
        admin_session_token = str(uuid.uuid4())
        
        # Check if admin user exists
        existing_admin = await self.db.users.find_one({"email": ADMIN_EMAIL})
        if existing_admin:
            admin_user_id = existing_admin["user_id"]
        else:
            await self.db.users.insert_one({
                "user_id": admin_user_id,
                "email": ADMIN_EMAIL,
                "name": "Admin Test",
                "picture": None,
                "phone": None,
                "created_at": datetime.now(timezone.utc),
                "is_provider": False,
                "favorite_providers": [],
                "blocked": False
            })
        
        # Create admin session
        await self.db.user_sessions.delete_many({"user_id": admin_user_id})
        await self.db.user_sessions.insert_one({
            "session_token": admin_session_token,
            "user_id": admin_user_id,
            "email": ADMIN_EMAIL,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
        })
        self.admin_token = admin_session_token
        print(f"✅ Admin session created: {admin_session_token[:20]}...")
        
        # Create company user and session
        self.company_user_id = str(uuid.uuid4())
        self.company_user_email = f"company_test_{uuid.uuid4().hex[:8]}@test.com"
        company_session_token = str(uuid.uuid4())
        
        await self.db.users.insert_one({
            "user_id": self.company_user_id,
            "email": self.company_user_email,
            "name": "Company Test User",
            "picture": None,
            "phone": "67999887766",
            "created_at": datetime.now(timezone.utc),
            "is_provider": False,
            "favorite_providers": [],
            "blocked": False
        })
        
        await self.db.user_sessions.insert_one({
            "session_token": company_session_token,
            "user_id": self.company_user_id,
            "email": self.company_user_email,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
        })
        self.company_user_token = company_session_token
        print(f"✅ Company user session created: {company_session_token[:20]}...")
    
    def get_test_image_base64(self) -> str:
        """Generate a small test image in base64"""
        # 1x1 red pixel PNG
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    def get_test_pdf_base64(self) -> str:
        """Generate a small test PDF in base64"""
        # Minimal PDF
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
        return "data:application/pdf;base64," + base64.b64encode(pdf_content).decode()
    
    async def test_company_logo_upload(self):
        """Test P2: Company logo upload and auto-population in jobs"""
        print("\n📸 Testing Company Logo Upload...")
        
        try:
            # 1. Register company with logo
            logo_base64 = self.get_test_image_base64()
            company_data = {
                "company_name": f"Test Company Logo {uuid.uuid4().hex[:6]}",
                "cnpj": "12345678000199",
                "email": self.company_user_email,
                "phone": "67999887766",
                "city": "tres_lagoas",
                "logo": logo_base64
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/companies/register",
                json=company_data,
                headers={"Authorization": f"Bearer {self.company_user_token}"}
            )
            
            if response.status_code != 200:
                self.log("Company Logo - Register with logo", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            result = response.json()
            company_id = result.get("company_id")
            self.log("Company Logo - Register with logo", "PASS", 
                    f"Company registered: {company_id}")
            
            # 2. Approve the company (as admin)
            response = await self.client.put(
                f"{BACKEND_URL}/admin/companies/{company_id}/approve",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            if response.status_code != 200:
                self.log("Company Logo - Approve company", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            self.log("Company Logo - Approve company", "PASS", "Company approved")
            
            # 3. Get company and verify logo is a Cloudinary URL
            response = await self.client.get(
                f"{BACKEND_URL}/companies/my",
                headers={"Authorization": f"Bearer {self.company_user_token}"}
            )
            
            if response.status_code != 200:
                self.log("Company Logo - Get company", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            company = response.json().get("company", {})
            logo_url = company.get("logo")
            
            if not logo_url:
                self.log("Company Logo - Verify logo URL", "FAIL", "Logo URL is missing")
                return
            
            if logo_url.startswith("http"):
                self.log("Company Logo - Verify logo URL", "PASS", 
                        f"Logo uploaded to Cloudinary: {logo_url[:50]}...")
            else:
                self.log("Company Logo - Verify logo URL", "FAIL", 
                        f"Logo is not a URL: {logo_url[:50]}...")
                return
            
            # 4. Create a job and verify company_logo is auto-populated
            job_data = {
                "company_name": company_data["company_name"],
                "job_title": "Test Job with Logo",
                "email": self.company_user_email,
                "phone": "67999887766",
                "requirements": "Test requirements",
                "description": "Test job description",
                "city": "tres_lagoas"
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/jobs/submit",
                json=job_data,
                headers={"Authorization": f"Bearer {self.company_user_token}"}
            )
            
            if response.status_code != 200:
                self.log("Company Logo - Create job", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            job_result = response.json()
            job_id = job_result.get("job_id")
            self.log("Company Logo - Create job", "PASS", f"Job created: {job_id}")
            
            # 5. Get job and verify company_logo is populated
            response = await self.client.get(f"{BACKEND_URL}/jobs/{job_id}")
            
            if response.status_code != 200:
                self.log("Company Logo - Get job", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            job = response.json()
            job_logo = job.get("company_logo")
            
            if not job_logo:
                self.log("Company Logo - Verify job has company_logo", "FAIL", 
                        "company_logo is missing in job")
                return
            
            if job_logo == logo_url:
                self.log("Company Logo - Verify job has company_logo", "PASS", 
                        "Job has correct company_logo from company")
            else:
                self.log("Company Logo - Verify job has company_logo", "FAIL", 
                        f"Job logo mismatch: {job_logo[:50]}... vs {logo_url[:50]}...")
            
            # 6. Update company logo
            new_logo = self.get_test_image_base64()
            update_data = {
                "company_name": company_data["company_name"],
                "cnpj": company_data["cnpj"],
                "email": company_data["email"],
                "phone": company_data["phone"],
                "city": company_data["city"],
                "logo": new_logo
            }
            
            response = await self.client.put(
                f"{BACKEND_URL}/companies/my",
                json=update_data,
                headers={"Authorization": f"Bearer {self.company_user_token}"}
            )
            
            if response.status_code != 200:
                self.log("Company Logo - Update logo", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            self.log("Company Logo - Update logo", "PASS", "Logo updated successfully")
            
        except Exception as e:
            self.log("Company Logo - Exception", "FAIL", str(e))
    
    async def test_job_attachment(self):
        """Test P2: Job attachment upload, update, and removal"""
        print("\n📎 Testing Job Attachment...")
        
        try:
            # 1. Register and approve a company first
            company_data = {
                "company_name": f"Test Company Attachment {uuid.uuid4().hex[:6]}",
                "cnpj": "98765432000188",
                "email": f"attachment_test_{uuid.uuid4().hex[:8]}@test.com",
                "phone": "67999776655",
                "city": "tres_lagoas"
            }
            
            # Create a new user for this test
            test_user_id = str(uuid.uuid4())
            test_user_email = company_data["email"]
            test_session_token = str(uuid.uuid4())
            
            await self.db.users.insert_one({
                "user_id": test_user_id,
                "email": test_user_email,
                "name": "Attachment Test User",
                "created_at": datetime.now(timezone.utc),
                "is_provider": False,
                "blocked": False
            })
            
            await self.db.user_sessions.insert_one({
                "session_token": test_session_token,
                "user_id": test_user_id,
                "email": test_user_email,
                "created_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
            })
            
            # Register company
            response = await self.client.post(
                f"{BACKEND_URL}/companies/register",
                json=company_data,
                headers={"Authorization": f"Bearer {test_session_token}"}
            )
            
            if response.status_code != 200:
                self.log("Job Attachment - Register company", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            company_id = response.json().get("company_id")
            
            # Approve company
            response = await self.client.put(
                f"{BACKEND_URL}/admin/companies/{company_id}/approve",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            if response.status_code != 200:
                self.log("Job Attachment - Approve company", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            self.log("Job Attachment - Setup company", "PASS", "Company created and approved")
            
            # 2. Create job with attachment
            pdf_base64 = self.get_test_pdf_base64()
            job_data = {
                "company_name": company_data["company_name"],
                "job_title": "Job with Attachment",
                "email": test_user_email,
                "phone": "67999776655",
                "requirements": "Test requirements",
                "description": "Test job with attachment",
                "city": "tres_lagoas",
                "attachment_base64": pdf_base64,
                "attachment_name": "job_requirements.pdf"
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/jobs/submit",
                json=job_data,
                headers={"Authorization": f"Bearer {test_session_token}"}
            )
            
            if response.status_code != 200:
                self.log("Job Attachment - Create job with attachment", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            job_id = response.json().get("job_id")
            self.log("Job Attachment - Create job with attachment", "PASS", 
                    f"Job created: {job_id}")
            
            # 3. Get job and verify attachment fields
            response = await self.client.get(f"{BACKEND_URL}/jobs/{job_id}")
            
            if response.status_code != 200:
                self.log("Job Attachment - Get job", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            job = response.json()
            attachment_url = job.get("attachment_url")
            attachment_name = job.get("attachment_name")
            
            if not attachment_url:
                self.log("Job Attachment - Verify attachment_url", "FAIL", 
                        "attachment_url is missing")
                return
            
            if not attachment_name:
                self.log("Job Attachment - Verify attachment_name", "FAIL", 
                        "attachment_name is missing")
                return
            
            if attachment_url.startswith("http"):
                self.log("Job Attachment - Verify attachment_url", "PASS", 
                        f"Attachment uploaded: {attachment_url[:50]}...")
            else:
                self.log("Job Attachment - Verify attachment_url", "FAIL", 
                        f"Attachment URL invalid: {attachment_url[:50]}...")
                return
            
            if attachment_name == "job_requirements.pdf":
                self.log("Job Attachment - Verify attachment_name", "PASS", 
                        f"Attachment name correct: {attachment_name}")
            else:
                self.log("Job Attachment - Verify attachment_name", "FAIL", 
                        f"Attachment name mismatch: {attachment_name}")
            
            # 4. Update job with new attachment
            new_pdf = self.get_test_pdf_base64()
            update_data = {
                "attachment_base64": new_pdf,
                "attachment_name": "updated_requirements.pdf"
            }
            
            response = await self.client.put(
                f"{BACKEND_URL}/companies/jobs/{job_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {test_session_token}"}
            )
            
            if response.status_code != 200:
                self.log("Job Attachment - Update attachment", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            self.log("Job Attachment - Update attachment", "PASS", "Attachment updated")
            
            # 5. Verify updated attachment
            response = await self.client.get(f"{BACKEND_URL}/jobs/{job_id}")
            job = response.json()
            
            if job.get("attachment_name") == "updated_requirements.pdf":
                self.log("Job Attachment - Verify updated attachment", "PASS", 
                        "Attachment name updated correctly")
            else:
                self.log("Job Attachment - Verify updated attachment", "FAIL", 
                        f"Attachment name not updated: {job.get('attachment_name')}")
            
            # 6. Remove attachment
            remove_data = {
                "remove_attachment": True
            }
            
            response = await self.client.put(
                f"{BACKEND_URL}/companies/jobs/{job_id}",
                json=remove_data,
                headers={"Authorization": f"Bearer {test_session_token}"}
            )
            
            if response.status_code != 200:
                self.log("Job Attachment - Remove attachment", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            self.log("Job Attachment - Remove attachment", "PASS", "Attachment removed")
            
            # 7. Verify attachment is removed
            response = await self.client.get(f"{BACKEND_URL}/jobs/{job_id}")
            job = response.json()
            
            if job.get("attachment_url") is None and job.get("attachment_name") is None:
                self.log("Job Attachment - Verify attachment removed", "PASS", 
                        "Attachment fields are None")
            else:
                self.log("Job Attachment - Verify attachment removed", "FAIL", 
                        f"Attachment not removed: url={job.get('attachment_url')}, name={job.get('attachment_name')}")
            
        except Exception as e:
            self.log("Job Attachment - Exception", "FAIL", str(e))
    
    async def test_toggle_job_active(self):
        """Test P1: Toggle job active/inactive status"""
        print("\n🔄 Testing Toggle Job Active/Inactive...")
        
        try:
            # 1. Register and approve a company
            company_data = {
                "company_name": f"Test Company Toggle {uuid.uuid4().hex[:6]}",
                "cnpj": "11122233000144",
                "email": f"toggle_test_{uuid.uuid4().hex[:8]}@test.com",
                "phone": "67999665544",
                "city": "tres_lagoas"
            }
            
            # Create user
            test_user_id = str(uuid.uuid4())
            test_user_email = company_data["email"]
            test_session_token = str(uuid.uuid4())
            
            await self.db.users.insert_one({
                "user_id": test_user_id,
                "email": test_user_email,
                "name": "Toggle Test User",
                "created_at": datetime.now(timezone.utc),
                "is_provider": False,
                "blocked": False
            })
            
            await self.db.user_sessions.insert_one({
                "session_token": test_session_token,
                "user_id": test_user_id,
                "email": test_user_email,
                "created_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
            })
            
            # Register and approve company
            response = await self.client.post(
                f"{BACKEND_URL}/companies/register",
                json=company_data,
                headers={"Authorization": f"Bearer {test_session_token}"}
            )
            
            company_id = response.json().get("company_id")
            
            await self.client.put(
                f"{BACKEND_URL}/admin/companies/{company_id}/approve",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            self.log("Toggle Job - Setup company", "PASS", "Company created and approved")
            
            # 2. Create a job (should be active by default)
            job_data = {
                "company_name": company_data["company_name"],
                "job_title": "Job to Toggle",
                "email": test_user_email,
                "phone": "67999665544",
                "requirements": "Test requirements",
                "description": "Test job for toggle",
                "city": "tres_lagoas"
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/jobs/submit",
                json=job_data,
                headers={"Authorization": f"Bearer {test_session_token}"}
            )
            
            if response.status_code != 200:
                self.log("Toggle Job - Create job", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            job_id = response.json().get("job_id")
            self.log("Toggle Job - Create job", "PASS", f"Job created: {job_id}")
            
            # 3. Verify job is active
            response = await self.client.get(f"{BACKEND_URL}/jobs/{job_id}")
            job = response.json()
            
            if job.get("is_active") == True:
                self.log("Toggle Job - Verify initial active status", "PASS", 
                        "Job is active by default")
            else:
                self.log("Toggle Job - Verify initial active status", "FAIL", 
                        f"Job is not active: {job.get('is_active')}")
            
            # 4. Toggle to inactive
            response = await self.client.put(
                f"{BACKEND_URL}/companies/jobs/{job_id}/toggle",
                headers={"Authorization": f"Bearer {test_session_token}"}
            )
            
            if response.status_code != 200:
                self.log("Toggle Job - Toggle to inactive", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            result = response.json()
            if result.get("is_active") == False:
                self.log("Toggle Job - Toggle to inactive", "PASS", 
                        "Job toggled to inactive")
            else:
                self.log("Toggle Job - Toggle to inactive", "FAIL", 
                        f"Job not inactive: {result.get('is_active')}")
                return
            
            # 5. Verify job is not in public job list
            response = await self.client.get(f"{BACKEND_URL}/jobs")
            jobs = response.json()
            
            job_ids = [j.get("job_id") for j in jobs]
            if job_id not in job_ids:
                self.log("Toggle Job - Verify inactive job not in list", "PASS", 
                        "Inactive job not visible in public list")
            else:
                self.log("Toggle Job - Verify inactive job not in list", "FAIL", 
                        "Inactive job still visible in public list")
            
            # 6. Toggle back to active
            response = await self.client.put(
                f"{BACKEND_URL}/companies/jobs/{job_id}/toggle",
                headers={"Authorization": f"Bearer {test_session_token}"}
            )
            
            if response.status_code != 200:
                self.log("Toggle Job - Toggle back to active", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            result = response.json()
            if result.get("is_active") == True:
                self.log("Toggle Job - Toggle back to active", "PASS", 
                        "Job toggled back to active")
            else:
                self.log("Toggle Job - Toggle back to active", "FAIL", 
                        f"Job not active: {result.get('is_active')}")
                return
            
            # 7. Verify job is back in public list
            response = await self.client.get(f"{BACKEND_URL}/jobs")
            jobs = response.json()
            
            job_ids = [j.get("job_id") for j in jobs]
            if job_id in job_ids:
                self.log("Toggle Job - Verify active job in list", "PASS", 
                        "Active job visible in public list")
            else:
                self.log("Toggle Job - Verify active job in list", "FAIL", 
                        "Active job not visible in public list")
            
        except Exception as e:
            self.log("Toggle Job - Exception", "FAIL", str(e))
    
    async def test_cascading_delete(self):
        """Test P0: Cascading delete - deleting company also deletes its jobs"""
        print("\n🗑️  Testing Cascading Delete...")
        
        try:
            # 1. Register and approve a company
            company_data = {
                "company_name": f"Test Company Delete {uuid.uuid4().hex[:6]}",
                "cnpj": "55566677000133",
                "email": f"delete_test_{uuid.uuid4().hex[:8]}@test.com",
                "phone": "67999554433",
                "city": "tres_lagoas"
            }
            
            # Create user
            test_user_id = str(uuid.uuid4())
            test_user_email = company_data["email"]
            test_session_token = str(uuid.uuid4())
            
            await self.db.users.insert_one({
                "user_id": test_user_id,
                "email": test_user_email,
                "name": "Delete Test User",
                "created_at": datetime.now(timezone.utc),
                "is_provider": False,
                "blocked": False
            })
            
            await self.db.user_sessions.insert_one({
                "session_token": test_session_token,
                "user_id": test_user_id,
                "email": test_user_email,
                "created_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
            })
            
            # Register company
            response = await self.client.post(
                f"{BACKEND_URL}/companies/register",
                json=company_data,
                headers={"Authorization": f"Bearer {test_session_token}"}
            )
            
            if response.status_code != 200:
                self.log("Cascading Delete - Register company", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            company_id = response.json().get("company_id")
            
            # Approve company
            response = await self.client.put(
                f"{BACKEND_URL}/admin/companies/{company_id}/approve",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            if response.status_code != 200:
                self.log("Cascading Delete - Approve company", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            self.log("Cascading Delete - Setup company", "PASS", 
                    f"Company created: {company_id}")
            
            # 2. Create multiple jobs for this company
            job_ids = []
            for i in range(3):
                job_data = {
                    "company_name": company_data["company_name"],
                    "job_title": f"Job {i+1} for Deletion Test",
                    "email": test_user_email,
                    "phone": "67999554433",
                    "requirements": f"Requirements {i+1}",
                    "description": f"Job {i+1} description",
                    "city": "tres_lagoas"
                }
                
                response = await self.client.post(
                    f"{BACKEND_URL}/jobs/submit",
                    json=job_data,
                    headers={"Authorization": f"Bearer {test_session_token}"}
                )
                
                if response.status_code != 200:
                    self.log(f"Cascading Delete - Create job {i+1}", "FAIL", 
                            f"Status {response.status_code}: {response.text}")
                    return
                
                job_id = response.json().get("job_id")
                job_ids.append(job_id)
            
            self.log("Cascading Delete - Create jobs", "PASS", 
                    f"Created {len(job_ids)} jobs")
            
            # 3. Verify jobs exist
            for job_id in job_ids:
                response = await self.client.get(f"{BACKEND_URL}/jobs/{job_id}")
                if response.status_code != 200:
                    self.log("Cascading Delete - Verify jobs exist", "FAIL", 
                            f"Job {job_id} not found")
                    return
            
            self.log("Cascading Delete - Verify jobs exist", "PASS", 
                    "All jobs exist before deletion")
            
            # 4. Delete the company (as admin)
            response = await self.client.delete(
                f"{BACKEND_URL}/admin/companies/{company_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            if response.status_code != 200:
                self.log("Cascading Delete - Delete company", "FAIL", 
                        f"Status {response.status_code}: {response.text}")
                return
            
            result = response.json()
            self.log("Cascading Delete - Delete company", "PASS", 
                    f"Company deleted: {result.get('message')}")
            
            # 5. Verify company is deleted
            response = await self.client.get(
                f"{BACKEND_URL}/companies/my",
                headers={"Authorization": f"Bearer {test_session_token}"}
            )
            
            company_result = response.json()
            if not company_result.get("has_company"):
                self.log("Cascading Delete - Verify company deleted", "PASS", 
                        "Company no longer exists")
            else:
                self.log("Cascading Delete - Verify company deleted", "FAIL", 
                        "Company still exists")
            
            # 6. Verify all jobs are deleted
            deleted_count = 0
            for job_id in job_ids:
                response = await self.client.get(f"{BACKEND_URL}/jobs/{job_id}")
                if response.status_code == 404:
                    deleted_count += 1
            
            if deleted_count == len(job_ids):
                self.log("Cascading Delete - Verify jobs deleted", "PASS", 
                        f"All {len(job_ids)} jobs deleted")
            else:
                self.log("Cascading Delete - Verify jobs deleted", "FAIL", 
                        f"Only {deleted_count}/{len(job_ids)} jobs deleted")
            
        except Exception as e:
            self.log("Cascading Delete - Exception", "FAIL", str(e))
    
    async def run_all_tests(self):
        """Run all feature tests"""
        print("=" * 70)
        print("🧪 AchaServiço - New Features Testing")
        print("=" * 70)
        
        # Setup
        await self.setup_auth()
        
        # Run tests in priority order
        await self.test_cascading_delete()  # P0
        await self.test_toggle_job_active()  # P1
        await self.test_company_logo_upload()  # P2
        await self.test_job_attachment()  # P2
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 TEST SUMMARY")
        print("=" * 70)
        
        passed = len([r for r in self.test_results if r["status"] == "PASS"])
        failed = len([r for r in self.test_results if r["status"] == "FAIL"])
        total = len(self.test_results)
        
        print(f"✅ PASSED: {passed}/{total}")
        print(f"❌ FAILED: {failed}/{total}")
        
        if failed > 0:
            print("\n🚨 FAILED TESTS:")
            for result in self.test_results:
                if result["status"] == "FAIL":
                    print(f"   ❌ {result['test']}")
                    if result["details"]:
                        print(f"      {result['details']}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return {
            "passed": passed,
            "failed": failed,
            "total": total,
            "success_rate": success_rate
        }

async def main():
    """Main test runner"""
    tester = FeatureTester()
    try:
        results = await tester.run_all_tests()
        return results
    finally:
        await tester.close()

if __name__ == "__main__":
    results = asyncio.run(main())
