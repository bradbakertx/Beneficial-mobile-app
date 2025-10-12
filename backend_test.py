#!/usr/bin/env python3
"""
Backend API Integration Testing for HomePro Inspect Mobile App
Testing external API at: https://homepro-inspect.preview.emergentagent.com/api
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

class APITester:
    def __init__(self):
        # Test local backend first, then external
        self.base_url = "http://localhost:8001/api"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'HomePro-Mobile-App-Test/1.0'
        })
        self.customer_token = None
        self.owner_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_data': response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        if response_data and not success:
            print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()

    def test_auth_register_customer(self):
        """Test customer registration"""
        test_data = {
            "email": "customer@homepro.test",
            "password": "test123456",
            "full_name": "John Customer",
            "phone": "1234567890",
            "role": "customer"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/register", json=test_data)
            
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.customer_token = data['token']
                    self.log_test(
                        "Customer Registration", 
                        True, 
                        f"Successfully registered customer. Token received: {self.customer_token[:20]}...",
                        data
                    )
                    return True
                else:
                    self.log_test(
                        "Customer Registration", 
                        False, 
                        "Registration succeeded but missing token or user in response",
                        data
                    )
            else:
                self.log_test(
                    "Customer Registration", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    response.json() if response.content else None
                )
        except Exception as e:
            self.log_test("Customer Registration", False, f"Exception occurred: {str(e)}")
        
        return False

    def test_auth_register_owner(self):
        """Test owner registration"""
        test_data = {
            "email": "owner@homepro.test",
            "password": "test123456",
            "full_name": "Jane Owner",
            "phone": "0987654321",
            "role": "owner"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/register", json=test_data)
            
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.owner_token = data['token']
                    self.log_test(
                        "Owner Registration", 
                        True, 
                        f"Successfully registered owner. Token received: {self.owner_token[:20]}...",
                        data
                    )
                    return True
                else:
                    self.log_test(
                        "Owner Registration", 
                        False, 
                        "Registration succeeded but missing token or user in response",
                        data
                    )
            else:
                self.log_test(
                    "Owner Registration", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    response.json() if response.content else None
                )
        except Exception as e:
            self.log_test("Owner Registration", False, f"Exception occurred: {str(e)}")
        
        return False

    def test_auth_login_customer(self):
        """Test customer login with review request credentials"""
        test_data = {
            "email": "bradbakertx@gmail.com",
            "password": "Beneficial1!"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/login", json=test_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.customer_token = data['token']
                    self.log_test(
                        "Customer Login", 
                        True, 
                        f"Successfully logged in customer. Token: {self.customer_token[:20]}...",
                        data
                    )
                    return True
                else:
                    self.log_test(
                        "Customer Login", 
                        False, 
                        "Login succeeded but missing token or user in response",
                        data
                    )
            else:
                self.log_test(
                    "Customer Login", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.json() if response.content else None
                )
        except Exception as e:
            self.log_test("Customer Login", False, f"Exception occurred: {str(e)}")
        
        return False

    def test_auth_me(self, token: str, role: str):
        """Test /auth/me endpoint"""
        if not token:
            self.log_test(f"{role.title()} Auth Me", False, f"No {role} token available")
            return False
            
        headers = {'Authorization': f'Bearer {token}'}
        
        try:
            response = self.session.get(f"{self.base_url}/auth/me", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and 'email' in data and 'role' in data:
                    self.log_test(
                        f"{role.title()} Auth Me", 
                        True, 
                        f"Successfully retrieved {role} profile. Role: {data.get('role')}",
                        data
                    )
                    return True
                else:
                    self.log_test(
                        f"{role.title()} Auth Me", 
                        False, 
                        "Profile retrieved but missing required fields",
                        data
                    )
            else:
                self.log_test(
                    f"{role.title()} Auth Me", 
                    False, 
                    f"Profile retrieval failed with status {response.status_code}",
                    response.json() if response.content else None
                )
        except Exception as e:
            self.log_test(f"{role.title()} Auth Me", False, f"Exception occurred: {str(e)}")
        
        return False

    def test_quotes_customer(self):
        """Test /quotes endpoint for customer"""
        if not self.customer_token:
            self.log_test("Customer Quotes", False, "No customer token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.customer_token}'}
        
        try:
            response = self.session.get(f"{self.base_url}/quotes", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(
                        "Customer Quotes", 
                        True, 
                        f"Successfully retrieved customer quotes. Count: {len(data)}",
                        {"count": len(data), "sample": data[:2] if data else []}
                    )
                    return True
                else:
                    self.log_test(
                        "Customer Quotes", 
                        False, 
                        "Quotes endpoint returned non-array response",
                        data
                    )
            else:
                self.log_test(
                    "Customer Quotes", 
                    False, 
                    f"Quotes retrieval failed with status {response.status_code}",
                    response.json() if response.content else None
                )
        except Exception as e:
            self.log_test("Customer Quotes", False, f"Exception occurred: {str(e)}")
        
        return False

    def test_admin_quotes(self):
        """Test /admin/quotes endpoint for owner"""
        if not self.owner_token:
            self.log_test("Admin Quotes", False, "No owner token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.owner_token}'}
        
        try:
            response = self.session.get(f"{self.base_url}/admin/quotes", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(
                        "Admin Quotes", 
                        True, 
                        f"Successfully retrieved admin quotes. Count: {len(data)}",
                        {"count": len(data), "sample": data[:2] if data else []}
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Quotes", 
                        False, 
                        "Admin quotes endpoint returned non-array response",
                        data
                    )
            else:
                self.log_test(
                    "Admin Quotes", 
                    False, 
                    f"Admin quotes retrieval failed with status {response.status_code}",
                    response.json() if response.content else None
                )
        except Exception as e:
            self.log_test("Admin Quotes", False, f"Exception occurred: {str(e)}")
        
        return False

    def test_inspections_customer(self):
        """Test /inspections endpoint for customer"""
        if not self.customer_token:
            self.log_test("Customer Inspections", False, "No customer token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.customer_token}'}
        
        try:
            response = self.session.get(f"{self.base_url}/inspections", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(
                        "Customer Inspections", 
                        True, 
                        f"Successfully retrieved customer inspections. Count: {len(data)}",
                        {"count": len(data), "sample": data[:2] if data else []}
                    )
                    return True
                else:
                    self.log_test(
                        "Customer Inspections", 
                        False, 
                        "Inspections endpoint returned non-array response",
                        data
                    )
            else:
                self.log_test(
                    "Customer Inspections", 
                    False, 
                    f"Inspections retrieval failed with status {response.status_code}",
                    response.json() if response.content else None
                )
        except Exception as e:
            self.log_test("Customer Inspections", False, f"Exception occurred: {str(e)}")
        
        return False

    def test_admin_inspections_confirmed(self):
        """Test /admin/inspections/confirmed endpoint for owner"""
        if not self.owner_token:
            self.log_test("Admin Confirmed Inspections", False, "No owner token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.owner_token}'}
        
        try:
            response = self.session.get(f"{self.base_url}/admin/inspections/confirmed", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(
                        "Admin Confirmed Inspections", 
                        True, 
                        f"Successfully retrieved confirmed inspections. Count: {len(data)}",
                        {"count": len(data), "sample": data[:2] if data else []}
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Confirmed Inspections", 
                        False, 
                        "Confirmed inspections endpoint returned non-array response",
                        data
                    )
            else:
                self.log_test(
                    "Admin Confirmed Inspections", 
                    False, 
                    f"Confirmed inspections retrieval failed with status {response.status_code}",
                    response.json() if response.content else None
                )
        except Exception as e:
            self.log_test("Admin Confirmed Inspections", False, f"Exception occurred: {str(e)}")
        
        return False

    def test_api_connectivity(self):
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                self.log_test(
                    "API Connectivity", 
                    True, 
                    f"API is reachable. Status: {response.status_code}",
                    response.json() if response.content else None
                )
                return True
            else:
                self.log_test(
                    "API Connectivity", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.json() if response.content else None
                )
        except Exception as e:
            self.log_test("API Connectivity", False, f"Cannot reach API: {str(e)}")
        
        return False

    def test_available_endpoints(self):
        """Test what endpoints are actually available"""
        endpoints_to_test = [
            "/",
            "/status", 
            "/auth/register",
            "/auth/login", 
            "/auth/me",
            "/quotes",
            "/admin/quotes",
            "/inspections",
            "/admin/inspections/confirmed"
        ]
        
        available_endpoints = []
        unavailable_endpoints = []
        
        for endpoint in endpoints_to_test:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}")
                if response.status_code != 404:
                    available_endpoints.append(f"{endpoint} (Status: {response.status_code})")
                else:
                    unavailable_endpoints.append(endpoint)
            except Exception as e:
                unavailable_endpoints.append(f"{endpoint} (Error: {str(e)})")
        
        print(f"📍 Available endpoints: {available_endpoints}")
        print(f"❌ Unavailable endpoints: {unavailable_endpoints}")
        
        self.log_test(
            "Available Endpoints", 
            True, 
            f"Found {len(available_endpoints)} available endpoints",
            {
                "available": available_endpoints,
                "unavailable": unavailable_endpoints
            }
        )

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting HomePro Inspect API Integration Tests")
        print(f"📡 Testing API at: {self.base_url}")
        print("=" * 60)
        
        # Test basic connectivity first
        if not self.test_api_connectivity():
            print("❌ API is not reachable. Stopping tests.")
            return
        
        # Check what endpoints are available
        print("🔍 Checking Available Endpoints...")
        self.test_available_endpoints()
        
        # Test authentication flow
        print("🔐 Testing Authentication Flow...")
        customer_registered = self.test_auth_register_customer()
        owner_registered = self.test_auth_register_owner()
        
        # If registration fails, try login (user might already exist)
        if not customer_registered:
            print("🔄 Registration failed, trying login...")
            self.test_auth_login_customer()
        
        # Test /auth/me endpoints
        print("👤 Testing User Profile Endpoints...")
        self.test_auth_me(self.customer_token, "customer")
        self.test_auth_me(self.owner_token, "owner")
        
        # Test data endpoints
        print("📊 Testing Data Endpoints...")
        self.test_quotes_customer()
        self.test_admin_quotes()
        self.test_inspections_customer()
        self.test_admin_inspections_confirmed()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\n📝 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        # Critical issues
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print(f"\n🚨 CRITICAL ISSUES ({len(failed_tests)} failures):")
            for result in failed_tests:
                print(f"   • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()