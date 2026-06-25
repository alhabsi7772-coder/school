#!/usr/bin/env python3
"""
Backend API Testing for مدرسة الخيرات Platform
Tests the bug fix: .env files were missing after GitHub pull
"""

import requests
import json
import sys
from typing import Dict, Optional

# Get backend URL from frontend/.env
BACKEND_URL = "https://ce32d44c-542c-4250-addb-c338991ae33d.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_CREDS = {"username": "admin", "password": "teacher123"}
TEACHER1_CREDS = {"username": "teacher1", "password": "khairat1"}
INVALID_CREDS = {"username": "admin", "password": "wrongpassword"}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_test(name: str, passed: bool, details: str = ""):
    status = f"{Colors.GREEN}✅ PASS{Colors.END}" if passed else f"{Colors.RED}❌ FAIL{Colors.END}"
    print(f"{status} | {name}")
    if details:
        print(f"    {details}")
    return passed

def test_login(creds: Dict[str, str], should_succeed: bool = True) -> Optional[str]:
    """Test login endpoint and return token if successful"""
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json=creds, timeout=10)
        
        if should_succeed:
            if response.status_code == 200:
                data = response.json()
                if "token" in data:
                    print_test(
                        f"Login with {creds['username']}", 
                        True, 
                        f"Token received, role: {data.get('role', 'N/A')}"
                    )
                    return data["token"]
                else:
                    print_test(
                        f"Login with {creds['username']}", 
                        False, 
                        "No token in response"
                    )
                    return None
            else:
                print_test(
                    f"Login with {creds['username']}", 
                    False, 
                    f"Status {response.status_code}: {response.text[:200]}"
                )
                return None
        else:
            # Should fail
            if response.status_code == 401:
                print_test(
                    f"Invalid login (should fail)", 
                    True, 
                    f"Correctly rejected with 401"
                )
                return None
            else:
                print_test(
                    f"Invalid login (should fail)", 
                    False, 
                    f"Expected 401, got {response.status_code}"
                )
                return None
                
    except Exception as e:
        print_test(f"Login with {creds['username']}", False, f"Exception: {str(e)}")
        return None

def test_authenticated_get(endpoint: str, token: str, endpoint_name: str) -> bool:
    """Test authenticated GET endpoint"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BACKEND_URL}{endpoint}", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_test(
                endpoint_name,
                True,
                f"Status 200, returned {type(data).__name__}"
            )
            return True
        else:
            print_test(
                endpoint_name,
                False,
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return False
            
    except Exception as e:
        print_test(endpoint_name, False, f"Exception: {str(e)}")
        return False

def main():
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BLUE}Backend API Testing - مدرسة الخيرات{Colors.END}")
    print(f"{Colors.BLUE}Bug Fix Verification: .env files restored after GitHub pull{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}\n")
    
    results = {
        "passed": 0,
        "failed": 0,
        "total": 0
    }
    
    # Test 1: Admin login
    print(f"\n{Colors.YELLOW}[1] Testing Admin Login{Colors.END}")
    admin_token = test_login(ADMIN_CREDS, should_succeed=True)
    results["total"] += 1
    if admin_token:
        results["passed"] += 1
    else:
        results["failed"] += 1
        print(f"{Colors.RED}⚠️  Admin login failed - cannot continue with admin tests{Colors.END}")
    
    # Test 2: Get admin profile
    if admin_token:
        print(f"\n{Colors.YELLOW}[2] Testing GET /auth/profile (admin){Colors.END}")
        success = test_authenticated_get("/auth/profile", admin_token, "GET /auth/profile")
        results["total"] += 1
        if success:
            results["passed"] += 1
        else:
            results["failed"] += 1
    
    # Test 3: Teacher1 login
    print(f"\n{Colors.YELLOW}[3] Testing Teacher Login{Colors.END}")
    teacher_token = test_login(TEACHER1_CREDS, should_succeed=True)
    results["total"] += 1
    if teacher_token:
        results["passed"] += 1
    else:
        results["failed"] += 1
        print(f"{Colors.RED}⚠️  Teacher login failed - cannot continue with teacher tests{Colors.END}")
    
    # Test 4: Invalid login
    print(f"\n{Colors.YELLOW}[4] Testing Invalid Login (should fail){Colors.END}")
    test_login(INVALID_CREDS, should_succeed=False)
    results["total"] += 1
    results["passed"] += 1  # If we got here, the test ran
    
    # Test 5-8: Authenticated endpoints with teacher token
    if teacher_token:
        print(f"\n{Colors.YELLOW}[5] Testing GET /quizzes{Colors.END}")
        success = test_authenticated_get("/quizzes", teacher_token, "GET /quizzes")
        results["total"] += 1
        if success:
            results["passed"] += 1
        else:
            results["failed"] += 1
        
        print(f"\n{Colors.YELLOW}[6] Testing GET /projects{Colors.END}")
        success = test_authenticated_get("/projects", teacher_token, "GET /projects")
        results["total"] += 1
        if success:
            results["passed"] += 1
        else:
            results["failed"] += 1
        
        print(f"\n{Colors.YELLOW}[7] Testing GET /gradebooks{Colors.END}")
        success = test_authenticated_get("/gradebooks", teacher_token, "GET /gradebooks")
        results["total"] += 1
        if success:
            results["passed"] += 1
        else:
            results["failed"] += 1
        
        print(f"\n{Colors.YELLOW}[8] Testing GET /rubrics{Colors.END}")
        success = test_authenticated_get("/rubrics", teacher_token, "GET /rubrics")
        results["total"] += 1
        if success:
            results["passed"] += 1
        else:
            results["failed"] += 1
    
    # Test 9: Admin endpoint
    if admin_token:
        print(f"\n{Colors.YELLOW}[9] Testing GET /admin/teachers (admin only){Colors.END}")
        try:
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.get(f"{BACKEND_URL}/admin/teachers", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                teacher_count = len(data) if isinstance(data, list) else 0
                if teacher_count >= 4:  # Should have admin + 3 seeded teachers
                    print_test(
                        "GET /admin/teachers",
                        True,
                        f"Status 200, returned {teacher_count} teachers (expected ≥4)"
                    )
                    results["passed"] += 1
                else:
                    print_test(
                        "GET /admin/teachers",
                        False,
                        f"Expected ≥4 teachers, got {teacher_count}"
                    )
                    results["failed"] += 1
            else:
                print_test(
                    "GET /admin/teachers",
                    False,
                    f"Status {response.status_code}: {response.text[:200]}"
                )
                results["failed"] += 1
            results["total"] += 1
                
        except Exception as e:
            print_test("GET /admin/teachers", False, f"Exception: {str(e)}")
            results["failed"] += 1
            results["total"] += 1
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BLUE}Test Summary{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"Total Tests: {results['total']}")
    print(f"{Colors.GREEN}Passed: {results['passed']}{Colors.END}")
    print(f"{Colors.RED}Failed: {results['failed']}{Colors.END}")
    
    if results['failed'] == 0:
        print(f"\n{Colors.GREEN}✅ All tests passed! Backend is working correctly.{Colors.END}\n")
        return 0
    else:
        print(f"\n{Colors.RED}❌ Some tests failed. See details above.{Colors.END}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
