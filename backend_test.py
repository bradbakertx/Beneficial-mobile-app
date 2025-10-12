#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Beneficial Inspections Mobile App
Tests all authentication, quote, inspection, and admin endpoints
"""

import requests
import json
import uuid
from datetime import datetime
import sys

# Configuration - Test both local and external URLs
EXTERNAL_URL = "https://inspecto-mobile.preview.emergentagent.com/api"
LOCAL_URL = "http://localhost:8001/api"
TEST_CREDENTIALS = {
    "email": "bradbakertx@gmail.com",
    "password": "Beneficial1!"
}

class BackendTester:
    def __init__(self):
        self.external_url = EXTERNAL_URL
        self.local_url = LOCAL_URL
        self.base_url = None  # Will be set after connectivity test
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
    def make_request(self, method, endpoint, data=None, params=None, auth_required=True):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_required and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, params=params, timeout=10)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=headers, json=data, params=params, timeout=10)
            elif method.upper() == "PATCH":
                response = self.session.patch(url, headers=headers, json=data, params=params, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def test_connectivity(self):
        """Test connectivity to both URLs and choose the working one"""
        print("\n=== Testing API Connectivity ===")
        
        # Test external URL first
        try:
            response = requests.get(f"{self.external_url}/", timeout=5)
            if response.status_code == 200:
                self.base_url = self.external_url
                data = response.json()
                self.log_result("External API Connectivity", True, f"External API accessible: {data.get('message', 'OK')}")
                return True
        except Exception as e:
            self.log_result("External API Connectivity", False, f"External API failed: {e}")
        
        # Test local URL
        try:
            response = requests.get(f"{self.local_url}/", timeout=5)
            if response.status_code == 200:
                self.base_url = self.local_url
                data = response.json()
                self.log_result("Local API Connectivity", True, f"Local API accessible: {data.get('message', 'OK')}")
                return True
        except Exception as e:
            self.log_result("Local API Connectivity", False, f"Local API failed: {e}")
        
        self.log_result("API Connectivity", False, "Both external and local APIs are unreachable")
        return False
    
    def test_authentication_login(self):
        """Test user login"""
        print("\n=== Testing Authentication - Login ===")
        
        response = self.make_request("POST", "/auth/login", data=TEST_CREDENTIALS, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "session_token" in data and "user" in data:
                self.auth_token = data["session_token"]
                self.user_data = data["user"]
                self.log_result("Login", True, f"Login successful for {data['user']['email']} (Role: {data['user']['role']})")
                return True
            else:
                self.log_result("Login", False, "Login response missing required fields")
                return False
        else:
            status_code = response.status_code if response else "No Response"
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            self.log_result("Login", False, f"Login failed (Status: {status_code}, Error: {error_msg})")
            return False
    
    def test_authentication_me(self):
        """Test /auth/me endpoint"""
        print("\n=== Testing Authentication - Get Me ===")
        
        if not self.auth_token:
            self.log_result("Get Me", False, "No auth token available")
            return False
            
        response = self.make_request("GET", "/auth/me")
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("email") == TEST_CREDENTIALS["email"]:
                self.log_result("Get Me", True, f"User info retrieved: {data['name']} ({data['role']})")
                return True
            else:
                self.log_result("Get Me", False, "User info mismatch")
                return False
        else:
            status_code = response.status_code if response else "No Response"
            self.log_result("Get Me", False, f"Get me failed (Status: {status_code})")
            return False
    
    def test_authentication_register(self):
        """Test user registration with new user"""
        print("\n=== Testing Authentication - Register ===")
        
        # Create unique test user
        test_user = {
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPassword123!",
            "name": "Test Customer",
            "role": "customer"
        }
        
        response = self.make_request("POST", "/auth/register", data=test_user, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if "session_token" in data and "user" in data:
                self.log_result("Register", True, f"Registration successful for {data['user']['email']}")
                return True
            else:
                self.log_result("Register", False, "Registration response missing required fields")
                return False
        else:
            status_code = response.status_code if response else "No Response"
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            self.log_result("Register", False, f"Registration failed (Status: {status_code}, Error: {error_msg})")
            return False
    
    def test_quotes_create(self):
        """Test quote creation (requires customer role)"""
        print("\n=== Testing Quotes - Create ===")
        
        if not self.auth_token:
            self.log_result("Create Quote", False, "No auth token available")
            return False, None
            
        # Check if user is owner (owners can't create quotes, only customers can)
        if self.user_data and self.user_data.get("role") == "owner":
            # Test that owners are properly blocked
            quote_data = {
                "property_address": "123 Test Street, Austin, TX 78701",
                "property_type": "Single Family Home",
                "property_size": 2500,
                "additional_notes": "Test quote from owner (should fail)"
            }
            
            response = self.make_request("POST", "/quotes", data=quote_data)
            
            if response and response.status_code == 403:
                self.log_result("Create Quote (Owner Block)", True, "Correctly blocked owner from creating quotes")
                return False, None
            else:
                self.log_result("Create Quote (Owner Block)", False, "Failed to block owner from creating quotes")
                return False, None
        else:
            # Test normal quote creation for customer
            quote_data = {
                "property_address": "456 Customer Lane, Austin, TX 78702",
                "property_type": "Townhouse",
                "property_size": 1800,
                "additional_notes": "Test quote creation"
            }
            
            response = self.make_request("POST", "/quotes", data=quote_data)
            
            if response and response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("property_address") == quote_data["property_address"]:
                    self.log_result("Create Quote", True, f"Quote created successfully (ID: {data['id']})")
                    return True, data["id"]
                else:
                    self.log_result("Create Quote", False, "Quote response missing required fields")
                    return False, None
            else:
                status_code = response.status_code if response else "No Response"
                self.log_result("Create Quote", False, f"Quote creation failed (Status: {status_code})")
                return False, None
    
    def test_quotes_list(self):
        """Test listing quotes"""
        print("\n=== Testing Quotes - List ===")
        
        if not self.auth_token:
            self.log_result("List Quotes", False, "No auth token available")
            return False
            
        response = self.make_request("GET", "/quotes")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("List Quotes", True, f"Retrieved {len(data)} quotes")
                return True
            else:
                self.log_result("List Quotes", False, "Invalid response format")
                return False
        elif response and response.status_code == 403:
            # If user is owner, they should be blocked from customer quotes endpoint
            self.log_result("List Quotes (Role Check)", True, "Correctly blocked non-customer from customer quotes")
            return True
        else:
            status_code = response.status_code if response else "No Response"
            self.log_result("List Quotes", False, f"List quotes failed (Status: {status_code})")
            return False
    
    def test_admin_quotes(self):
        """Test admin quotes endpoint (owner only)"""
        print("\n=== Testing Admin Quotes ===")
        
        if not self.auth_token:
            self.log_result("Admin Quotes", False, "No auth token available")
            return False
            
        response = self.make_request("GET", "/admin/quotes")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Admin Quotes", True, f"Retrieved {len(data)} quotes as admin")
                return True
            else:
                self.log_result("Admin Quotes", False, "Invalid response format")
                return False
        elif response and response.status_code == 403:
            self.log_result("Admin Quotes (Access Control)", True, "Correctly blocked non-owner from admin quotes")
            return True
        else:
            status_code = response.status_code if response else "No Response"
            self.log_result("Admin Quotes", False, f"Admin quotes failed (Status: {status_code})")
            return False
    
    def test_quote_pricing(self):
        """Test setting quote price (owner only)"""
        print("\n=== Testing Quote Pricing ===")
        
        if not self.auth_token:
            self.log_result("Quote Pricing", False, "No auth token available")
            return False
            
        # First get all quotes to find one to price
        response = self.make_request("GET", "/admin/quotes")
        
        if not response or response.status_code != 200:
            self.log_result("Quote Pricing", False, "Cannot access admin quotes to test pricing")
            return False
            
        quotes = response.json()
        if not quotes:
            self.log_result("Quote Pricing", False, "No quotes available to test pricing")
            return False
            
        # Try to set price on first quote
        quote_id = quotes[0]["id"]
        params = {"quote_amount": 750.00}
        
        response = self.make_request("PATCH", f"/admin/quotes/{quote_id}/price", params=params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("quote_amount") == 750.00:
                self.log_result("Quote Pricing", True, f"Successfully set quote price to $750.00")
                return True
            else:
                self.log_result("Quote Pricing", False, "Price not updated correctly")
                return False
        elif response and response.status_code == 403:
            self.log_result("Quote Pricing (Access Control)", True, "Correctly blocked non-owner from setting prices")
            return True
        else:
            status_code = response.status_code if response else "No Response"
            self.log_result("Quote Pricing", False, f"Quote pricing failed (Status: {status_code})")
            return False
    
    def test_inspections_list(self):
        """Test listing inspections"""
        print("\n=== Testing Inspections - List ===")
        
        if not self.auth_token:
            self.log_result("List Inspections", False, "No auth token available")
            return False
            
        response = self.make_request("GET", "/inspections")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("List Inspections", True, f"Retrieved {len(data)} inspections")
                return True
            else:
                self.log_result("List Inspections", False, "Invalid response format")
                return False
        elif response and response.status_code == 403:
            self.log_result("List Inspections (Role Check)", True, "Correctly blocked non-customer from customer inspections")
            return True
        else:
            status_code = response.status_code if response else "No Response"
            self.log_result("List Inspections", False, f"List inspections failed (Status: {status_code})")
            return False
    
    def test_admin_inspections(self):
        """Test admin inspection endpoints"""
        print("\n=== Testing Admin Inspections ===")
        
        if not self.auth_token:
            self.log_result("Admin Inspections", False, "No auth token available")
            return False
            
        # Test pending scheduling endpoint
        response = self.make_request("GET", "/admin/inspections/pending-scheduling")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Admin Inspections (Pending)", True, f"Retrieved {len(data)} pending inspections")
            else:
                self.log_result("Admin Inspections (Pending)", False, "Invalid response format")
                return False
        elif response and response.status_code == 403:
            self.log_result("Admin Inspections (Access Control)", True, "Correctly blocked non-owner from admin inspections")
            return True
        else:
            status_code = response.status_code if response else "No Response"
            self.log_result("Admin Inspections (Pending)", False, f"Admin inspections failed (Status: {status_code})")
            return False
            
        # Test confirmed inspections endpoint
        response = self.make_request("GET", "/admin/inspections/confirmed")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Admin Inspections (Confirmed)", True, f"Retrieved {len(data)} confirmed inspections")
                return True
            else:
                self.log_result("Admin Inspections (Confirmed)", False, "Invalid response format")
                return False
        else:
            status_code = response.status_code if response else "No Response"
            self.log_result("Admin Inspections (Confirmed)", False, f"Admin confirmed inspections failed (Status: {status_code})")
            return False
    
    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n=== Testing Dashboard Stats ===")
        
        if not self.auth_token:
            self.log_result("Dashboard Stats", False, "No auth token available")
            return False
            
        response = self.make_request("GET", "/admin/dashboard/stats")
        
        if response and response.status_code == 200:
            data = response.json()
            expected_keys = ["pending_quotes", "pending_scheduling", "active_inspections"]
            if all(key in data for key in expected_keys):
                self.log_result("Dashboard Stats", True, f"Stats retrieved: {data}")
                return True
            else:
                self.log_result("Dashboard Stats", False, "Stats response missing required fields")
                return False
        elif response and response.status_code == 403:
            self.log_result("Dashboard Stats (Access Control)", True, "Correctly blocked non-owner from dashboard stats")
            return True
        else:
            status_code = response.status_code if response else "No Response"
            self.log_result("Dashboard Stats", False, f"Dashboard stats failed (Status: {status_code})")
            return False
    
    def run_all_tests(self):
        """Run comprehensive backend API tests"""
        print(f"🚀 Starting Comprehensive Backend API Testing")
        print(f"📍 External URL: {self.external_url}")
        print(f"📍 Local URL: {self.local_url}")
        print(f"👤 Test User: {TEST_CREDENTIALS['email']}")
        
        # Test connectivity first
        if not self.test_connectivity():
            print("\n❌ CRITICAL: No API connectivity. Cannot proceed with testing.")
            return False
            
        print(f"\n✅ Using API at: {self.base_url}")
            
        # Test authentication
        if not self.test_authentication_login():
            print("\n❌ CRITICAL: Login failed. Cannot proceed with authenticated tests.")
            return False
            
        # Test /auth/me
        self.test_authentication_me()
        
        # Test registration
        self.test_authentication_register()
        
        # Test quote endpoints
        quote_created, quote_id = self.test_quotes_create()
        self.test_quotes_list()
        self.test_admin_quotes()
        self.test_quote_pricing()
        
        # Test inspection endpoints
        self.test_inspections_list()
        self.test_admin_inspections()
        
        # Test dashboard
        self.test_dashboard_stats()
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend API is working correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Check the results above.")
        sys.exit(1)