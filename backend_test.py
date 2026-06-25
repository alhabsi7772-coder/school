#!/usr/bin/env python3
"""
Backend Test Suite for Resource Bundles Feature
مدرسة الخيرات - School Platform
"""

import requests
import json
import io
from typing import Dict, Optional

# Configuration
BASE_URL = "https://school-hub-878.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "teacher123"

# Test state
state = {
    "token": None,
    "resource_ids": [],
    "bundle_id": None,
    "bundle_code": None,
    "access_id": None,
    "library_code": None,
    "library_access_id": None,
}

# Test results
results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}


def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"   {details}")
    results["tests"].append({"name": name, "passed": passed, "details": details})
    if passed:
        results["passed"] += 1
    else:
        results["failed"] += 1


def login() -> str:
    """Login and get token"""
    print("\n=== Setup: Login ===")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        token = resp.json().get("token")
        log_test("Login admin/teacher123", True, f"Token received")
        return token
    else:
        log_test("Login admin/teacher123", False, f"Status {resp.status_code}: {resp.text}")
        return None


def upload_resource(token: str, filename: str, title: str, grades: str) -> Optional[str]:
    """Upload a test resource"""
    files = {
        'file': (filename, io.BytesIO(f"Test content for {filename}".encode()), 'text/plain')
    }
    data = {
        'title': title,
        'description': f'Test resource {title}',
        'grades': grades,
        'is_active': 'true'
    }
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/resources/upload", files=files, data=data, headers=headers)
    if resp.status_code == 200:
        resource_id = resp.json().get("id")
        print(f"   Uploaded {filename} → {resource_id}")
        return resource_id
    else:
        print(f"   Failed to upload {filename}: {resp.status_code} {resp.text}")
        return None


def test_setup():
    """Setup: Login and upload 3 resources"""
    print("\n" + "="*80)
    print("SETUP: Login and Upload Resources")
    print("="*80)
    
    # Login
    token = login()
    if not token:
        return False
    state["token"] = token
    
    # Upload 3 resources
    print("\n=== Setup: Upload 3 Resources ===")
    r1 = upload_resource(token, "r1.txt", "ملف 1", "الخامس")
    r2 = upload_resource(token, "r2.txt", "ملف 2", "السابع")
    r3 = upload_resource(token, "r3.txt", "ملف 3", "")  # Open to all
    
    if r1 and r2 and r3:
        state["resource_ids"] = [r1, r2, r3]
        log_test("Upload 3 resources", True, f"R1={r1[:8]}, R2={r2[:8]}, R3={r3[:8]}")
        return True
    else:
        log_test("Upload 3 resources", False, "Failed to upload all resources")
        return False


def test_create_bundle():
    """Test 3-6: Create bundle with various scenarios"""
    print("\n" + "="*80)
    print("TEST: Create Bundle")
    print("="*80)
    
    token = state["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 3: Create bundle with 3 resources
    print("\n--- Test 3: Create bundle with valid resources ---")
    resp = requests.post(f"{BASE_URL}/bundles", json={
        "title": "مراجعة الفصل الأول",
        "resource_ids": state["resource_ids"]
    }, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        bundle_id = data.get("id")
        bundle_code = data.get("code")
        resource_ids = data.get("resource_ids", [])
        is_active = data.get("is_active")
        
        if bundle_id and bundle_code and len(bundle_code) == 6 and len(resource_ids) == 3 and is_active:
            state["bundle_id"] = bundle_id
            state["bundle_code"] = bundle_code
            log_test("Create bundle with 3 resources", True, 
                    f"ID={bundle_id[:8]}, Code={bundle_code}, Resources={len(resource_ids)}, Active={is_active}")
        else:
            log_test("Create bundle with 3 resources", False, 
                    f"Invalid response: code={bundle_code}, resources={len(resource_ids)}, active={is_active}")
    else:
        log_test("Create bundle with 3 resources", False, f"Status {resp.status_code}: {resp.text}")
    
    # Test 4: Create bundle with empty resource_ids
    print("\n--- Test 4: Create bundle with empty resource_ids ---")
    resp = requests.post(f"{BASE_URL}/bundles", json={
        "title": "x",
        "resource_ids": []
    }, headers=headers)
    
    if resp.status_code == 400:
        log_test("Create bundle with empty resource_ids → 400", True, f"Error: {resp.json().get('detail', '')}")
    else:
        log_test("Create bundle with empty resource_ids → 400", False, f"Expected 400, got {resp.status_code}")
    
    # Test 5: Create bundle with mix of valid + invalid IDs
    print("\n--- Test 5: Create bundle with mix of valid + invalid IDs ---")
    import uuid
    fake_id = str(uuid.uuid4())
    resp = requests.post(f"{BASE_URL}/bundles", json={
        "title": "Mixed IDs",
        "resource_ids": [state["resource_ids"][0], fake_id]
    }, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        resource_ids = data.get("resource_ids", [])
        if len(resource_ids) == 1 and resource_ids[0] == state["resource_ids"][0]:
            log_test("Create bundle with mixed IDs → only valid IDs kept", True, 
                    f"Valid IDs: {len(resource_ids)}")
            # Clean up this test bundle
            requests.delete(f"{BASE_URL}/bundles/{data['id']}", headers=headers)
        else:
            log_test("Create bundle with mixed IDs → only valid IDs kept", False, 
                    f"Expected 1 valid ID, got {len(resource_ids)}")
    else:
        log_test("Create bundle with mixed IDs → only valid IDs kept", False, 
                f"Status {resp.status_code}: {resp.text}")
    
    # Test 6: Create bundle with only invalid IDs
    print("\n--- Test 6: Create bundle with only invalid IDs ---")
    fake_id1 = str(uuid.uuid4())
    fake_id2 = str(uuid.uuid4())
    resp = requests.post(f"{BASE_URL}/bundles", json={
        "title": "Invalid IDs",
        "resource_ids": [fake_id1, fake_id2]
    }, headers=headers)
    
    if resp.status_code == 400:
        error_msg = resp.json().get("detail", "")
        if "لا توجد موارد صالحة" in error_msg:
            log_test("Create bundle with only invalid IDs → 400", True, f"Error: {error_msg}")
        else:
            log_test("Create bundle with only invalid IDs → 400", True, f"Got 400 with: {error_msg}")
    else:
        log_test("Create bundle with only invalid IDs → 400", False, f"Expected 400, got {resp.status_code}")


def test_list_and_update():
    """Test 7-10: List and update bundles"""
    print("\n" + "="*80)
    print("TEST: List and Update Bundle")
    print("="*80)
    
    token = state["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 7: List bundles
    print("\n--- Test 7: List bundles ---")
    resp = requests.get(f"{BASE_URL}/bundles", headers=headers)
    
    if resp.status_code == 200:
        bundles = resp.json()
        found = False
        for b in bundles:
            if b.get("id") == state["bundle_id"]:
                found = True
                actual_count = b.get("actual_count")
                if actual_count == 3:
                    log_test("List bundles → contains new bundle with actual_count=3", True, 
                            f"Bundle found with actual_count={actual_count}")
                else:
                    log_test("List bundles → contains new bundle with actual_count=3", False, 
                            f"Expected actual_count=3, got {actual_count}")
                break
        if not found:
            log_test("List bundles → contains new bundle with actual_count=3", False, 
                    "Bundle not found in list")
    else:
        log_test("List bundles → contains new bundle with actual_count=3", False, 
                f"Status {resp.status_code}: {resp.text}")
    
    # Test 8: Update bundle title
    print("\n--- Test 8: Update bundle title ---")
    resp = requests.put(f"{BASE_URL}/bundles/{state['bundle_id']}", json={
        "title": "مراجعة محدثة"
    }, headers=headers)
    
    if resp.status_code == 200:
        # Verify update
        resp2 = requests.get(f"{BASE_URL}/bundles", headers=headers)
        if resp2.status_code == 200:
            bundles = resp2.json()
            for b in bundles:
                if b.get("id") == state["bundle_id"]:
                    if b.get("title") == "مراجعة محدثة":
                        log_test("Update bundle title", True, "Title updated successfully")
                    else:
                        log_test("Update bundle title", False, f"Title not updated: {b.get('title')}")
                    break
        else:
            log_test("Update bundle title", False, "Failed to verify update")
    else:
        log_test("Update bundle title", False, f"Status {resp.status_code}: {resp.text}")
    
    # Test 9: Update bundle resource_ids (remove R3)
    print("\n--- Test 9: Update bundle resource_ids ---")
    resp = requests.put(f"{BASE_URL}/bundles/{state['bundle_id']}", json={
        "resource_ids": [state["resource_ids"][0], state["resource_ids"][1]]
    }, headers=headers)
    
    if resp.status_code == 200:
        # Verify update
        resp2 = requests.get(f"{BASE_URL}/bundles", headers=headers)
        if resp2.status_code == 200:
            bundles = resp2.json()
            for b in bundles:
                if b.get("id") == state["bundle_id"]:
                    resource_ids = b.get("resource_ids", [])
                    actual_count = b.get("actual_count")
                    if len(resource_ids) == 2 and actual_count == 2:
                        log_test("Update bundle resource_ids → 2 resources", True, 
                                f"Resources={len(resource_ids)}, actual_count={actual_count}")
                    else:
                        log_test("Update bundle resource_ids → 2 resources", False, 
                                f"Expected 2, got resources={len(resource_ids)}, actual_count={actual_count}")
                    break
        else:
            log_test("Update bundle resource_ids → 2 resources", False, "Failed to verify update")
    else:
        log_test("Update bundle resource_ids → 2 resources", False, 
                f"Status {resp.status_code}: {resp.text}")
    
    # Test 10: Update non-existent bundle
    print("\n--- Test 10: Update non-existent bundle ---")
    import uuid
    fake_id = str(uuid.uuid4())
    resp = requests.put(f"{BASE_URL}/bundles/{fake_id}", json={
        "title": "Test"
    }, headers=headers)
    
    if resp.status_code == 404:
        log_test("Update non-existent bundle → 404", True, f"Error: {resp.json().get('detail', '')}")
    else:
        log_test("Update non-existent bundle → 404", False, f"Expected 404, got {resp.status_code}")


def test_public_check():
    """Test 11-13: Public bundle check"""
    print("\n" + "="*80)
    print("TEST: Public Bundle Check")
    print("="*80)
    
    # Test 11: Check valid bundle code
    print("\n--- Test 11: Check valid bundle code ---")
    resp = requests.get(f"{BASE_URL}/bundle/check/{state['bundle_code']}")
    
    if resp.status_code == 200:
        data = resp.json()
        kind = data.get("kind")
        title = data.get("title")
        owner_name = data.get("owner_name")
        school_name = data.get("school_name")
        resources_count = data.get("resources_count")
        
        if kind == "bundle" and title and resources_count == 2:
            log_test("Check valid bundle code", True, 
                    f"Kind={kind}, Title={title}, Owner={owner_name}, School={school_name}, Count={resources_count}")
        else:
            log_test("Check valid bundle code", False, 
                    f"Invalid response: kind={kind}, count={resources_count}")
    else:
        log_test("Check valid bundle code", False, f"Status {resp.status_code}: {resp.text}")
    
    # Test 12: Check invalid code
    print("\n--- Test 12: Check invalid code ---")
    resp = requests.get(f"{BASE_URL}/bundle/check/NOPE12")
    
    if resp.status_code == 404:
        log_test("Check invalid code → 404", True, f"Error: {resp.json().get('detail', '')}")
    else:
        log_test("Check invalid code → 404", False, f"Expected 404, got {resp.status_code}")
    
    # Test 13: Check lowercase code (should work)
    print("\n--- Test 13: Check lowercase code ---")
    resp = requests.get(f"{BASE_URL}/bundle/check/{state['bundle_code'].lower()}")
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("kind") == "bundle":
            log_test("Check lowercase code → works", True, "Backend uppercases code")
        else:
            log_test("Check lowercase code → works", False, f"Invalid response: {data}")
    else:
        log_test("Check lowercase code → works", False, f"Status {resp.status_code}: {resp.text}")


def test_student_access():
    """Test 14-16: Student access"""
    print("\n" + "="*80)
    print("TEST: Student Access")
    print("="*80)
    
    # Test 14: Student access with valid data
    print("\n--- Test 14: Student access with valid data ---")
    resp = requests.post(f"{BASE_URL}/bundle/{state['bundle_code']}/access", json={
        "student_name": "خالد علي",
        "grade": "الثامن",
        "section": "3"
    })
    
    if resp.status_code == 200:
        data = resp.json()
        access_id = data.get("access_id")
        student_name = data.get("student_name")
        grade = data.get("grade")
        section = data.get("section")
        
        if access_id and student_name == "خالد علي" and grade == "الثامن" and section == "3":
            state["access_id"] = access_id
            log_test("Student access with valid data", True, 
                    f"Access ID={access_id[:8]}, Student={student_name}, Grade={grade}, Section={section}")
        else:
            log_test("Student access with valid data", False, f"Invalid response: {data}")
    else:
        log_test("Student access with valid data", False, f"Status {resp.status_code}: {resp.text}")
    
    # Test 15: Student access with missing grade
    print("\n--- Test 15: Student access with missing grade ---")
    resp = requests.post(f"{BASE_URL}/bundle/{state['bundle_code']}/access", json={
        "student_name": "أحمد",
        "section": "1"
    })
    
    if resp.status_code == 400 or resp.status_code == 422:
        log_test("Student access with missing grade → 400", True, 
                f"Status {resp.status_code}: {resp.text[:100]}")
    else:
        log_test("Student access with missing grade → 400", False, 
                f"Expected 400/422, got {resp.status_code}")
    
    # Test 16: Student access with invalid grade
    print("\n--- Test 16: Student access with invalid grade ---")
    resp = requests.post(f"{BASE_URL}/bundle/{state['bundle_code']}/access", json={
        "student_name": "سالم",
        "grade": "السابع عشر",
        "section": "2"
    })
    
    if resp.status_code == 400:
        error_msg = resp.json().get("detail", "")
        if "الصف غير معتمد" in error_msg:
            log_test("Student access with invalid grade → 400", True, f"Error: {error_msg}")
        else:
            log_test("Student access with invalid grade → 400", True, f"Got 400 with: {error_msg}")
    else:
        log_test("Student access with invalid grade → 400", False, 
                f"Expected 400, got {resp.status_code}")


def test_student_resources():
    """Test 17-20: Student resources and downloads"""
    print("\n" + "="*80)
    print("TEST: Student Resources and Downloads")
    print("="*80)
    
    # Test 17: List bundle resources
    print("\n--- Test 17: List bundle resources ---")
    resp = requests.get(f"{BASE_URL}/bundle/{state['bundle_code']}/resources", 
                       params={"access_id": state["access_id"]})
    
    if resp.status_code == 200:
        resources = resp.json()
        if len(resources) == 2:
            # Check order (R1, R2)
            if resources[0].get("id") == state["resource_ids"][0] and \
               resources[1].get("id") == state["resource_ids"][1]:
                # Check that storage_filename is not included
                has_storage = any("storage_filename" in r for r in resources)
                if not has_storage:
                    log_test("List bundle resources → 2 resources in order, no storage_filename", True, 
                            f"R1={resources[0]['id'][:8]}, R2={resources[1]['id'][:8]}")
                else:
                    log_test("List bundle resources → 2 resources in order, no storage_filename", False, 
                            "storage_filename should not be included")
            else:
                log_test("List bundle resources → 2 resources in order, no storage_filename", False, 
                        f"Wrong order or IDs")
        else:
            log_test("List bundle resources → 2 resources in order, no storage_filename", False, 
                    f"Expected 2 resources, got {len(resources)}")
    else:
        log_test("List bundle resources → 2 resources in order, no storage_filename", False, 
                f"Status {resp.status_code}: {resp.text}")
    
    # Test 18: Download R1
    print("\n--- Test 18: Download R1 ---")
    resp = requests.get(f"{BASE_URL}/bundle/{state['bundle_code']}/download/{state['resource_ids'][0]}", 
                       params={"access_id": state["access_id"]})
    
    if resp.status_code == 200:
        content = resp.content.decode('utf-8')
        expected_content = "Test content for r1.txt"
        if expected_content in content:
            # Check Content-Disposition header
            content_disp = resp.headers.get("content-disposition", "")
            log_test("Download R1 → 200 with correct content", True, 
                    f"Content matches, Content-Disposition: {content_disp}")
        else:
            log_test("Download R1 → 200 with correct content", False, 
                    f"Content mismatch: {content}")
    else:
        log_test("Download R1 → 200 with correct content", False, 
                f"Status {resp.status_code}: {resp.text}")
    
    # Test 19: Download R3 (removed from bundle)
    print("\n--- Test 19: Download R3 (not in bundle) ---")
    resp = requests.get(f"{BASE_URL}/bundle/{state['bundle_code']}/download/{state['resource_ids'][2]}", 
                       params={"access_id": state["access_id"]})
    
    if resp.status_code == 404:
        error_msg = resp.json().get("detail", "")
        if "ليس ضمن الحزمة" in error_msg or "غير" in error_msg:
            log_test("Download R3 (not in bundle) → 404", True, f"Error: {error_msg}")
        else:
            log_test("Download R3 (not in bundle) → 404", True, f"Got 404 with: {error_msg}")
    else:
        log_test("Download R3 (not in bundle) → 404", False, 
                f"Expected 404, got {resp.status_code}")
    
    # Test 20: Check download logs
    print("\n--- Test 20: Check download logs ---")
    token = state["token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/resources/{state['resource_ids'][0]}/downloads", 
                       headers=headers)
    
    if resp.status_code == 200:
        logs = resp.json()
        found = False
        for log in logs:
            if log.get("student_name") == "خالد علي" and \
               log.get("grade") == "الثامن" and \
               log.get("section") == "3" and \
               log.get("action") == "download" and \
               log.get("bundle_id") == state["bundle_id"]:
                found = True
                log_test("Check download logs → includes bundle_id and student info", True, 
                        f"Log found: {log.get('student_name')}, bundle_id={log.get('bundle_id')[:8]}")
                break
        if not found:
            log_test("Check download logs → includes bundle_id and student info", False, 
                    f"Log not found. Total logs: {len(logs)}")
    else:
        log_test("Check download logs → includes bundle_id and student info", False, 
                f"Status {resp.status_code}: {resp.text}")


def test_cross_kind_isolation():
    """Test 21-22: Cross-kind isolation"""
    print("\n" + "="*80)
    print("TEST: Cross-Kind Isolation")
    print("="*80)
    
    token = state["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # First, get library code
    print("\n--- Setup: Get library code ---")
    resp = requests.get(f"{BASE_URL}/library/me", headers=headers)
    if resp.status_code == 200:
        library_code = resp.json().get("library_code")
        state["library_code"] = library_code
        print(f"   Library code: {library_code}")
    else:
        print(f"   Failed to get library code: {resp.status_code}")
        log_test("Cross-kind isolation tests", False, "Failed to get library code")
        return
    
    # Create library access
    print("\n--- Setup: Create library access ---")
    resp = requests.post(f"{BASE_URL}/library/{library_code}/access", json={
        "student_name": "طالب المكتبة",
        "grade": "الخامس",
        "section": "1"
    })
    if resp.status_code == 200:
        library_access_id = resp.json().get("access_id")
        state["library_access_id"] = library_access_id
        print(f"   Library access ID: {library_access_id[:8]}")
    else:
        print(f"   Failed to create library access: {resp.status_code}")
        log_test("Cross-kind isolation tests", False, "Failed to create library access")
        return
    
    # Test 21: Use bundle access_id on library endpoint
    print("\n--- Test 21: Use bundle access_id on library endpoint ---")
    resp = requests.get(f"{BASE_URL}/library/{library_code}/resources", 
                       params={"access_id": state["access_id"]})
    
    if resp.status_code == 401:
        error_msg = resp.json().get("detail", "")
        log_test("Use bundle access_id on library endpoint → 401", True, f"Error: {error_msg}")
    else:
        log_test("Use bundle access_id on library endpoint → 401", False, 
                f"Expected 401, got {resp.status_code}")
    
    # Test 22: Use library access_id on bundle endpoint
    print("\n--- Test 22: Use library access_id on bundle endpoint ---")
    resp = requests.get(f"{BASE_URL}/bundle/{state['bundle_code']}/resources", 
                       params={"access_id": state["library_access_id"]})
    
    if resp.status_code == 401:
        error_msg = resp.json().get("detail", "")
        log_test("Use library access_id on bundle endpoint → 401", True, f"Error: {error_msg}")
    else:
        log_test("Use library access_id on bundle endpoint → 401", False, 
                f"Expected 401, got {resp.status_code}")


def test_is_active_toggle():
    """Test 23-27: is_active toggle"""
    print("\n" + "="*80)
    print("TEST: is_active Toggle")
    print("="*80)
    
    token = state["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 23: Set is_active to false
    print("\n--- Test 23: Set is_active to false ---")
    resp = requests.put(f"{BASE_URL}/bundles/{state['bundle_id']}", json={
        "is_active": False
    }, headers=headers)
    
    if resp.status_code == 200:
        log_test("Set is_active to false", True, "Bundle deactivated")
    else:
        log_test("Set is_active to false", False, f"Status {resp.status_code}: {resp.text}")
    
    # Test 24: Check inactive bundle
    print("\n--- Test 24: Check inactive bundle ---")
    resp = requests.get(f"{BASE_URL}/bundle/check/{state['bundle_code']}")
    
    if resp.status_code == 404:
        log_test("Check inactive bundle → 404", True, "Inactive bundle not accessible")
    else:
        log_test("Check inactive bundle → 404", False, 
                f"Expected 404, got {resp.status_code}")
    
    # Test 25: Access resources with existing access_id on inactive bundle
    print("\n--- Test 25: Access resources on inactive bundle ---")
    resp = requests.get(f"{BASE_URL}/bundle/{state['bundle_code']}/resources", 
                       params={"access_id": state["access_id"]})
    
    if resp.status_code == 404:
        log_test("Access resources on inactive bundle → 404", True, "Resources not accessible")
    else:
        log_test("Access resources on inactive bundle → 404", False, 
                f"Expected 404, got {resp.status_code}")
    
    # Test 26: Reactivate bundle
    print("\n--- Test 26: Reactivate bundle ---")
    resp = requests.put(f"{BASE_URL}/bundles/{state['bundle_id']}", json={
        "is_active": True
    }, headers=headers)
    
    if resp.status_code == 200:
        log_test("Reactivate bundle", True, "Bundle reactivated")
    else:
        log_test("Reactivate bundle", False, f"Status {resp.status_code}: {resp.text}")
    
    # Test 27: Check reactivated bundle
    print("\n--- Test 27: Check reactivated bundle ---")
    resp = requests.get(f"{BASE_URL}/bundle/check/{state['bundle_code']}")
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("kind") == "bundle":
            log_test("Check reactivated bundle → 200", True, "Bundle accessible again")
        else:
            log_test("Check reactivated bundle → 200", False, f"Invalid response: {data}")
    else:
        log_test("Check reactivated bundle → 200", False, 
                f"Expected 200, got {resp.status_code}")


def test_cleanup():
    """Test 28-31: Cleanup"""
    print("\n" + "="*80)
    print("TEST: Cleanup")
    print("="*80)
    
    token = state["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 28: Delete bundle
    print("\n--- Test 28: Delete bundle ---")
    resp = requests.delete(f"{BASE_URL}/bundles/{state['bundle_id']}", headers=headers)
    
    if resp.status_code == 200:
        log_test("Delete bundle", True, "Bundle deleted")
    else:
        log_test("Delete bundle", False, f"Status {resp.status_code}: {resp.text}")
    
    # Test 29: Check deleted bundle
    print("\n--- Test 29: Check deleted bundle ---")
    resp = requests.get(f"{BASE_URL}/bundle/check/{state['bundle_code']}")
    
    if resp.status_code == 404:
        log_test("Check deleted bundle → 404", True, "Bundle not found")
    else:
        log_test("Check deleted bundle → 404", False, 
                f"Expected 404, got {resp.status_code}")
    
    # Test 30: Verify bundle not in list
    print("\n--- Test 30: Verify bundle not in list ---")
    resp = requests.get(f"{BASE_URL}/bundles", headers=headers)
    
    if resp.status_code == 200:
        bundles = resp.json()
        found = any(b.get("id") == state["bundle_id"] for b in bundles)
        if not found:
            log_test("Verify bundle not in list", True, "Bundle removed from list")
        else:
            log_test("Verify bundle not in list", False, "Bundle still in list")
    else:
        log_test("Verify bundle not in list", False, f"Status {resp.status_code}: {resp.text}")
    
    # Test 31: Delete uploaded resources
    print("\n--- Test 31: Delete uploaded resources ---")
    all_deleted = True
    for rid in state["resource_ids"]:
        resp = requests.delete(f"{BASE_URL}/resources/{rid}", headers=headers)
        if resp.status_code == 200:
            print(f"   Deleted resource {rid[:8]}")
        else:
            print(f"   Failed to delete resource {rid[:8]}: {resp.status_code}")
            all_deleted = False
    
    if all_deleted:
        log_test("Delete uploaded resources", True, "All resources deleted")
    else:
        log_test("Delete uploaded resources", False, "Some resources failed to delete")


def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"\nTotal Tests: {results['passed'] + results['failed']}")
    print(f"✅ Passed: {results['passed']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"Success Rate: {results['passed'] / (results['passed'] + results['failed']) * 100:.1f}%")
    
    if results['failed'] > 0:
        print("\n" + "="*80)
        print("FAILED TESTS")
        print("="*80)
        for test in results['tests']:
            if not test['passed']:
                print(f"\n❌ {test['name']}")
                if test['details']:
                    print(f"   {test['details']}")


def main():
    """Main test runner"""
    print("="*80)
    print("Resource Bundles Backend Test Suite")
    print("مدرسة الخيرات - School Platform")
    print("="*80)
    
    # Run tests
    if not test_setup():
        print("\n❌ Setup failed. Aborting tests.")
        return
    
    test_create_bundle()
    test_list_and_update()
    test_public_check()
    test_student_access()
    test_student_resources()
    test_cross_kind_isolation()
    test_is_active_toggle()
    test_cleanup()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    if results['failed'] > 0:
        exit(1)
    else:
        exit(0)


if __name__ == "__main__":
    main()
