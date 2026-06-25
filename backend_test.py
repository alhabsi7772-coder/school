#!/usr/bin/env python3
"""
Comprehensive Backend Test for Resource Library Feature
Tests all endpoints for مكتبة الموارد (Resource Library)
"""

import requests
import json
import io
import os
from pathlib import Path

# Base URL from frontend/.env
BASE_URL = "https://school-hub-878.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_USER = "admin"
ADMIN_PASS = "teacher123"
TEACHER_USER = "teacher1"
TEACHER_PASS = "khairat1"

# Global variables to store state across tests
admin_token = None
teacher_token = None
library_code = None
videos_code = None
resource_id = None
video_youtube_id = None
video_upload_id = None
access_id_library = None
access_id_videos = None
access_id_grade8 = None
comment_id = None

def print_test(name):
    """Print test name"""
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print('='*80)

def print_result(success, message=""):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    return success

def login(username, password):
    """Login and return token"""
    print_test(f"Login as {username}")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": password
    })
    if resp.status_code == 200:
        token = resp.json().get("token")
        print_result(True, f"Logged in successfully, token: {token[:20]}...")
        return token
    else:
        print_result(False, f"Login failed: {resp.status_code} - {resp.text}")
        return None

def test_a_library_codes():
    """A) Teacher: Library codes"""
    global admin_token, library_code, videos_code
    
    # 1. Login as admin
    admin_token = login(ADMIN_USER, ADMIN_PASS)
    if not admin_token:
        return False
    
    # 2. GET /api/library/me
    print_test("GET /api/library/me - Get library codes")
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.get(f"{BASE_URL}/library/me", headers=headers)
    
    if resp.status_code != 200:
        return print_result(False, f"Failed to get library info: {resp.status_code} - {resp.text}")
    
    data = resp.json()
    library_code = data.get("library_code")
    videos_code = data.get("videos_code")
    resources_count = data.get("resources_count")
    videos_count = data.get("videos_count")
    
    if not library_code or not videos_code:
        return print_result(False, f"Missing codes: library_code={library_code}, videos_code={videos_code}")
    
    if len(library_code) != 6 or len(videos_code) != 6:
        return print_result(False, f"Invalid code length: library_code={len(library_code)}, videos_code={len(videos_code)}")
    
    if not isinstance(resources_count, int) or not isinstance(videos_count, int):
        return print_result(False, f"Invalid counts: resources_count={resources_count}, videos_count={videos_count}")
    
    print_result(True, f"library_code={library_code}, videos_code={videos_code}, resources_count={resources_count}, videos_count={videos_count}")
    
    # 3. POST /api/library/regenerate
    print_test("POST /api/library/regenerate - Regenerate library code")
    old_library_code = library_code
    resp = requests.post(f"{BASE_URL}/library/regenerate", 
                        headers=headers,
                        json={"kind": "library"})
    
    if resp.status_code != 200:
        return print_result(False, f"Failed to regenerate: {resp.status_code} - {resp.text}")
    
    new_code = resp.json().get("code")
    if not new_code or new_code == old_library_code:
        return print_result(False, f"Code not changed: old={old_library_code}, new={new_code}")
    
    library_code = new_code
    print_result(True, f"Code regenerated: {old_library_code} → {new_code}")
    
    # 4. Verify the new code in GET /api/library/me
    print_test("Verify new code in GET /api/library/me")
    resp = requests.get(f"{BASE_URL}/library/me", headers=headers)
    if resp.status_code != 200:
        return print_result(False, f"Failed to verify: {resp.status_code}")
    
    data = resp.json()
    if data.get("library_code") != library_code:
        return print_result(False, f"Code mismatch: expected={library_code}, got={data.get('library_code')}")
    
    print_result(True, f"Code verified: {library_code}")
    return True

def test_b_resources_crud():
    """B) Resources CRUD + Student flow"""
    global resource_id, access_id_library, access_id_grade8
    
    # 5. POST /api/resources/upload
    print_test("POST /api/resources/upload - Upload resource file")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create a small text file
    file_content = "test resource content - محتوى ملف الاختبار".encode('utf-8')
    files = {
        'file': ('test_resource.txt', io.BytesIO(file_content), 'text/plain')
    }
    data = {
        'title': 'ملف اختبار',
        'description': 'هذا ملف اختبار',
        'grades': 'الخامس,السادس',
        'is_active': 'true'
    }
    
    resp = requests.post(f"{BASE_URL}/resources/upload", 
                        headers=headers,
                        files=files,
                        data=data)
    
    if resp.status_code != 200:
        return print_result(False, f"Upload failed: {resp.status_code} - {resp.text}")
    
    resource = resp.json()
    resource_id = resource.get("id")
    
    if not resource_id:
        return print_result(False, "No resource ID returned")
    
    if resource.get("size_bytes") != len(file_content):
        return print_result(False, f"Size mismatch: expected={len(file_content)}, got={resource.get('size_bytes')}")
    
    if resource.get("content_type") != "text/plain":
        return print_result(False, f"Content type mismatch: {resource.get('content_type')}")
    
    grades = resource.get("grades", [])
    if "الخامس" not in grades or "السادس" not in grades:
        return print_result(False, f"Grades mismatch: {grades}")
    
    print_result(True, f"Resource uploaded: id={resource_id}, size={resource.get('size_bytes')}, grades={grades}")
    
    # 6. GET /api/resources
    print_test("GET /api/resources - List resources")
    resp = requests.get(f"{BASE_URL}/resources", headers=headers)
    
    if resp.status_code != 200:
        return print_result(False, f"Failed to list: {resp.status_code} - {resp.text}")
    
    resources = resp.json()
    found = False
    for r in resources:
        if r.get("id") == resource_id:
            found = True
            if r.get("download_count") != 0:
                return print_result(False, f"Download count should be 0, got {r.get('download_count')}")
            break
    
    if not found:
        return print_result(False, f"Resource {resource_id} not found in list")
    
    print_result(True, f"Resource found in list with download_count=0")
    
    # 7. PUT /api/resources/{id}
    print_test("PUT /api/resources/{id} - Update resource")
    resp = requests.put(f"{BASE_URL}/resources/{resource_id}",
                       headers=headers,
                       json={"title": "عنوان جديد", "grades": ["الخامس"]})
    
    if resp.status_code != 200:
        return print_result(False, f"Update failed: {resp.status_code} - {resp.text}")
    
    print_result(True, "Resource updated successfully")
    
    # 8. GET /api/library/check/{library_code}
    print_test("GET /api/library/check/{code} - Check valid code")
    resp = requests.get(f"{BASE_URL}/library/check/{library_code}")
    
    if resp.status_code != 200:
        return print_result(False, f"Check failed: {resp.status_code} - {resp.text}")
    
    data = resp.json()
    if not data.get("owner_name") or not data.get("school_name"):
        return print_result(False, f"Missing owner info: {data}")
    
    print_result(True, f"Code valid: owner={data.get('owner_name')}, school={data.get('school_name')}")
    
    # 9. GET /api/library/check/NOPE - Invalid code
    print_test("GET /api/library/check/NOPE - Check invalid code")
    resp = requests.get(f"{BASE_URL}/library/check/NOPE")
    
    if resp.status_code != 404:
        return print_result(False, f"Expected 404, got {resp.status_code}")
    
    print_result(True, "Invalid code returns 404")
    
    # 10. POST /api/library/{code}/access - Student joins
    print_test("POST /api/library/{code}/access - Student joins (أحمد علي, الخامس)")
    resp = requests.post(f"{BASE_URL}/library/{library_code}/access",
                        json={
                            "student_name": "أحمد علي",
                            "grade": "الخامس",
                            "section": "1"
                        })
    
    if resp.status_code != 200:
        return print_result(False, f"Access failed: {resp.status_code} - {resp.text}")
    
    data = resp.json()
    access_id_library = data.get("access_id")
    
    if not access_id_library:
        return print_result(False, "No access_id returned")
    
    print_result(True, f"Student joined: access_id={access_id_library}")
    
    # 11. GET /api/library/{code}/resources?access_id=...
    print_test("GET /api/library/{code}/resources - Student lists resources")
    resp = requests.get(f"{BASE_URL}/library/{library_code}/resources",
                       params={"access_id": access_id_library})
    
    if resp.status_code != 200:
        return print_result(False, f"List failed: {resp.status_code} - {resp.text}")
    
    resources = resp.json()
    found = False
    for r in resources:
        if r.get("id") == resource_id:
            found = True
            break
    
    if not found:
        return print_result(False, f"Resource {resource_id} not found for student")
    
    print_result(True, f"Student can see resource")
    
    # 12. GET /api/library/{code}/download/{rid}?access_id=...
    print_test("GET /api/library/{code}/download/{rid} - Student downloads")
    resp = requests.get(f"{BASE_URL}/library/{library_code}/download/{resource_id}",
                       params={"access_id": access_id_library})
    
    if resp.status_code != 200:
        return print_result(False, f"Download failed: {resp.status_code} - {resp.text}")
    
    if resp.content != file_content:
        return print_result(False, f"Content mismatch: expected={file_content}, got={resp.content}")
    
    print_result(True, "File downloaded successfully with correct content")
    
    # 13. GET /api/resources/{id}/downloads
    print_test("GET /api/resources/{id}/downloads - Teacher checks downloads")
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.get(f"{BASE_URL}/resources/{resource_id}/downloads", headers=headers)
    
    if resp.status_code != 200:
        return print_result(False, f"Failed to get downloads: {resp.status_code} - {resp.text}")
    
    downloads = resp.json()
    found = False
    for d in downloads:
        if d.get("student_name") == "أحمد علي" and d.get("grade") == "الخامس" and d.get("section") == "1":
            if d.get("action") != "download":
                return print_result(False, f"Wrong action: {d.get('action')}")
            found = True
            break
    
    if not found:
        return print_result(False, "Download record not found")
    
    print_result(True, "Download record found for أحمد علي")
    
    # 14. Negative: Student in grade الثامن should NOT see the resource
    print_test("Negative test: Student in الثامن should NOT see resource restricted to الخامس")
    
    # Create access for grade الثامن student
    resp = requests.post(f"{BASE_URL}/library/{library_code}/access",
                        json={
                            "student_name": "طالب الثامن",
                            "grade": "الثامن",
                            "section": "2"
                        })
    
    if resp.status_code != 200:
        return print_result(False, f"Failed to create access: {resp.status_code}")
    
    access_id_grade8 = resp.json().get("access_id")
    
    # Try to list resources
    resp = requests.get(f"{BASE_URL}/library/{library_code}/resources",
                       params={"access_id": access_id_grade8})
    
    if resp.status_code != 200:
        return print_result(False, f"List failed: {resp.status_code}")
    
    resources = resp.json()
    for r in resources:
        if r.get("id") == resource_id:
            return print_result(False, "Student in الثامن can see resource restricted to الخامس!")
    
    print_result(True, "Student in الثامن cannot see resource restricted to الخامس")
    
    # Try to download directly
    print_test("Negative test: Direct download should return 403")
    resp = requests.get(f"{BASE_URL}/library/{library_code}/download/{resource_id}",
                       params={"access_id": access_id_grade8})
    
    if resp.status_code != 403:
        return print_result(False, f"Expected 403, got {resp.status_code}")
    
    print_result(True, "Direct download returns 403 for wrong grade")
    
    # 15. Invalid access_id
    print_test("Negative test: Invalid access_id should return 401")
    resp = requests.get(f"{BASE_URL}/library/{library_code}/resources",
                       params={"access_id": "invalid-access-id"})
    
    if resp.status_code != 401:
        return print_result(False, f"Expected 401, got {resp.status_code}")
    
    print_result(True, "Invalid access_id returns 401")
    
    return True

def test_c_videos_youtube():
    """C) Videos: YouTube"""
    global video_youtube_id, access_id_videos, comment_id
    
    # 17. POST /api/videos/youtube
    print_test("POST /api/videos/youtube - Create YouTube video")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    resp = requests.post(f"{BASE_URL}/videos/youtube",
                        headers=headers,
                        json={
                            "title": "درس 1",
                            "description": "شرح",
                            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                            "grades": ["الخامس"],
                            "allow_comments": True,
                            "is_active": True
                        })
    
    if resp.status_code != 200:
        return print_result(False, f"Failed to create video: {resp.status_code} - {resp.text}")
    
    video = resp.json()
    video_youtube_id = video.get("id")
    
    if not video_youtube_id:
        return print_result(False, "No video ID returned")
    
    if video.get("youtube_id") != "dQw4w9WgXcQ":
        return print_result(False, f"Wrong youtube_id: {video.get('youtube_id')}")
    
    if video.get("source_type") != "youtube":
        return print_result(False, f"Wrong source_type: {video.get('source_type')}")
    
    print_result(True, f"YouTube video created: id={video_youtube_id}, youtube_id=dQw4w9WgXcQ")
    
    # 18. POST /api/videos/youtube with invalid URL
    print_test("POST /api/videos/youtube - Invalid URL should return 400")
    resp = requests.post(f"{BASE_URL}/videos/youtube",
                        headers=headers,
                        json={
                            "title": "Invalid",
                            "description": "test",
                            "youtube_url": "https://example.com",
                            "grades": [],
                            "allow_comments": True,
                            "is_active": True
                        })
    
    if resp.status_code != 400:
        return print_result(False, f"Expected 400, got {resp.status_code}")
    
    print_result(True, "Invalid YouTube URL returns 400")
    
    # 19. GET /api/videos
    print_test("GET /api/videos - List videos")
    resp = requests.get(f"{BASE_URL}/videos", headers=headers)
    
    if resp.status_code != 200:
        return print_result(False, f"Failed to list: {resp.status_code} - {resp.text}")
    
    videos = resp.json()
    found = False
    for v in videos:
        if v.get("id") == video_youtube_id:
            found = True
            break
    
    if not found:
        return print_result(False, f"Video {video_youtube_id} not found in list")
    
    print_result(True, "Video found in list")
    
    # 20. PUT /api/videos/{vid}
    print_test("PUT /api/videos/{vid} - Update video")
    resp = requests.put(f"{BASE_URL}/videos/{video_youtube_id}",
                       headers=headers,
                       json={"title": "درس مُحدّث"})
    
    if resp.status_code != 200:
        return print_result(False, f"Update failed: {resp.status_code} - {resp.text}")
    
    print_result(True, "Video updated successfully")
    
    # 21. GET /api/videos-library/check/{videos_code}
    print_test("GET /api/videos-library/check/{code} - Check videos code")
    resp = requests.get(f"{BASE_URL}/videos-library/check/{videos_code}")
    
    if resp.status_code != 200:
        return print_result(False, f"Check failed: {resp.status_code} - {resp.text}")
    
    data = resp.json()
    if data.get("kind") != "videos":
        return print_result(False, f"Wrong kind: {data.get('kind')}")
    
    print_result(True, f"Videos code valid: {data}")
    
    # 22. POST /api/videos-library/{code}/access
    print_test("POST /api/videos-library/{code}/access - Student joins (سالم, الخامس)")
    resp = requests.post(f"{BASE_URL}/videos-library/{videos_code}/access",
                        json={
                            "student_name": "سالم",
                            "grade": "الخامس",
                            "section": "2"
                        })
    
    if resp.status_code != 200:
        return print_result(False, f"Access failed: {resp.status_code} - {resp.text}")
    
    data = resp.json()
    access_id_videos = data.get("access_id")
    
    if not access_id_videos:
        return print_result(False, "No access_id returned")
    
    print_result(True, f"Student joined: access_id={access_id_videos}")
    
    # 23. GET /api/videos-library/{code}/videos?access_id=...
    print_test("GET /api/videos-library/{code}/videos - Student lists videos")
    resp = requests.get(f"{BASE_URL}/videos-library/{videos_code}/videos",
                       params={"access_id": access_id_videos})
    
    if resp.status_code != 200:
        return print_result(False, f"List failed: {resp.status_code} - {resp.text}")
    
    videos = resp.json()
    found = False
    for v in videos:
        if v.get("id") == video_youtube_id:
            found = True
            break
    
    if not found:
        return print_result(False, f"Video {video_youtube_id} not found for student")
    
    print_result(True, "Student can see video")
    
    # 24. GET /api/videos-library/{code}/video/{vid}?access_id=...
    print_test("GET /api/videos-library/{code}/video/{vid} - Student views video")
    resp = requests.get(f"{BASE_URL}/videos-library/{videos_code}/video/{video_youtube_id}",
                       params={"access_id": access_id_videos})
    
    if resp.status_code != 200:
        return print_result(False, f"View failed: {resp.status_code} - {resp.text}")
    
    video = resp.json()
    if video.get("id") != video_youtube_id:
        return print_result(False, f"Wrong video returned: {video.get('id')}")
    
    print_result(True, "Video viewed successfully (view record created)")
    
    # 25. GET /api/videos/{vid}/views
    print_test("GET /api/videos/{vid}/views - Teacher checks views")
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.get(f"{BASE_URL}/videos/{video_youtube_id}/views", headers=headers)
    
    if resp.status_code != 200:
        return print_result(False, f"Failed to get views: {resp.status_code} - {resp.text}")
    
    views = resp.json()
    found = False
    for v in views:
        if v.get("student_name") == "سالم" and v.get("grade") == "الخامس" and v.get("section") == "2":
            found = True
            break
    
    if not found:
        return print_result(False, "View record not found for سالم")
    
    print_result(True, "View record found for سالم")
    
    # 26. POST /api/videos-library/{code}/video/{vid}/comments
    print_test("POST /api/videos-library/{code}/video/{vid}/comments - Student adds comment")
    resp = requests.post(f"{BASE_URL}/videos-library/{videos_code}/video/{video_youtube_id}/comments",
                        json={
                            "access_id": access_id_videos,
                            "text": "شكراً للشرح"
                        })
    
    if resp.status_code != 200:
        return print_result(False, f"Comment failed: {resp.status_code} - {resp.text}")
    
    comment = resp.json()
    comment_id = comment.get("id")
    
    if not comment_id:
        return print_result(False, "No comment ID returned")
    
    print_result(True, f"Comment added: id={comment_id}")
    
    # 27. POST same comment twice (allowed)
    print_test("POST comment twice - Should be allowed")
    resp = requests.post(f"{BASE_URL}/videos-library/{videos_code}/video/{video_youtube_id}/comments",
                        json={
                            "access_id": access_id_videos,
                            "text": "شكراً للشرح"
                        })
    
    if resp.status_code != 200:
        return print_result(False, f"Second comment failed: {resp.status_code}")
    
    print_result(True, "Duplicate comment allowed")
    
    # 28. GET /api/videos-library/{code}/video/{vid}/comments?access_id=...
    print_test("GET /api/videos-library/{code}/video/{vid}/comments - Student lists comments")
    resp = requests.get(f"{BASE_URL}/videos-library/{videos_code}/video/{video_youtube_id}/comments",
                       params={"access_id": access_id_videos})
    
    if resp.status_code != 200:
        return print_result(False, f"List failed: {resp.status_code} - {resp.text}")
    
    comments = resp.json()
    if len(comments) < 2:
        return print_result(False, f"Expected at least 2 comments, got {len(comments)}")
    
    print_result(True, f"Comments listed: {len(comments)} comments")
    
    # 29. GET /api/videos/{vid}/comments (teacher)
    print_test("GET /api/videos/{vid}/comments - Teacher lists comments")
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.get(f"{BASE_URL}/videos/{video_youtube_id}/comments", headers=headers)
    
    if resp.status_code != 200:
        return print_result(False, f"List failed: {resp.status_code} - {resp.text}")
    
    comments = resp.json()
    if len(comments) < 2:
        return print_result(False, f"Expected at least 2 comments, got {len(comments)}")
    
    print_result(True, f"Teacher can see comments: {len(comments)} comments")
    
    # 30. DELETE /api/videos/{vid}/comments/{cid}
    print_test("DELETE /api/videos/{vid}/comments/{cid} - Teacher deletes comment")
    resp = requests.delete(f"{BASE_URL}/videos/{video_youtube_id}/comments/{comment_id}",
                          headers=headers)
    
    if resp.status_code != 200:
        return print_result(False, f"Delete failed: {resp.status_code} - {resp.text}")
    
    print_result(True, "Comment deleted successfully")
    
    # Verify deletion
    print_test("Verify comment deletion")
    resp = requests.get(f"{BASE_URL}/videos/{video_youtube_id}/comments", headers=headers)
    comments = resp.json()
    
    for c in comments:
        if c.get("id") == comment_id:
            return print_result(False, "Deleted comment still exists")
    
    print_result(True, "Comment successfully removed from list")
    
    # 31. PUT /api/videos/{vid} {allow_comments:false} then try to comment
    print_test("PUT /api/videos/{vid} - Disable comments")
    resp = requests.put(f"{BASE_URL}/videos/{video_youtube_id}",
                       headers=headers,
                       json={"allow_comments": False})
    
    if resp.status_code != 200:
        return print_result(False, f"Update failed: {resp.status_code}")
    
    print_result(True, "Comments disabled")
    
    print_test("POST comment when disabled - Should return 403")
    resp = requests.post(f"{BASE_URL}/videos-library/{videos_code}/video/{video_youtube_id}/comments",
                        json={
                            "access_id": access_id_videos,
                            "text": "تعليق جديد"
                        })
    
    if resp.status_code != 403:
        return print_result(False, f"Expected 403, got {resp.status_code}")
    
    print_result(True, "Comment blocked when disabled (403)")
    
    return True

def test_d_videos_upload():
    """D) Videos: Upload"""
    global video_upload_id
    
    # 33. POST /api/videos/upload
    print_test("POST /api/videos/upload - Upload video file")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create a minimal MP4 file (just a few bytes with video/mp4 content-type)
    # This is a minimal valid MP4 structure
    video_content = b'\x00\x00\x00\x20\x66\x74\x79\x70\x69\x73\x6f\x6d\x00\x00\x02\x00' \
                   b'\x69\x73\x6f\x6d\x69\x73\x6f\x32\x6d\x70\x34\x31\x00\x00\x00\x08' \
                   b'\x66\x72\x65\x65' * 100  # Make it a bit larger
    
    files = {
        'file': ('test_video.mp4', io.BytesIO(video_content), 'video/mp4')
    }
    data = {
        'title': 'فيديو محلي',
        'description': 'فيديو اختبار',
        'grades': '',
        'is_active': 'true',
        'allow_comments': 'true'
    }
    
    resp = requests.post(f"{BASE_URL}/videos/upload",
                        headers=headers,
                        files=files,
                        data=data)
    
    if resp.status_code != 200:
        return print_result(False, f"Upload failed: {resp.status_code} - {resp.text}")
    
    video = resp.json()
    video_upload_id = video.get("id")
    
    if not video_upload_id:
        return print_result(False, "No video ID returned")
    
    if video.get("source_type") != "upload":
        return print_result(False, f"Wrong source_type: {video.get('source_type')}")
    
    print_result(True, f"Video uploaded: id={video_upload_id}, source_type=upload")
    
    # 34. GET /api/videos-library/{code}/video/{vid}/stream?access_id=...
    print_test("GET /api/videos-library/{code}/video/{vid}/stream - Stream video")
    resp = requests.get(f"{BASE_URL}/videos-library/{videos_code}/video/{video_upload_id}/stream",
                       params={"access_id": access_id_videos})
    
    if resp.status_code != 200:
        return print_result(False, f"Stream failed: {resp.status_code} - {resp.text}")
    
    if len(resp.content) == 0:
        return print_result(False, "Empty video content")
    
    print_result(True, f"Video streamed successfully: {len(resp.content)} bytes")
    
    # 35. DELETE /api/videos/{vid}
    print_test("DELETE /api/videos/{vid} - Delete uploaded video")
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.delete(f"{BASE_URL}/videos/{video_upload_id}", headers=headers)
    
    if resp.status_code != 200:
        return print_result(False, f"Delete failed: {resp.status_code} - {resp.text}")
    
    print_result(True, "Video deleted successfully")
    
    # Verify file deleted from disk
    print_test("Verify video file deleted from disk")
    # We can't directly check the filesystem, but we can try to stream it
    resp = requests.get(f"{BASE_URL}/videos-library/{videos_code}/video/{video_upload_id}/stream",
                       params={"access_id": access_id_videos})
    
    if resp.status_code != 404:
        return print_result(False, f"Expected 404 after deletion, got {resp.status_code}")
    
    print_result(True, "Video file no longer accessible (404)")
    
    return True

def test_e_edge_cases():
    """Edge Cases"""
    
    # Upload file size > 30MB
    print_test("Edge case: Upload file > 30MB should return 413")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create a 31MB file
    large_content = b'x' * (31 * 1024 * 1024)
    files = {
        'file': ('large.txt', io.BytesIO(large_content), 'text/plain')
    }
    data = {
        'title': 'Large file',
        'description': 'test',
        'grades': '',
        'is_active': 'true'
    }
    
    resp = requests.post(f"{BASE_URL}/resources/upload",
                        headers=headers,
                        files=files,
                        data=data,
                        timeout=30)
    
    if resp.status_code != 413:
        return print_result(False, f"Expected 413, got {resp.status_code}")
    
    print_result(True, "Large file rejected with 413")
    
    # POST resource upload without file
    print_test("Edge case: Upload without file should return 422")
    resp = requests.post(f"{BASE_URL}/resources/upload",
                        headers=headers,
                        data={
                            'title': 'No file',
                            'description': 'test',
                            'grades': '',
                            'is_active': 'true'
                        })
    
    if resp.status_code != 422:
        return print_result(False, f"Expected 422, got {resp.status_code}")
    
    print_result(True, "Upload without file returns 422")
    
    # Code case-insensitive
    print_test("Edge case: Library code should be case-insensitive")
    lower_code = library_code.lower()
    resp = requests.get(f"{BASE_URL}/library/check/{lower_code}")
    
    if resp.status_code != 200:
        return print_result(False, f"Lowercase code failed: {resp.status_code}")
    
    print_result(True, "Lowercase code works (case-insensitive)")
    
    # access_id of library type used on videos endpoints
    print_test("Edge case: Library access_id on videos endpoint should return 401")
    resp = requests.get(f"{BASE_URL}/videos-library/{videos_code}/videos",
                       params={"access_id": access_id_library})
    
    if resp.status_code != 401:
        return print_result(False, f"Expected 401, got {resp.status_code}")
    
    print_result(True, "Wrong access_id type returns 401")
    
    # Delete resource that doesn't belong to teacher
    print_test("Edge case: Delete resource of another teacher should return 404")
    
    # Login as teacher1
    teacher_token = login(TEACHER_USER, TEACHER_PASS)
    if not teacher_token:
        return False
    
    headers = {"Authorization": f"Bearer {teacher_token}"}
    resp = requests.delete(f"{BASE_URL}/resources/{resource_id}", headers=headers)
    
    if resp.status_code != 404:
        return print_result(False, f"Expected 404, got {resp.status_code}")
    
    print_result(True, "Cannot delete another teacher's resource (404)")
    
    return True

def test_f_cleanup():
    """Cleanup: Delete test resources"""
    
    # 16. DELETE /api/resources/{id}
    print_test("DELETE /api/resources/{id} - Cleanup test resource")
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.delete(f"{BASE_URL}/resources/{resource_id}", headers=headers)
    
    if resp.status_code != 200:
        return print_result(False, f"Delete failed: {resp.status_code} - {resp.text}")
    
    print_result(True, "Resource deleted successfully")
    
    # Verify file deleted
    print_test("Verify resource file deleted")
    resp = requests.get(f"{BASE_URL}/library/{library_code}/download/{resource_id}",
                       params={"access_id": access_id_library})
    
    if resp.status_code != 404:
        return print_result(False, f"Expected 404 after deletion, got {resp.status_code}")
    
    print_result(True, "Resource file no longer accessible (404)")
    
    # Verify not in list
    print_test("Verify resource not in list")
    resp = requests.get(f"{BASE_URL}/resources", headers=headers)
    resources = resp.json()
    
    for r in resources:
        if r.get("id") == resource_id:
            return print_result(False, "Deleted resource still in list")
    
    print_result(True, "Resource removed from list")
    
    # 32. DELETE /api/videos/{vid} (YouTube video)
    print_test("DELETE /api/videos/{vid} - Cleanup YouTube video")
    resp = requests.delete(f"{BASE_URL}/videos/{video_youtube_id}", headers=headers)
    
    if resp.status_code != 200:
        return print_result(False, f"Delete failed: {resp.status_code} - {resp.text}")
    
    print_result(True, "YouTube video deleted successfully")
    
    return True

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("RESOURCE LIBRARY BACKEND TEST SUITE")
    print("Testing: مكتبة الموارد (Resource Library)")
    print("="*80)
    
    results = []
    
    # Run test suites
    test_suites = [
        ("A) Teacher: Library codes", test_a_library_codes),
        ("B) Resources CRUD + Student flow", test_b_resources_crud),
        ("C) Videos: YouTube", test_c_videos_youtube),
        ("D) Videos: Upload", test_d_videos_upload),
        ("E) Edge Cases", test_e_edge_cases),
        ("F) Cleanup", test_f_cleanup),
    ]
    
    for name, test_func in test_suites:
        print(f"\n\n{'#'*80}")
        print(f"# TEST SUITE: {name}")
        print('#'*80)
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_result(False, f"Exception: {str(e)}")
            results.append((name, False))
    
    # Print summary
    print("\n\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = 0
    failed = 0
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print("\n" + "="*80)
    print(f"Total: {passed + failed} test suites")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print("="*80)
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
