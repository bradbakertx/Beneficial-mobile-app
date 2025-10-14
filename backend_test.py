#!/usr/bin/env python3
"""
Backend API Testing for Calendar Invite/Cancellation Feature
Testing inspector change functionality with calendar invites/cancellations
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://beneinspect.preview.emergentagent.com/api"
TEST_EMAIL = "bradbakertx@gmail.com"
TEST_PASSWORD = "Beneficial1!"

class CalendarInviteTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        
    def print_step(self, step_num, description):
        """Print test step"""
        print(f"\n📋 Step {step_num}: {description}")
        print("-" * 50)

    def login(self):
        """Login with test credentials"""
        print("🔐 Logging in with test credentials...")
        
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("session_token")
                self.user_data = data.get("user")
                
                # Set authorization header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                
                self.log_result(
                    "Authentication", 
                    True, 
                    f"Logged in as {self.user_data.get('name')} ({self.user_data.get('role')})",
                    {"user_id": self.user_data.get('id'), "role": self.user_data.get('role')}
                )
                return True
            else:
                self.log_result(
                    "Authentication", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Login error: {str(e)}")
            return False
    def test_get_inspectors_endpoint(self):
        """Test GET /api/users/inspectors endpoint"""
        print("🔍 Testing GET /api/users/inspectors endpoint...")
        
        try:
            response = self.session.get(f"{BASE_URL}/users/inspectors")
            
            if response.status_code == 200:
                data = response.json()
                inspectors = data.get("inspectors", [])
                
                # Validate response structure
                if not isinstance(inspectors, list):
                    self.log_result(
                        "GET /api/users/inspectors - Response Structure",
                        False,
                        "Response should contain 'inspectors' array",
                        data
                    )
                    return False
                
                # Check if inspectors have required fields
                required_fields = ["id", "name", "email", "role"]
                valid_structure = True
                
                for inspector in inspectors:
                    for field in required_fields:
                        if field not in inspector:
                            valid_structure = False
                            break
                    if not valid_structure:
                        break
                
                if valid_structure:
                    # Check if only inspectors and owners are returned
                    valid_roles = all(
                        insp.get("role") in ["inspector", "owner"] 
                        for insp in inspectors
                    )
                    
                    if valid_roles:
                        self.log_result(
                            "GET /api/users/inspectors - Success",
                            True,
                            f"Retrieved {len(inspectors)} inspectors with valid roles",
                            {"inspector_count": len(inspectors), "inspectors": inspectors}
                        )
                        return inspectors
                    else:
                        self.log_result(
                            "GET /api/users/inspectors - Invalid Roles",
                            False,
                            "Some users have roles other than 'inspector' or 'owner'",
                            inspectors
                        )
                        return False
                else:
                    self.log_result(
                        "GET /api/users/inspectors - Missing Fields",
                        False,
                        f"Inspectors missing required fields: {required_fields}",
                        inspectors
                    )
                    return False
                    
            elif response.status_code == 403:
                self.log_result(
                    "GET /api/users/inspectors - Authorization",
                    True,
                    "Correctly returned 403 for non-owner user (if applicable)",
                    {"status_code": 403, "response": response.text}
                )
                return False
            else:
                self.log_result(
                    "GET /api/users/inspectors - Error",
                    False,
                    f"Unexpected status code: {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result(
                "GET /api/users/inspectors - Exception",
                False,
                f"Request failed: {str(e)}"
            )
            return False

    def get_existing_inspection(self):
        """Get an existing inspection for testing updates"""
        print("🔍 Finding existing inspection for testing...")
        
        try:
            # Try to get confirmed inspections first
            response = self.session.get(f"{BASE_URL}/admin/inspections/confirmed")
            
            if response.status_code == 200:
                inspections = response.json()
                if inspections:
                    inspection = inspections[0]
                    self.log_result(
                        "Find Existing Inspection",
                        True,
                        f"Found inspection {inspection.get('id')} at {inspection.get('property_address')}",
                        {"inspection_id": inspection.get('id')}
                    )
                    return inspection
            
            # If no confirmed inspections, try pending scheduling
            response = self.session.get(f"{BASE_URL}/admin/inspections/pending-scheduling")
            
            if response.status_code == 200:
                inspections = response.json()
                if inspections:
                    inspection = inspections[0]
                    self.log_result(
                        "Find Existing Inspection",
                        True,
                        f"Found pending inspection {inspection.get('id')} at {inspection.get('property_address')}",
                        {"inspection_id": inspection.get('id')}
                    )
                    return inspection
            
            self.log_result(
                "Find Existing Inspection",
                False,
                "No existing inspections found for testing"
            )
            return None
            
        except Exception as e:
            self.log_result(
                "Find Existing Inspection",
                False,
                f"Error finding inspection: {str(e)}"
            )
            return None

    def test_inspector_assignment(self, inspection_id, inspector_data):
        """Test PATCH /api/admin/inspections/{inspection_id}/update with inspector assignment"""
        print(f"🔧 Testing inspector assignment for inspection {inspection_id}...")
        
        if not inspector_data:
            self.log_result(
                "Inspector Assignment - No Inspector Data",
                False,
                "No inspector data available for testing"
            )
            return False
        
        # Use the first inspector for testing
        test_inspector = inspector_data[0]
        
        update_data = {
            "inspector_id": test_inspector.get("id"),
            "inspector_email": test_inspector.get("email")
        }
        
        try:
            response = self.session.patch(
                f"{BASE_URL}/admin/inspections/{inspection_id}/update",
                json=update_data
            )
            
            if response.status_code == 200:
                updated_inspection = response.json()
                
                # Verify inspector fields were set
                inspector_id_set = updated_inspection.get("inspector_id") == test_inspector.get("id")
                inspector_email_set = updated_inspection.get("inspector_email") == test_inspector.get("email")
                inspector_name_set = updated_inspection.get("inspector_name") == test_inspector.get("name")
                
                if inspector_id_set and inspector_email_set and inspector_name_set:
                    self.log_result(
                        "Inspector Assignment - Success",
                        True,
                        f"Successfully assigned inspector {test_inspector.get('name')} to inspection",
                        {
                            "inspector_id": updated_inspection.get("inspector_id"),
                            "inspector_email": updated_inspection.get("inspector_email"),
                            "inspector_name": updated_inspection.get("inspector_name")
                        }
                    )
                    return updated_inspection
                else:
                    self.log_result(
                        "Inspector Assignment - Field Validation",
                        False,
                        "Inspector fields not properly set in response",
                        {
                            "expected": test_inspector,
                            "actual": {
                                "inspector_id": updated_inspection.get("inspector_id"),
                                "inspector_email": updated_inspection.get("inspector_email"),
                                "inspector_name": updated_inspection.get("inspector_name")
                            }
                        }
                    )
                    return False
            else:
                self.log_result(
                    "Inspector Assignment - Error",
                    False,
                    f"Update failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Inspector Assignment - Exception",
                False,
                f"Request failed: {str(e)}"
            )
            return False

    def test_inspector_change(self, inspection_id, inspector_data):
        """Test changing inspector to a different one"""
        print(f"🔄 Testing inspector change for inspection {inspection_id}...")
        
        if not inspector_data or len(inspector_data) < 2:
            self.log_result(
                "Inspector Change - Insufficient Data",
                False,
                "Need at least 2 inspectors to test inspector change"
            )
            return False
        
        # Use the second inspector for testing change
        new_inspector = inspector_data[1] if len(inspector_data) > 1 else inspector_data[0]
        
        update_data = {
            "inspector_id": new_inspector.get("id"),
            "inspector_email": new_inspector.get("email")
        }
        
        try:
            response = self.session.patch(
                f"{BASE_URL}/admin/inspections/{inspection_id}/update",
                json=update_data
            )
            
            if response.status_code == 200:
                updated_inspection = response.json()
                
                # Verify inspector was changed
                inspector_changed = (
                    updated_inspection.get("inspector_id") == new_inspector.get("id") and
                    updated_inspection.get("inspector_email") == new_inspector.get("email") and
                    updated_inspection.get("inspector_name") == new_inspector.get("name")
                )
                
                if inspector_changed:
                    self.log_result(
                        "Inspector Change - Success",
                        True,
                        f"Successfully changed inspector to {new_inspector.get('name')}",
                        {
                            "new_inspector_id": updated_inspection.get("inspector_id"),
                            "new_inspector_email": updated_inspection.get("inspector_email"),
                            "new_inspector_name": updated_inspection.get("inspector_name")
                        }
                    )
                    return True
                else:
                    self.log_result(
                        "Inspector Change - Validation Failed",
                        False,
                        "Inspector change not reflected in response",
                        updated_inspection
                    )
                    return False
            else:
                self.log_result(
                    "Inspector Change - Error",
                    False,
                    f"Change failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Inspector Change - Exception",
                False,
                f"Request failed: {str(e)}"
            )
            return False

    def test_non_owner_access(self):
        """Test that non-owners get 403 error for inspectors endpoint"""
        print("🚫 Testing non-owner access restrictions...")
        
        # This test assumes the current user is an owner
        # In a real scenario, we'd need a non-owner account to test this properly
        if self.user_data and self.user_data.get("role") != "owner":
            try:
                response = self.session.get(f"{BASE_URL}/users/inspectors")
                
                if response.status_code == 403:
                    self.log_result(
                        "Non-Owner Access Restriction",
                        True,
                        "Correctly blocked non-owner from accessing inspectors endpoint"
                    )
                    return True
                else:
                    self.log_result(
                        "Non-Owner Access Restriction",
                        False,
                        f"Non-owner should get 403, got {response.status_code}",
                        response.text
                    )
                    return False
            except Exception as e:
                self.log_result(
                    "Non-Owner Access Restriction",
                    False,
                    f"Test failed: {str(e)}"
                )
                return False
        else:
            self.log_result(
                "Non-Owner Access Restriction",
                True,
                "Skipped - current user is owner (cannot test non-owner restriction with owner account)"
            )
            return True

    def run_all_tests(self):
        """Run all inspector selection tests"""
        print("🚀 Starting Inspector Selection Feature Tests")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login():
            print("❌ Cannot proceed without authentication")
            return False
        
        # Step 2: Test GET /api/users/inspectors
        inspectors = self.test_get_inspectors_endpoint()
        
        # Step 3: Test non-owner access (if applicable)
        self.test_non_owner_access()
        
        # Step 4: Find existing inspection
        existing_inspection = self.get_existing_inspection()
        
        if existing_inspection and inspectors:
            inspection_id = existing_inspection.get("id")
            
            # Step 5: Test inspector assignment
            updated_inspection = self.test_inspector_assignment(inspection_id, inspectors)
            
            # Step 6: Test inspector change
            if updated_inspection:
                self.test_inspector_change(inspection_id, inspectors)
        else:
            print("⚠️  Skipping inspector assignment tests - no inspection or inspectors available")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print(f"\nSuccess Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = InspectorSelectionTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Inspector Selection feature is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed. Please check the details above.")
        sys.exit(1)