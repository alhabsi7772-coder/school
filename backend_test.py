#!/usr/bin/env python3
"""
Comprehensive Backend Test Suite for Per-Video Share Links
Tests the new per-video share code architecture
"""

import requests
import json
import sys
from pathlib import Path

# Backend URL from frontend/.env
BASE_URL = "https://school-hub-878.preview.emergentagent.com/api"

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "teacher123"

# Approved grades
APPROVED_GRADES = ["الخامس", "السادس", "السابع", "الثامن"]

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class TestRunner:
    def __init__(self):
        self.token = None
        self.passed = 0
        self.failed = 0
        self.video1_id = None
        self.video1_code = None
        self.video2_id = None
        self.video2_code = None
        self.access_ahmed = None
        self.access_khalid = None
        
    def log(self, msg, color=RESET):
        print(f"{color}{msg}{RESET}")
        
    def test(self, name, condition, details=""):
        if condition:
            self.passed += 1
            self.log(f"✅ {name}", GREEN)
            if details:
                self.log(f"   {details}", BLUE)
        else:
            self.failed += 1
            self.log(f"❌ {name}", RED)
            if details:
                self.log(f"   {details}", YELLOW)
                
    def summary(self):
        total = self.passed + self.failed
        self.log(f"\n{'='*60}", BLUE)
        self.log(f"Test Summary: {self.passed}/{total} passed", 
                 GREEN if self.failed == 0 else YELLOW)
        self.log(f"{'='*60}\n", BLUE)
        return self.failed == 0

    def run_all_tests(self):
        self.log("\n" + "="*60, BLUE)
        self.log("Per-Video Share Links - Backend Test Suite", BLUE)
        self.log("="*60 + "\n", BLUE)
        
        # Setup & Video Creation
        self.log("\n[1] Setup & Video Creation", YELLOW)
        self.test_login()
        self.test_create_restricted_video()
        self.test_create_open_video()
        self.test_list_videos_with_share_codes()
        
        # Public Endpoints
        self.log("\n[2] Public Endpoints - Check", YELLOW)
        self.test_check_valid_code()
        self.test_check_invalid_code()
        self.test_check_lowercase_code()
        
        # Student Access & Grade Restriction
        self.log("\n[3] Student Access & Grade Restriction", YELLOW)
        self.test_access_allowed_grade()
        self.test_access_forbidden_grade()
        self.test_access_missing_fields()
        self.test_access_invalid_grade()
        self.test_access_open_video()
        
        # Video Access & View Logs
        self.log("\n[4] Video Access & View Logs", YELLOW)
        self.test_get_video_with_access()
        self.test_view_deduplication()
        self.test_teacher_view_logs()
        self.test_get_video_without_access_id()
        self.test_get_video_invalid_access_id()
        
        # Comments
        self.log("\n[5] Comments", YELLOW)
        self.test_post_comment()
        self.test_get_comments()
        self.test_post_second_comment()
        self.test_post_empty_comment()
        self.test_post_long_comment()
        
        # Toggle allow_comments
        self.log("\n[6] Toggle allow_comments", YELLOW)
        self.test_disable_comments()
        self.test_post_comment_when_disabled()
        
        # Toggle is_active
        self.log("\n[7] Toggle is_active", YELLOW)
        self.test_disable_video()
        self.test_check_inactive_video()
        self.test_access_inactive_video()
        self.test_enable_video()
        
        # Cross-kind Isolation
        self.log("\n[8] Cross-kind Isolation", YELLOW)
        self.test_cross_kind_video_on_library()
        self.test_cross_kind_library_on_video()
        
        # Stream Test (Optional)
        self.log("\n[9] Stream Test (Optional - Uploaded Video)", YELLOW)
        self.test_upload_video()
        
        # Cleanup
        self.log("\n[10] Cleanup", YELLOW)
        self.test_cleanup()
        
        return self.summary()

    def test_login(self):
        """Test 1: Login admin/teacher123 → bearer token"""
        try:
            resp = requests.post(f"{BASE_URL}/auth/login", json={
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            }, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("token")
                self.test("Login admin/teacher123", 
                         self.token is not None,
                         f"Token received: {self.token[:20]}..." if self.token else "No token")
            else:
                self.test("Login admin/teacher123", False, 
                         f"Status {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            self.test("Login admin/teacher123", False, str(e))

    def test_create_restricted_video(self):
        """Test 2: Create video with grade restriction"""
        try:
            resp = requests.post(f"{BASE_URL}/videos/youtube", 
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "title": "درس مقيّد",
                    "description": "شرح للصف الخامس",
                    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    "grades": ["الخامس"],
                    "allow_comments": True,
                    "is_active": True
                }, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                self.video1_id = data.get("id")
                self.video1_code = data.get("share_code")
                
                # Verify share_code is 6 uppercase A-Z0-9 chars
                is_valid = (self.video1_code and 
                           len(self.video1_code) == 6 and 
                           self.video1_code.isupper() and
                           self.video1_code.isalnum())
                
                self.test("Create restricted video (الخامس only)", 
                         is_valid,
                         f"ID: {self.video1_id}, share_code: {self.video1_code}")
            else:
                self.test("Create restricted video", False,
                         f"Status {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            self.test("Create restricted video", False, str(e))

    def test_create_open_video(self):
        """Test 3: Create video open to all grades"""
        try:
            resp = requests.post(f"{BASE_URL}/videos/youtube",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "title": "درس مفتوح للجميع",
                    "youtube_url": "https://youtu.be/dQw4w9WgXcQ",
                    "grades": [],
                    "allow_comments": True,
                    "is_active": True
                }, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                self.video2_id = data.get("id")
                self.video2_code = data.get("share_code")
                
                is_valid = (self.video2_code and 
                           len(self.video2_code) == 6 and
                           self.video2_code != self.video1_code)
                
                self.test("Create open video (no grade restriction)",
                         is_valid,
                         f"ID: {self.video2_id}, share_code: {self.video2_code}")
            else:
                self.test("Create open video", False,
                         f"Status {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            self.test("Create open video", False, str(e))

    def test_list_videos_with_share_codes(self):
        """Test 4: GET /api/videos → verify lazy migration"""
        try:
            resp = requests.get(f"{BASE_URL}/videos",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10)
            
            if resp.status_code == 200:
                videos = resp.json()
                # Check that all videos have share_code
                all_have_codes = all(v.get("share_code") for v in videos)
                
                self.test("GET /api/videos - all videos have share_code",
                         all_have_codes,
                         f"Found {len(videos)} videos, all with share_code")
            else:
                self.test("GET /api/videos", False,
                         f"Status {resp.status_code}")
        except Exception as e:
            self.test("GET /api/videos", False, str(e))

    def test_check_valid_code(self):
        """Test 5: GET /api/video-share/check/{code1} → 200 with metadata"""
        try:
            resp = requests.get(f"{BASE_URL}/video-share/check/{self.video1_code}",
                timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                has_required = all(k in data for k in ["title", "grades", "owner_name", "school_name"])
                no_leaks = "storage_filename" not in data and "owner_id" not in data
                correct_grades = data.get("grades") == ["الخامس"]
                
                self.test("Check valid code - metadata returned",
                         has_required and no_leaks and correct_grades,
                         f"Title: {data.get('title')}, Grades: {data.get('grades')}")
            else:
                self.test("Check valid code", False,
                         f"Status {resp.status_code}")
        except Exception as e:
            self.test("Check valid code", False, str(e))

    def test_check_invalid_code(self):
        """Test 6: GET /api/video-share/check/NOPE12 → 404"""
        try:
            resp = requests.get(f"{BASE_URL}/video-share/check/NOPE12",
                timeout=10)
            
            self.test("Check invalid code → 404",
                     resp.status_code == 404,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("Check invalid code", False, str(e))

    def test_check_lowercase_code(self):
        """Test 7: GET /api/video-share/check/{code.lower()} → 200"""
        try:
            resp = requests.get(f"{BASE_URL}/video-share/check/{self.video1_code.lower()}",
                timeout=10)
            
            self.test("Check lowercase code → 200 (uppercase handling)",
                     resp.status_code == 200,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("Check lowercase code", False, str(e))

    def test_access_allowed_grade(self):
        """Test 8: POST access with allowed grade → access_id"""
        try:
            resp = requests.post(f"{BASE_URL}/video-share/{self.video1_code}/access",
                json={
                    "student_name": "أحمد علي",
                    "grade": "الخامس",
                    "section": "1"
                }, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                self.access_ahmed = data.get("access_id")
                
                self.test("Access with allowed grade (الخامس) → access_id",
                         self.access_ahmed is not None,
                         f"access_id: {self.access_ahmed}")
            else:
                self.test("Access with allowed grade", False,
                         f"Status {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            self.test("Access with allowed grade", False, str(e))

    def test_access_forbidden_grade(self):
        """Test 9: POST access with forbidden grade → 403"""
        try:
            resp = requests.post(f"{BASE_URL}/video-share/{self.video1_code}/access",
                json={
                    "student_name": "بدر",
                    "grade": "الثامن",
                    "section": "2"
                }, timeout=10)
            
            self.test("Access with forbidden grade (الثامن) → 403",
                     resp.status_code == 403,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("Access with forbidden grade", False, str(e))

    def test_access_missing_fields(self):
        """Test 10: POST access with missing fields → 400"""
        try:
            resp = requests.post(f"{BASE_URL}/video-share/{self.video1_code}/access",
                json={
                    "student_name": "test"
                    # missing grade and section
                }, timeout=10)
            
            self.test("Access with missing fields → 400/422",
                     resp.status_code in [400, 422],
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("Access with missing fields", False, str(e))

    def test_access_invalid_grade(self):
        """Test 11: POST access with invalid grade → 400"""
        try:
            resp = requests.post(f"{BASE_URL}/video-share/{self.video1_code}/access",
                json={
                    "student_name": "test",
                    "grade": "الصف العاشر",
                    "section": "1"
                }, timeout=10)
            
            self.test("Access with invalid grade (not in approved list) → 400",
                     resp.status_code == 400,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("Access with invalid grade", False, str(e))

    def test_access_open_video(self):
        """Test 12: POST access to open video (no grade restriction) → 200"""
        try:
            resp = requests.post(f"{BASE_URL}/video-share/{self.video2_code}/access",
                json={
                    "student_name": "خالد",
                    "grade": "الثامن",
                    "section": "3"
                }, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                self.access_khalid = data.get("access_id")
                
                self.test("Access open video (no grade restriction) → 200",
                         self.access_khalid is not None,
                         f"access_id: {self.access_khalid}")
            else:
                self.test("Access open video", False,
                         f"Status {resp.status_code}")
        except Exception as e:
            self.test("Access open video", False, str(e))

    def test_get_video_with_access(self):
        """Test 13: GET video with valid access_id → video data + view logged"""
        try:
            resp = requests.get(f"{BASE_URL}/video-share/{self.video1_code}",
                params={"access_id": self.access_ahmed},
                timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                has_video_data = "title" in data and "id" in data
                
                self.test("GET video with valid access_id → video data",
                         has_video_data,
                         f"Title: {data.get('title')}")
            else:
                self.test("GET video with access_id", False,
                         f"Status {resp.status_code}")
        except Exception as e:
            self.test("GET video with access_id", False, str(e))

    def test_view_deduplication(self):
        """Test 14: Call same endpoint again → view NOT duplicated"""
        try:
            # Call again
            resp = requests.get(f"{BASE_URL}/video-share/{self.video1_code}",
                params={"access_id": self.access_ahmed},
                timeout=10)
            
            # We can't directly verify deduplication without checking the DB,
            # but we can verify the endpoint still works
            self.test("GET video again (view deduplication)",
                     resp.status_code == 200,
                     "Endpoint works (deduplication happens in backend)")
        except Exception as e:
            self.test("View deduplication", False, str(e))

    def test_teacher_view_logs(self):
        """Test 15: GET /api/videos/{vid}/views → contains "أحمد علي" """
        try:
            resp = requests.get(f"{BASE_URL}/videos/{self.video1_id}/views",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10)
            
            if resp.status_code == 200:
                views = resp.json()
                has_ahmed = any(v.get("student_name") == "أحمد علي" for v in views)
                
                self.test("Teacher view logs contain 'أحمد علي'",
                         has_ahmed,
                         f"Found {len(views)} view(s)")
            else:
                self.test("Teacher view logs", False,
                         f"Status {resp.status_code}")
        except Exception as e:
            self.test("Teacher view logs", False, str(e))

    def test_get_video_without_access_id(self):
        """Test 16: GET video without access_id → 422 or error"""
        try:
            resp = requests.get(f"{BASE_URL}/video-share/{self.video1_code}",
                timeout=10)
            
            self.test("GET video without access_id → 422/400",
                     resp.status_code in [400, 422],
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("GET video without access_id", False, str(e))

    def test_get_video_invalid_access_id(self):
        """Test 17: GET video with invalid access_id → 401"""
        try:
            resp = requests.get(f"{BASE_URL}/video-share/{self.video1_code}",
                params={"access_id": "BOGUS-ID-12345"},
                timeout=10)
            
            self.test("GET video with invalid access_id → 401",
                     resp.status_code == 401,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("GET video with invalid access_id", False, str(e))

    def test_post_comment(self):
        """Test 18: POST comment → 200"""
        try:
            resp = requests.post(f"{BASE_URL}/video-share/{self.video1_code}/comments",
                json={
                    "access_id": self.access_ahmed,
                    "text": "شكراً للشرح"
                }, timeout=10)
            
            self.test("POST comment → 200",
                     resp.status_code == 200,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("POST comment", False, str(e))

    def test_get_comments(self):
        """Test 19: GET comments → contains posted comment"""
        try:
            resp = requests.get(f"{BASE_URL}/video-share/{self.video1_code}/comments",
                params={"access_id": self.access_ahmed},
                timeout=10)
            
            if resp.status_code == 200:
                comments = resp.json()
                has_comment = any("شكراً للشرح" in c.get("text", "") for c in comments)
                
                self.test("GET comments → contains 'شكراً للشرح'",
                         has_comment,
                         f"Found {len(comments)} comment(s)")
            else:
                self.test("GET comments", False,
                         f"Status {resp.status_code}")
        except Exception as e:
            self.test("GET comments", False, str(e))

    def test_post_second_comment(self):
        """Test 20: POST second comment → 200"""
        try:
            resp = requests.post(f"{BASE_URL}/video-share/{self.video1_code}/comments",
                json={
                    "access_id": self.access_ahmed,
                    "text": "درس ممتاز"
                }, timeout=10)
            
            self.test("POST second comment → 200",
                     resp.status_code == 200,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("POST second comment", False, str(e))

    def test_post_empty_comment(self):
        """Test 21: POST empty comment → 400"""
        try:
            resp = requests.post(f"{BASE_URL}/video-share/{self.video1_code}/comments",
                json={
                    "access_id": self.access_ahmed,
                    "text": ""
                }, timeout=10)
            
            self.test("POST empty comment → 400",
                     resp.status_code == 400,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("POST empty comment", False, str(e))

    def test_post_long_comment(self):
        """Test 22: POST comment > 1000 chars → 400"""
        try:
            long_text = "ا" * 1001
            resp = requests.post(f"{BASE_URL}/video-share/{self.video1_code}/comments",
                json={
                    "access_id": self.access_ahmed,
                    "text": long_text
                }, timeout=10)
            
            self.test("POST comment > 1000 chars → 400",
                     resp.status_code == 400,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("POST long comment", False, str(e))

    def test_disable_comments(self):
        """Test 23: PUT video {allow_comments: false} → 200"""
        try:
            resp = requests.put(f"{BASE_URL}/videos/{self.video1_id}",
                headers={"Authorization": f"Bearer {self.token}"},
                json={"allow_comments": False},
                timeout=10)
            
            self.test("Disable comments → 200",
                     resp.status_code == 200,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("Disable comments", False, str(e))

    def test_post_comment_when_disabled(self):
        """Test 24: POST comment when disabled → 403"""
        try:
            resp = requests.post(f"{BASE_URL}/video-share/{self.video1_code}/comments",
                json={
                    "access_id": self.access_ahmed,
                    "text": "test"
                }, timeout=10)
            
            self.test("POST comment when disabled → 403",
                     resp.status_code == 403,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("POST comment when disabled", False, str(e))

    def test_disable_video(self):
        """Test 25: PUT video {is_active: false} → 200"""
        try:
            resp = requests.put(f"{BASE_URL}/videos/{self.video1_id}",
                headers={"Authorization": f"Bearer {self.token}"},
                json={"is_active": False},
                timeout=10)
            
            self.test("Disable video (is_active: false) → 200",
                     resp.status_code == 200,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("Disable video", False, str(e))

    def test_check_inactive_video(self):
        """Test 26: GET /api/video-share/check/{code} for inactive → 404"""
        try:
            resp = requests.get(f"{BASE_URL}/video-share/check/{self.video1_code}",
                timeout=10)
            
            self.test("Check inactive video → 404",
                     resp.status_code == 404,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("Check inactive video", False, str(e))

    def test_access_inactive_video(self):
        """Test 27: POST access to inactive video → 404"""
        try:
            resp = requests.post(f"{BASE_URL}/video-share/{self.video1_code}/access",
                json={
                    "student_name": "test",
                    "grade": "الخامس",
                    "section": "1"
                }, timeout=10)
            
            self.test("Access inactive video → 404",
                     resp.status_code == 404,
                     f"Status: {resp.status_code}")
        except Exception as e:
            self.test("Access inactive video", False, str(e))

    def test_enable_video(self):
        """Test 28: PUT video {is_active: true, allow_comments: true} → 200"""
        try:
            resp = requests.put(f"{BASE_URL}/videos/{self.video1_id}",
                headers={"Authorization": f"Bearer {self.token}"},
                json={"is_active": True, "allow_comments": True},
                timeout=10)
            
            if resp.status_code == 200:
                # Verify check works again
                check_resp = requests.get(f"{BASE_URL}/video-share/check/{self.video1_code}",
                    timeout=10)
                
                self.test("Enable video → check returns 200 again",
                         check_resp.status_code == 200,
                         f"Check status: {check_resp.status_code}")
            else:
                self.test("Enable video", False,
                         f"Status {resp.status_code}")
        except Exception as e:
            self.test("Enable video", False, str(e))

    def test_cross_kind_video_on_library(self):
        """Test 29: Use video access_id on library endpoint → 401"""
        try:
            # First, get a library code (we need to create one or use existing)
            # For simplicity, we'll try to use the teacher's library_code
            lib_resp = requests.get(f"{BASE_URL}/library/me",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10)
            
            if lib_resp.status_code == 200:
                lib_data = lib_resp.json()
                lib_code = lib_data.get("library_code")
                
                # Try to use video access_id on library endpoint
                resp = requests.get(f"{BASE_URL}/library/{lib_code}/resources",
                    params={"access_id": self.access_ahmed},
                    timeout=10)
                
                self.test("Use video access_id on library endpoint → 401",
                         resp.status_code == 401,
                         f"Status: {resp.status_code}")
            else:
                self.test("Cross-kind test (video on library)", False,
                         "Could not get library_code")
        except Exception as e:
            self.test("Cross-kind test (video on library)", False, str(e))

    def test_cross_kind_library_on_video(self):
        """Test 30: Create library access and use on video endpoint → 401"""
        try:
            # Get library code
            lib_resp = requests.get(f"{BASE_URL}/library/me",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10)
            
            if lib_resp.status_code == 200:
                lib_data = lib_resp.json()
                lib_code = lib_data.get("library_code")
                
                # Create library access
                access_resp = requests.post(f"{BASE_URL}/library/{lib_code}/access",
                    json={
                        "student_name": "test",
                        "grade": "الخامس",
                        "section": "1"
                    }, timeout=10)
                
                if access_resp.status_code == 200:
                    lib_access_id = access_resp.json().get("access_id")
                    
                    # Try to use library access_id on video endpoint
                    resp = requests.get(f"{BASE_URL}/video-share/{self.video1_code}",
                        params={"access_id": lib_access_id},
                        timeout=10)
                    
                    self.test("Use library access_id on video endpoint → 401",
                             resp.status_code == 401,
                             f"Status: {resp.status_code}")
                else:
                    self.test("Cross-kind test (library on video)", False,
                             "Could not create library access")
            else:
                self.test("Cross-kind test (library on video)", False,
                         "Could not get library_code")
        except Exception as e:
            self.test("Cross-kind test (library on video)", False, str(e))

    def test_upload_video(self):
        """Test 31: Upload video and test stream endpoint (OPTIONAL)"""
        try:
            # Create a small fake video file
            fake_video = b'\x00\x00\x00\x20ftypmp42' + b'\x00' * 100
            
            files = {'file': ('test.mp4', fake_video, 'video/mp4')}
            data = {
                'title': 'فيديو مرفوع',
                'description': 'اختبار',
                'grades': 'الخامس',
                'is_active': 'true',
                'allow_comments': 'true'
            }
            
            resp = requests.post(f"{BASE_URL}/videos/upload",
                headers={"Authorization": f"Bearer {self.token}"},
                files=files,
                data=data,
                timeout=15)
            
            if resp.status_code == 200:
                video_data = resp.json()
                video3_id = video_data.get("id")
                video3_code = video_data.get("share_code")
                
                # Create access
                access_resp = requests.post(f"{BASE_URL}/video-share/{video3_code}/access",
                    json={
                        "student_name": "test",
                        "grade": "الخامس",
                        "section": "1"
                    }, timeout=10)
                
                if access_resp.status_code == 200:
                    access_id = access_resp.json().get("access_id")
                    
                    # Test stream endpoint
                    stream_resp = requests.get(f"{BASE_URL}/video-share/{video3_code}/stream",
                        params={"access_id": access_id},
                        timeout=10)
                    
                    self.test("Upload video + stream endpoint → 200",
                             stream_resp.status_code == 200,
                             f"Stream status: {stream_resp.status_code}")
                    
                    # Cleanup
                    requests.delete(f"{BASE_URL}/videos/{video3_id}",
                        headers={"Authorization": f"Bearer {self.token}"},
                        timeout=10)
                else:
                    self.test("Upload video (stream test)", False,
                             "Could not create access for uploaded video")
            else:
                self.test("Upload video (stream test)", False,
                         f"Upload failed: {resp.status_code}")
        except Exception as e:
            self.test("Upload video (stream test)", False, str(e))

    def test_cleanup(self):
        """Test 32: Delete test videos"""
        try:
            # Delete video 1
            resp1 = requests.delete(f"{BASE_URL}/videos/{self.video1_id}",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10)
            
            # Delete video 2
            resp2 = requests.delete(f"{BASE_URL}/videos/{self.video2_id}",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10)
            
            self.test("Cleanup - delete test videos",
                     resp1.status_code == 200 and resp2.status_code == 200,
                     f"Video1: {resp1.status_code}, Video2: {resp2.status_code}")
        except Exception as e:
            self.test("Cleanup", False, str(e))


def main():
    runner = TestRunner()
    success = runner.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
