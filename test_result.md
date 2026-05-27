#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message"
##     -timestamp: "2025-01-01 00:00:00"
##     -context: "What was happening when this message was sent"

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

user_problem_statement: "AchaServiço app - Implement 4 improvements for the Jobs/Vagas system: 1) Cascading delete (company delete also deletes its jobs), 2) Toggle pause/activate for individual jobs, 3) Company logo/photo upload, 4) File/material attachment for job listings"

backend:
  - task: "Cascading delete - Delete company also deletes its jobs"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Implemented cascading delete in admin_delete_company endpoint. When a company is deleted, all jobs with submitted_by matching the company user_email are also deleted."
        - working: true
          agent: "testing"
          comment: "✅ TESTED - All tests passed (6/6). Created company with 3 jobs, deleted company via DELETE /api/admin/companies/{company_id}, verified all 3 jobs were cascaded deleted. Company and all associated jobs successfully removed from database."

  - task: "Toggle job active/inactive status"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added PUT /api/companies/jobs/{job_id}/toggle endpoint that flips the is_active boolean on a job."
        - working: true
          agent: "testing"
          comment: "✅ TESTED - All tests passed (7/7). Created job (active by default), toggled to inactive via PUT /api/companies/jobs/{job_id}/toggle, verified job not visible in public GET /api/jobs list, toggled back to active, verified job visible again. Toggle functionality working correctly."

  - task: "Company logo upload via Cloudinary"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added logo field to Company model. Register and update endpoints upload base64 logo to Cloudinary. Job creation auto-copies company_logo to job documents."
        - working: true
          agent: "testing"
          comment: "✅ TESTED - All tests passed (6/6). Registered company with base64 logo via POST /api/companies/register, verified logo uploaded to Cloudinary (URL returned), created job and verified company_logo auto-populated from company record, updated company logo via PUT /api/companies/my. Logo upload and auto-population working correctly."

  - task: "File/material attachment for job listings"
    implemented: true
    working: true
    file: "server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added upload_file_to_cloudinary function for raw files (PDF/DOC). Job create and update endpoints handle attachment_base64/attachment_name fields. Added remove_attachment flag to JobUpdate."
        - working: true
          agent: "testing"
          comment: "✅ TESTED - All tests passed (8/8). Created job with PDF attachment via POST /api/jobs/submit (attachment_base64 + attachment_name), verified attachment_url (Cloudinary) and attachment_name returned in GET /api/jobs/{job_id}, updated attachment via PUT /api/companies/jobs/{job_id}, removed attachment using remove_attachment flag. All attachment operations working correctly."

frontend:
  - task: "Company dashboard - Toggle pause/activate jobs"
    implemented: true
    working: "NA"
    file: "app/company/dashboard.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added Pausar/Ativar toggle button per job card. Calls PUT /api/companies/jobs/{job_id}/toggle."

  - task: "Company dashboard - Logo picker and display"
    implemented: true
    working: "NA"
    file: "app/company/dashboard.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added expo-image-picker for company logo. Shows logo in company info card and sends base64 to backend."

  - task: "Company dashboard - File attachment for jobs"
    implemented: true
    working: "NA"
    file: "app/company/dashboard.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added expo-document-picker for job attachments. Shows attachment preview and supports remove."

  - task: "Job detail page - Show company logo and attachment"
    implemented: true
    working: "NA"
    file: "app/jobs/[id].tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Updated to show company_logo Image instead of generic icon. Added Material Anexo section with download link."

  - task: "Home page - Show company logo on job cards"
    implemented: true
    working: "NA"
    file: "app/index.tsx"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Job cards now show company_logo Image when available, falling back to default icon."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Implemented all 4 backend features. Please test: 1) Cascading delete when admin deletes company, 2) Toggle job active/inactive, 3) Company logo upload to Cloudinary, 4) Job attachment upload. Note: Auth is required - you'll need to create a session first via POST /api/auth/session or POST /api/auth/google-signin. Admin email is israel.moraes03@gmail.com. All company endpoints require auth, admin endpoints also require admin role."
      timestamp: "2026-05-27 20:35:00"
      context: "All 4 backend features implemented. Need to test endpoints."
    - agent: "testing"
      message: "✅ ALL BACKEND TESTS PASSED (27/27 - 100% success rate). Tested all 4 features: 1) Cascading delete working - company deletion cascades to all associated jobs, 2) Toggle job active/inactive working - jobs correctly hidden/shown in public list, 3) Company logo upload working - logos uploaded to Cloudinary and auto-populated in jobs, 4) Job attachments working - files uploaded to Cloudinary with proper create/update/remove operations. All endpoints functioning correctly with proper authentication. Backend implementation is complete and fully functional."
      timestamp: "2026-05-27 20:37:00"
      context: "Completed comprehensive backend testing of all 4 new features using test_new_features.py"
