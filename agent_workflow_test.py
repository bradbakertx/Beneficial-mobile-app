#!/usr/bin/env python3
"""
Focused Agent Workflow Redesign Testing
Tests the complete agent workflow end-to-end as specified in the review request.
"""

import requests
import json
import time
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://inspectapp-4.preview.emergentagent.com/api"
TEST_AGENT_EMAIL = "test.agent@example.com"
TEST_AGENT_PASSWORD = "TestAgent123!"
TEST_OWNER_EMAIL = "bradbakertx@gmail.com"
TEST_OWNER_PASSWORD = "Beneficial1!"

class AgentWorkflowTester:
    def __init__(self):
        self.session = requests.Session()
        self.agent_token = None
        self.owner_token = None
        self.test_quote_id = None
        self.test_inspection_id = None
        self.results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {}
        }
        self.results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None, token=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        request_headers = {"Content-Type": "application/json"}
        
        if token:
            request_headers["Authorization"] = f"Bearer {token}"
        if headers:
            request_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=request_headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == "PATCH":
                response = self.session.patch(url, json=data, headers=request_headers, params=params, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def test_agent_login_or_create(self):
        """Test agent login or create test agent if doesn't exist"""
        print("\n=== Testing Agent Authentication ===")
        
        # Try to login first
        login_data = {
            "email": TEST_AGENT_EMAIL,
            "password": TEST_AGENT_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            self.agent_token = data.get("session_token")
            user = data.get("user", {})
            
            if user.get("role") == "agent":
                self.log_result("Agent Login", True, f"Successfully logged in as agent: {user.get('name')}")
                return True
            else:
                self.log_result("Agent Login", False, f"User exists but role is {user.get('role')}, not agent")
                return False
        
        # If login failed, try to create agent
        print("Agent login failed, attempting to create test agent...")
        
        register_data = {
            "email": TEST_AGENT_EMAIL,
            "password": TEST_AGENT_PASSWORD,
            "name": "Test Agent",
            "role": "agent",
            "phone": "555-0123",
            "terms_accepted": True,
            "privacy_policy_accepted": True,
            "marketing_consent": False
        }
        
        response = self.make_request("POST", "/auth/register", register_data)
        
        if response and response.status_code == 200:
            data = response.json()
            self.agent_token = data.get("session_token")
            user = data.get("user", {})
            self.log_result("Agent Registration", True, f"Successfully created and logged in as agent: {user.get('name')}")
            return True
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Agent Authentication", False, f"Failed to login or create agent: {error_msg}")
            return False
    
    def test_owner_login(self):
        """Test owner login"""
        print("\n=== Testing Owner Authentication ===")
        
        login_data = {
            "email": TEST_OWNER_EMAIL,
            "password": TEST_OWNER_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            self.owner_token = data.get("session_token")
            user = data.get("user", {})
            
            if user.get("role") == "owner":
                self.log_result("Owner Login", True, f"Successfully logged in as owner: {user.get('name')}")
                return True
            else:
                self.log_result("Owner Login", False, f"User role is {user.get('role')}, not owner")
                return False
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Owner Login", False, f"Failed to login as owner: {error_msg}")
            return False
    
    def test_agent_create_quote(self):
        """Test agent creating a quote"""
        print("\n=== Testing Agent Quote Creation ===")
        
        if not self.agent_token:
            self.log_result("Agent Quote Creation", False, "No agent token available")
            return False
        
        quote_data = {
            "property_address": "123 Test Property Lane",
            "property_city": "Austin",
            "property_zip": "78701",
            "property_type": "Single Family",
            "square_feet": 2500,
            "year_built": 2010,
            "foundation_type": "Slab",
            "num_buildings": 1,
            "num_units": 1,
            "additional_notes": "Agent workflow test - property inspection needed for client",
            "wdi_report": True,
            "sprinkler_system": False,
            "detached_building": False,
            "detached_building_type": None,
            "detached_building_sqft": None
        }
        
        response = self.make_request("POST", "/quotes", quote_data, token=self.agent_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.test_quote_id = data.get("id")
            
            # Verify agent quote fields
            is_agent_quote = data.get("is_agent_quote")
            agent_name = data.get("agent_name")
            agent_email = data.get("agent_email")
            customer_email = data.get("customer_email")
            customer_name = data.get("customer_name")
            
            success = (
                is_agent_quote == True and
                agent_name and
                agent_email == TEST_AGENT_EMAIL and
                customer_email == "" and
                customer_name == ""
            )
            
            if success:
                self.log_result("Agent Quote Creation", True, f"Agent quote created successfully with ID: {self.test_quote_id}")
                self.log_result("Agent Quote Validation", True, f"is_agent_quote={is_agent_quote}, agent_email={agent_email}, customer fields empty")
            else:
                self.log_result("Agent Quote Creation", False, f"Quote created but validation failed", {
                    "is_agent_quote": is_agent_quote,
                    "agent_name": agent_name,
                    "agent_email": agent_email,
                    "customer_email": customer_email,
                    "customer_name": customer_name
                })
            return success
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Agent Quote Creation", False, f"Failed to create quote: {error_msg}")
            return False
    
    def test_owner_view_quotes(self):
        """Test owner viewing all quotes including agent quotes"""
        print("\n=== Testing Owner Quote Viewing ===")
        
        if not self.owner_token:
            self.log_result("Owner Quote Viewing", False, "No owner token available")
            return False
        
        response = self.make_request("GET", "/admin/quotes", token=self.owner_token)
        
        if response and response.status_code == 200:
            quotes = response.json()
            
            # Find our test agent quote
            agent_quote = None
            for quote in quotes:
                if quote.get("id") == self.test_quote_id:
                    agent_quote = quote
                    break
            
            if agent_quote:
                is_agent_quote = agent_quote.get("is_agent_quote")
                if is_agent_quote:
                    self.log_result("Owner Quote Viewing", True, f"Owner can see agent quote with is_agent_quote=True")
                    return True
                else:
                    self.log_result("Owner Quote Viewing", False, f"Agent quote found but is_agent_quote={is_agent_quote}")
                    return False
            else:
                self.log_result("Owner Quote Viewing", False, f"Agent quote with ID {self.test_quote_id} not found in owner's quote list")
                return False
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Owner Quote Viewing", False, f"Failed to get quotes: {error_msg}")
            return False
    
    def test_owner_set_quote_price(self):
        """Test owner setting price for agent quote"""
        print("\n=== Testing Owner Quote Pricing ===")
        
        if not self.owner_token or not self.test_quote_id:
            self.log_result("Owner Quote Pricing", False, "Missing owner token or quote ID")
            return False
        
        quote_amount = 450.00
        response = self.make_request("PATCH", f"/admin/quotes/{self.test_quote_id}/price", 
                                   token=self.owner_token, params={"quote_amount": quote_amount})
        
        if response and response.status_code == 200:
            data = response.json()
            returned_amount = data.get("quote_amount")
            status = data.get("status")
            
            if returned_amount == quote_amount and status == "quoted":
                self.log_result("Owner Quote Pricing", True, f"Quote price set to ${quote_amount}, status: {status}")
                return True
            else:
                self.log_result("Owner Quote Pricing", False, f"Price set but validation failed: amount={returned_amount}, status={status}")
                return False
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Owner Quote Pricing", False, f"Failed to set quote price: {error_msg}")
            return False
    
    def test_agent_view_quotes(self):
        """Test agent viewing their quotes with price"""
        print("\n=== Testing Agent Quote Viewing ===")
        
        if not self.agent_token:
            self.log_result("Agent Quote Viewing", False, "No agent token available")
            return False
        
        response = self.make_request("GET", "/quotes", token=self.agent_token)
        
        if response and response.status_code == 200:
            quotes = response.json()
            
            # Find our test quote
            test_quote = None
            for quote in quotes:
                if quote.get("id") == self.test_quote_id:
                    test_quote = quote
                    break
            
            if test_quote:
                quote_amount = test_quote.get("quote_amount")
                status = test_quote.get("status")
                
                if quote_amount == 450.00 and status == "quoted":
                    self.log_result("Agent Quote Viewing", True, f"Agent can see quoted price: ${quote_amount}, status: {status}")
                    return True
                else:
                    self.log_result("Agent Quote Viewing", False, f"Quote found but price/status incorrect: amount={quote_amount}, status={status}")
                    return False
            else:
                self.log_result("Agent Quote Viewing", False, f"Test quote {self.test_quote_id} not found in agent's quotes")
                return False
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Agent Quote Viewing", False, f"Failed to get agent quotes: {error_msg}")
            return False
    
    def test_agent_schedule_inspection(self):
        """Test agent scheduling inspection from quote"""
        print("\n=== Testing Agent Inspection Scheduling ===")
        
        if not self.agent_token or not self.test_quote_id:
            self.log_result("Agent Inspection Scheduling", False, "Missing agent token or quote ID")
            return False
        
        # Calculate option period end date (7 days from now)
        option_end = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        scheduling_data = {
            "quote_id": self.test_quote_id,
            "option_period_end_date": option_end,
            "option_period_unsure": False,
            "preferred_days_of_week": ["Monday", "Tuesday", "Wednesday"]
        }
        
        response = self.make_request("POST", "/inspections", scheduling_data, token=self.agent_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.test_inspection_id = data.get("id")
            
            # Verify agent inspection fields
            agent_name = data.get("agent_name")
            agent_email = data.get("agent_email")
            customer_id = data.get("customer_id")
            customer_email = data.get("customer_email")
            customer_name = data.get("customer_name")
            status = data.get("status")
            
            success = (
                agent_name and
                agent_email == TEST_AGENT_EMAIL and
                customer_id is None and
                customer_email == "" and
                customer_name == "" and
                status == "pending_scheduling"
            )
            
            if success:
                self.log_result("Agent Inspection Scheduling", True, f"Inspection scheduled with ID: {self.test_inspection_id}")
                self.log_result("Agent Inspection Validation", True, f"Agent fields populated, customer fields empty, status: {status}")
            else:
                self.log_result("Agent Inspection Scheduling", False, f"Inspection created but validation failed", {
                    "agent_name": agent_name,
                    "agent_email": agent_email,
                    "customer_id": customer_id,
                    "customer_email": customer_email,
                    "customer_name": customer_name,
                    "status": status
                })
            return success
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Agent Inspection Scheduling", False, f"Failed to schedule inspection: {error_msg}")
            return False
    
    def test_owner_offer_time_slots(self):
        """Test owner offering time slots for inspection"""
        print("\n=== Testing Owner Time Slot Offering ===")
        
        if not self.owner_token or not self.test_inspection_id:
            self.log_result("Owner Time Slot Offering", False, "Missing owner token or inspection ID")
            return False
        
        # Calculate dates for time slots (tomorrow and day after)
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        day_after = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        time_slots_data = {
            "offered_time_slots": [
                {
                    "date": tomorrow,
                    "time": "09:00 AM",
                    "inspector": "Brad Baker",
                    "inspectorLicense": "TREC-12345",
                    "inspectorPhone": "512-555-0100"
                },
                {
                    "date": day_after,
                    "time": "02:00 PM",
                    "inspector": "Brad Baker",
                    "inspectorLicense": "TREC-12345",
                    "inspectorPhone": "512-555-0100"
                }
            ],
            "fee_amount": 450.00
        }
        
        response = self.make_request("PATCH", f"/admin/inspections/{self.test_inspection_id}/offer-times", 
                                   time_slots_data, token=self.owner_token)
        
        if response and response.status_code == 200:
            data = response.json()
            offered_slots = data.get("offered_time_slots")
            status = data.get("status")
            fee_amount = data.get("fee_amount")
            
            if offered_slots and len(offered_slots) == 2 and status == "awaiting_customer_selection" and fee_amount == 450.00:
                self.log_result("Owner Time Slot Offering", True, f"Time slots offered successfully, status: {status}")
                return True
            else:
                self.log_result("Owner Time Slot Offering", False, f"Time slots offered but validation failed", {
                    "slots_count": len(offered_slots) if offered_slots else 0,
                    "status": status,
                    "fee_amount": fee_amount
                })
                return False
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Owner Time Slot Offering", False, f"Failed to offer time slots: {error_msg}")
            return False
    
    def test_agent_confirm_time_slot(self):
        """Test agent confirming a time slot"""
        print("\n=== Testing Agent Time Slot Confirmation ===")
        
        if not self.agent_token or not self.test_inspection_id:
            self.log_result("Agent Time Slot Confirmation", False, "Missing agent token or inspection ID")
            return False
        
        # Use tomorrow's date and 9 AM time
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        confirm_data = {
            "scheduled_date": tomorrow,
            "scheduled_time": "09:00 AM",
            "inspector": "Brad Baker",
            "inspectorLicense": "TREC-12345",
            "inspectorPhone": "512-555-0100"
        }
        
        response = self.make_request("PATCH", f"/inspections/{self.test_inspection_id}/confirm-time", 
                                   confirm_data, token=self.agent_token)
        
        if response and response.status_code == 200:
            data = response.json()
            scheduled_date = data.get("scheduled_date")
            scheduled_time = data.get("scheduled_time")
            status = data.get("status")
            inspector_name = data.get("inspector_name")
            
            if scheduled_date == tomorrow and scheduled_time == "09:00 AM" and status == "scheduled" and inspector_name == "Brad Baker":
                self.log_result("Agent Time Slot Confirmation", True, f"Time slot confirmed: {scheduled_date} at {scheduled_time}, status: {status}")
                return True
            else:
                self.log_result("Agent Time Slot Confirmation", False, f"Time slot confirmed but validation failed", {
                    "scheduled_date": scheduled_date,
                    "scheduled_time": scheduled_time,
                    "status": status,
                    "inspector_name": inspector_name
                })
                return False
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Agent Time Slot Confirmation", False, f"Failed to confirm time slot: {error_msg}")
            return False
    
    def test_agent_add_client_info(self):
        """Test agent adding client information"""
        print("\n=== Testing Agent Client Info Addition ===")
        
        if not self.agent_token or not self.test_inspection_id:
            self.log_result("Agent Client Info Addition", False, "Missing agent token or inspection ID")
            return False
        
        client_data = {
            "client_name": "John Smith",
            "client_email": "john.smith@example.com",
            "client_phone": "555-0199"
        }
        
        response = self.make_request("PATCH", f"/inspections/{self.test_inspection_id}/client-info", 
                                   client_data, token=self.agent_token)
        
        if response and response.status_code == 200:
            data = response.json()
            customer_name = data.get("customer_name")
            customer_email = data.get("customer_email")
            customer_phone = data.get("customer_phone")
            agent_name = data.get("agent_name")
            agent_email = data.get("agent_email")
            
            success = (
                customer_name == "John Smith" and
                customer_email == "john.smith@example.com" and
                customer_phone == "555-0199" and
                agent_name and
                agent_email == TEST_AGENT_EMAIL
            )
            
            if success:
                self.log_result("Agent Client Info Addition", True, f"Client info added successfully: {customer_name} ({customer_email})")
                self.log_result("Client Info Validation", True, f"Customer fields populated, agent fields preserved")
                return True
            else:
                self.log_result("Agent Client Info Addition", False, f"Client info added but validation failed", {
                    "customer_name": customer_name,
                    "customer_email": customer_email,
                    "customer_phone": customer_phone,
                    "agent_name": agent_name,
                    "agent_email": agent_email
                })
                return False
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Agent Client Info Addition", False, f"Failed to add client info: {error_msg}")
            return False
    
    def test_final_inspection_state(self):
        """Test final inspection state has all required fields"""
        print("\n=== Testing Final Inspection State ===")
        
        if not self.agent_token or not self.test_inspection_id:
            self.log_result("Final Inspection State", False, "Missing agent token or inspection ID")
            return False
        
        response = self.make_request("GET", f"/inspections/{self.test_inspection_id}", token=self.agent_token)
        
        if response and response.status_code == 200:
            data = response.json()
            
            # Check all required fields are populated
            required_fields = {
                "agent_name": data.get("agent_name"),
                "agent_email": data.get("agent_email"),
                "customer_name": data.get("customer_name"),
                "customer_email": data.get("customer_email"),
                "scheduled_date": data.get("scheduled_date"),
                "scheduled_time": data.get("scheduled_time"),
                "status": data.get("status")
            }
            
            missing_fields = [field for field, value in required_fields.items() if not value]
            
            if not missing_fields and data.get("status") == "scheduled":
                self.log_result("Final Inspection State", True, f"All required fields populated, status: scheduled")
                return True
            else:
                self.log_result("Final Inspection State", False, f"Missing or invalid fields: {missing_fields}", required_fields)
                return False
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Final Inspection State", False, f"Failed to get inspection: {error_msg}")
            return False
    
    def run_all_tests(self):
        """Run all agent workflow tests"""
        print("🚀 Starting Agent Workflow Redesign Testing")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_agent_login_or_create,
            self.test_owner_login,
            self.test_agent_create_quote,
            self.test_owner_view_quotes,
            self.test_owner_set_quote_price,
            self.test_agent_view_quotes,
            self.test_agent_schedule_inspection,
            self.test_owner_offer_time_slots,
            self.test_agent_confirm_time_slot,
            self.test_agent_add_client_info,
            self.test_final_inspection_state
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                success = test()
                if success:
                    passed += 1
                else:
                    failed += 1
                    # Continue with tests even if one fails
            except Exception as e:
                print(f"❌ FAIL: {test.__name__} - Exception: {str(e)}")
                failed += 1
            
            time.sleep(1)  # Brief pause between tests
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 AGENT WORKFLOW TESTING COMPLETE")
        print("=" * 60)
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📊 SUCCESS RATE: {(passed/(passed+failed)*100):.1f}%")
        
        if failed == 0:
            print("\n🎉 ALL TESTS PASSED! Agent workflow is working correctly.")
        else:
            print(f"\n⚠️  {failed} test(s) failed. See details above.")
        
        return failed == 0

if __name__ == "__main__":
    tester = AgentWorkflowTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)