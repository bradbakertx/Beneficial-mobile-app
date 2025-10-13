#!/usr/bin/env python3
"""
Backend API Testing for Phase 4: Customer Time Slot Confirmation
Tests the newly implemented endpoints for customer time slot selection workflow.
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Backend URL from environment
BACKEND_URL = "https://scheduleplus-12.preview.emergentagent.com/api"

# Test credentials
OWNER_EMAIL = "bradbakertx@gmail.com"
OWNER_PASSWORD = "Beneficial1!"
CUSTOMER_EMAIL = "phase4customer@example.com"
CUSTOMER_PASSWORD = "TestPass123!"

class BackendTester:
    def __init__(self):
        self.owner_token = None
        self.customer_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def make_request(self, method, endpoint, token=None, data=None, params=None):
        """Make HTTP request with proper headers"""
        url = f"{BACKEND_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == "PATCH":
                response = requests.patch(url, headers=headers, json=data, params=params, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def login_owner(self):
        """Login as owner and get token"""
        print("\n=== OWNER LOGIN ===")
        response = self.make_request("POST", "/auth/login", data={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        
        if response and response.status_code == 200:
            data = response.json()
            self.owner_token = data.get("session_token")
            self.log_result("Owner Login", True, f"Successfully logged in as {OWNER_EMAIL}")
            return True
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Owner Login", False, f"Failed to login as owner: {error_msg}")
            return False
    
    def login_or_create_customer(self):
        """Login as customer or create if doesn't exist"""
        print("\n=== CUSTOMER LOGIN/REGISTRATION ===")
        
        # Try to login first
        response = self.make_request("POST", "/auth/login", data={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        if response and response.status_code == 200:
            data = response.json()
            self.customer_token = data.get("session_token")
            self.log_result("Customer Login", True, f"Successfully logged in as {CUSTOMER_EMAIL}")
            return True
        
        # If login failed, try to register
        print("Customer login failed, attempting registration...")
        response = self.make_request("POST", "/auth/register", data={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD,
            "name": "Test Customer",
            "role": "customer"
        })
        
        if response and response.status_code == 200:
            data = response.json()
            self.customer_token = data.get("session_token")
            self.log_result("Customer Registration", True, f"Successfully registered and logged in as {CUSTOMER_EMAIL}")
            return True
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Customer Login/Registration", False, f"Failed: {error_msg}")
            return False
    
    def setup_test_data(self):
        """Create test data: quote -> owner sets price -> customer accepts -> owner offers time slots"""
        print("\n=== SETTING UP TEST DATA ===")
        
        # Step 1: Customer creates a quote
        quote_data = {
            "property_address": "123 Test Street",
            "property_city": "Austin",
            "property_zip": "78701",
            "property_type": "Single Family",
            "square_feet": 2000,
            "year_built": 2010,
            "foundation_type": "Slab",
            "num_buildings": 1,
            "num_units": 1,
            "additional_notes": "Test quote for Phase 4 testing"
        }
        
        response = self.make_request("POST", "/quotes", token=self.customer_token, data=quote_data)
        if not response or response.status_code != 200:
            self.log_result("Create Test Quote", False, "Failed to create test quote")
            return None
        
        quote = response.json()
        quote_id = quote["id"]
        self.log_result("Create Test Quote", True, f"Created quote {quote_id}")
        
        # Step 2: Owner sets quote price
        response = self.make_request("PATCH", f"/admin/quotes/{quote_id}/price", 
                                   token=self.owner_token, params={"quote_amount": 450.00})
        if not response or response.status_code != 200:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Set Quote Price", False, f"Failed to set quote price: {error_msg}")
            return None
        
        self.log_result("Set Quote Price", True, "Owner set quote price to $450.00")
        
        # Step 3: Customer schedules inspection
        scheduling_data = {
            "quote_id": quote_id,
            "option_period_end_date": "2025-10-20",
            "option_period_unsure": False,
            "preferred_days_of_week": ["Monday", "Tuesday", "Wednesday"]
        }
        
        response = self.make_request("POST", "/inspections", token=self.customer_token, data=scheduling_data)
        if not response or response.status_code != 200:
            self.log_result("Schedule Inspection", False, "Failed to schedule inspection")
            return None
        
        inspection = response.json()
        inspection_id = inspection["id"]
        self.log_result("Schedule Inspection", True, f"Created inspection {inspection_id}")
        
        # Step 4: Owner offers time slots
        time_slots_data = {
            "offered_time_slots": [
                {"date": "2025-10-15", "time": "8am"},
                {"date": "2025-10-15", "time": "2pm"},
                {"date": "2025-10-16", "time": "10am"}
            ]
        }
        
        response = self.make_request("PATCH", f"/admin/inspections/{inspection_id}/offer-times",
                                   token=self.owner_token, data=time_slots_data)
        if not response or response.status_code != 200:
            self.log_result("Offer Time Slots", False, "Failed to offer time slots")
            return None
        
        self.log_result("Offer Time Slots", True, "Owner offered 3 time slots")
        
        # Verify inspection status is now "awaiting_customer_selection"
        response = self.make_request("GET", f"/inspections/{inspection_id}", token=self.customer_token)
        if response and response.status_code == 200:
            inspection = response.json()
            if inspection["status"] == "awaiting_customer_selection":
                self.log_result("Verify Inspection Status", True, "Inspection status is awaiting_customer_selection")
                return inspection_id, quote_id
            else:
                self.log_result("Verify Inspection Status", False, f"Expected 'awaiting_customer_selection', got '{inspection['status']}'")
        
        return None
    
    def test_confirm_time_slot_happy_path(self, inspection_id):
        """Test PATCH /api/inspections/{inspection_id}/confirm-time - Happy Path"""
        print("\n=== TESTING CONFIRM TIME SLOT - HAPPY PATH ===")
        
        confirm_data = {
            "scheduled_date": "2025-10-15",
            "scheduled_time": "8am"
        }
        
        response = self.make_request("PATCH", f"/inspections/{inspection_id}/confirm-time",
                                   token=self.customer_token, data=confirm_data)
        
        if response and response.status_code == 200:
            inspection = response.json()
            
            # Verify the response
            if (inspection["status"] == "scheduled" and 
                inspection["scheduled_date"] == "2025-10-15" and
                inspection["scheduled_time"] == "8am"):
                self.log_result("Confirm Time Slot - Happy Path", True, 
                              "Successfully confirmed time slot, status changed to 'scheduled'")
                return True
            else:
                self.log_result("Confirm Time Slot - Happy Path", False,
                              f"Response data incorrect: status={inspection.get('status')}, date={inspection.get('scheduled_date')}, time={inspection.get('scheduled_time')}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Confirm Time Slot - Happy Path", False, f"Request failed: {error_msg}")
        
        return False
    
    def test_confirm_time_slot_authorization(self, inspection_id):
        """Test authorization for confirm time slot endpoint"""
        print("\n=== TESTING CONFIRM TIME SLOT - AUTHORIZATION ===")
        
        confirm_data = {
            "scheduled_date": "2025-10-15",
            "scheduled_time": "2pm"
        }
        
        # Test 1: Owner tries to confirm (should get 403)
        response = self.make_request("PATCH", f"/inspections/{inspection_id}/confirm-time",
                                   token=self.owner_token, data=confirm_data)
        
        if response and response.status_code == 403:
            self.log_result("Confirm Time - Owner Authorization", True, "Owner correctly blocked with 403 Forbidden")
        else:
            self.log_result("Confirm Time - Owner Authorization", False, 
                          f"Expected 403, got {response.status_code if response else 'No response'}")
        
        # Test 2: No token (should get 401 or 403)
        response = self.make_request("PATCH", f"/inspections/{inspection_id}/confirm-time",
                                   token=None, data=confirm_data)
        
        if response and response.status_code in [401, 403]:
            self.log_result("Confirm Time - No Token", True, f"Correctly blocked with {response.status_code}")
        else:
            self.log_result("Confirm Time - No Token", False,
                          f"Expected 401/403, got {response.status_code if response else 'No response'}")
    
    def test_confirm_time_slot_validation(self, inspection_id):
        """Test validation for confirm time slot endpoint"""
        print("\n=== TESTING CONFIRM TIME SLOT - VALIDATION ===")
        
        # Test 1: Missing scheduled_date
        response = self.make_request("PATCH", f"/inspections/{inspection_id}/confirm-time",
                                   token=self.customer_token, data={"scheduled_time": "8am"})
        
        if response and response.status_code == 400:
            self.log_result("Confirm Time - Missing Date", True, "Correctly rejected missing scheduled_date with 400")
        else:
            self.log_result("Confirm Time - Missing Date", False,
                          f"Expected 400, got {response.status_code if response else 'No response'}")
        
        # Test 2: Missing scheduled_time
        response = self.make_request("PATCH", f"/inspections/{inspection_id}/confirm-time",
                                   token=self.customer_token, data={"scheduled_date": "2025-10-15"})
        
        if response and response.status_code == 400:
            self.log_result("Confirm Time - Missing Time", True, "Correctly rejected missing scheduled_time with 400")
        else:
            self.log_result("Confirm Time - Missing Time", False,
                          f"Expected 400, got {response.status_code if response else 'No response'}")
        
        # Test 3: Non-existent inspection
        response = self.make_request("PATCH", "/inspections/non-existent-id/confirm-time",
                                   token=self.customer_token, data={
                                       "scheduled_date": "2025-10-15",
                                       "scheduled_time": "8am"
                                   })
        
        if response and response.status_code == 404:
            self.log_result("Confirm Time - Non-existent Inspection", True, "Correctly returned 404 for non-existent inspection")
        else:
            self.log_result("Confirm Time - Non-existent Inspection", False,
                          f"Expected 404, got {response.status_code if response else 'No response'}")
    
    def test_decline_inspection_happy_path(self, inspection_id, quote_id):
        """Test DELETE /api/inspections/{inspection_id} - Happy Path"""
        print("\n=== TESTING DECLINE INSPECTION - HAPPY PATH ===")
        
        response = self.make_request("DELETE", f"/inspections/{inspection_id}", token=self.customer_token)
        
        if response and response.status_code == 200:
            result = response.json()
            
            if result.get("success") and "declined successfully" in result.get("message", ""):
                self.log_result("Decline Inspection - Happy Path", True, "Successfully declined inspection")
                
                # Verify inspection is deleted
                response = self.make_request("GET", f"/inspections/{inspection_id}", token=self.customer_token)
                if response and response.status_code == 404:
                    self.log_result("Decline Inspection - Verify Deletion", True, "Inspection correctly deleted (404)")
                else:
                    self.log_result("Decline Inspection - Verify Deletion", False, "Inspection still exists after deletion")
                
                # Verify quote status reverted to "quoted"
                response = self.make_request("GET", f"/quotes/{quote_id}", token=self.customer_token)
                if response and response.status_code == 200:
                    quote = response.json()
                    if quote["status"] == "quoted":
                        self.log_result("Decline Inspection - Quote Status Revert", True, "Quote status correctly reverted to 'quoted'")
                    else:
                        self.log_result("Decline Inspection - Quote Status Revert", False, f"Quote status is '{quote['status']}', expected 'quoted'")
                
                return True
            else:
                self.log_result("Decline Inspection - Happy Path", False, f"Unexpected response: {result}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Decline Inspection - Happy Path", False, f"Request failed: {error_msg}")
        
        return False
    
    def test_decline_inspection_authorization(self):
        """Test authorization for decline inspection endpoint"""
        print("\n=== TESTING DECLINE INSPECTION - AUTHORIZATION ===")
        
        # Create a new inspection for this test
        test_data = self.setup_test_data()
        if not test_data:
            self.log_result("Decline Inspection - Authorization Setup", False, "Failed to setup test data")
            return
        
        inspection_id, quote_id = test_data
        
        # Test 1: Owner tries to decline (should get 403)
        response = self.make_request("DELETE", f"/inspections/{inspection_id}", token=self.owner_token)
        
        if response and response.status_code == 403:
            self.log_result("Decline Inspection - Owner Authorization", True, "Owner correctly blocked with 403 Forbidden")
        else:
            self.log_result("Decline Inspection - Owner Authorization", False,
                          f"Expected 403, got {response.status_code if response else 'No response'}")
        
        # Test 2: No token (should get 401 or 403)
        response = self.make_request("DELETE", f"/inspections/{inspection_id}", token=None)
        
        if response and response.status_code in [401, 403]:
            self.log_result("Decline Inspection - No Token", True, f"Correctly blocked with {response.status_code}")
        else:
            self.log_result("Decline Inspection - No Token", False,
                          f"Expected 401/403, got {response.status_code if response else 'No response'}")
        
        # Clean up - customer declines the inspection
        self.make_request("DELETE", f"/inspections/{inspection_id}", token=self.customer_token)
    
    def test_decline_inspection_edge_cases(self):
        """Test edge cases for decline inspection endpoint"""
        print("\n=== TESTING DECLINE INSPECTION - EDGE CASES ===")
        
        # Test: Non-existent inspection
        response = self.make_request("DELETE", "/inspections/non-existent-id", token=self.customer_token)
        
        if response and response.status_code == 404:
            self.log_result("Decline Inspection - Non-existent", True, "Correctly returned 404 for non-existent inspection")
        else:
            self.log_result("Decline Inspection - Non-existent", False,
                          f"Expected 404, got {response.status_code if response else 'No response'}")
    
    def run_all_tests(self):
        """Run all Phase 4 backend tests"""
        print("=" * 80)
        print("PHASE 4 BACKEND TESTING: Customer Time Slot Confirmation")
        print("=" * 80)
        
        # Step 1: Authentication
        if not self.login_owner():
            print("❌ CRITICAL: Owner login failed. Cannot proceed with tests.")
            return False
        
        if not self.login_or_create_customer():
            print("❌ CRITICAL: Customer login/registration failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Setup test data
        test_data = self.setup_test_data()
        if not test_data:
            print("❌ CRITICAL: Failed to setup test data. Cannot proceed with Phase 4 tests.")
            return False
        
        inspection_id, quote_id = test_data
        
        # Step 3: Test confirm time slot endpoint
        self.test_confirm_time_slot_happy_path(inspection_id)
        self.test_confirm_time_slot_authorization(inspection_id)
        self.test_confirm_time_slot_validation(inspection_id)
        
        # Step 4: Test decline inspection endpoint
        # Note: We need fresh test data since confirm-time changes the inspection status
        test_data_2 = self.setup_test_data()
        if test_data_2:
            inspection_id_2, quote_id_2 = test_data_2
            self.test_decline_inspection_happy_path(inspection_id_2, quote_id_2)
        
        self.test_decline_inspection_authorization()
        self.test_decline_inspection_edge_cases()
        
        # Step 5: Summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n" + "=" * 80)

def main():
    """Run the backend tests"""
    tester = BackendTester()
    
    print("🚀 Starting Backend API Tests for Phase 4: Customer Time Slot Confirmation")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Owner Account: {OWNER_EMAIL}")
    print(f"Customer Account: {CUSTOMER_EMAIL}")
    
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests completed!")
        sys.exit(0)
    else:
        print("\n💥 Tests completed with issues!")
        sys.exit(1)

if __name__ == "__main__":
    main()