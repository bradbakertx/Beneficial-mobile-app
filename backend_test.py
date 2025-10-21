#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Beneficial Inspections Application
Pre-deployment testing to catch any problems or problematic sequences
"""

import requests
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://inspect-flow-3.preview.emergentagent.com/api"
OWNER_EMAIL = "bradbakertx@gmail.com"
OWNER_PASSWORD = "Beneficial1!"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.owner_token = None
        self.customer_token = None
        self.inspector_token = None
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def make_request(self, method: str, endpoint: str, token: str = None, **kwargs) -> requests.Response:
        """Make HTTP request with optional authentication"""
        url = f"{BASE_URL}{endpoint}"
        headers = kwargs.get('headers', {})
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        kwargs['headers'] = headers
        
        try:
            response = self.session.request(method, url, **kwargs)
            return response
        except Exception as e:
            print(f"Request failed: {method} {url} - {str(e)}")
            raise

    def test_authentication_system(self):
        """Test 1: Authentication & Authorization"""
        print("=== Testing Authentication & Authorization ===")
        
        # Test 1.1: Owner Login
        try:
            response = self.make_request('POST', '/auth/login', json={
                "email": OWNER_EMAIL,
                "password": OWNER_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.owner_token = data.get('session_token')
                user_data = data.get('user', {})
                
                if self.owner_token and user_data.get('role') == 'owner':
                    self.log_result("Owner Login", True, f"Token received, role: {user_data.get('role')}")
                else:
                    self.log_result("Owner Login", False, "Missing token or incorrect role", data)
            else:
                self.log_result("Owner Login", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Owner Login", False, f"Exception: {str(e)}")

        # Test 1.2: JWT Token Validation (/auth/me)
        if self.owner_token:
            try:
                response = self.make_request('GET', '/auth/me', token=self.owner_token)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('email') == OWNER_EMAIL and data.get('role') == 'owner':
                        self.log_result("JWT Token Validation", True, f"User: {data.get('name')}, Role: {data.get('role')}")
                    else:
                        self.log_result("JWT Token Validation", False, "Incorrect user data", data)
                else:
                    self.log_result("JWT Token Validation", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("JWT Token Validation", False, f"Exception: {str(e)}")

        # Test 1.3: Test Customer Registration
        customer_email = f"test_customer_{int(time.time())}@example.com"
        try:
            response = self.make_request('POST', '/auth/register', json={
                "email": customer_email,
                "password": "TestPass123!",
                "name": "Test Customer",
                "role": "customer",
                "phone": "555-0123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.customer_token = data.get('session_token')
                self.log_result("Customer Registration", True, f"Customer registered: {customer_email}")
            else:
                self.log_result("Customer Registration", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Customer Registration", False, f"Exception: {str(e)}")

        # Test 1.4: Test Inspector Registration
        inspector_email = f"test_inspector_{int(time.time())}@example.com"
        try:
            response = self.make_request('POST', '/auth/register', json={
                "email": inspector_email,
                "password": "TestPass123!",
                "name": "Test Inspector",
                "role": "inspector",
                "phone": "555-0456",
                "license_number": "TX123456"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.inspector_token = data.get('session_token')
                self.log_result("Inspector Registration", True, f"Inspector registered: {inspector_email}")
            else:
                self.log_result("Inspector Registration", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Inspector Registration", False, f"Exception: {str(e)}")

        # Test 1.5: Test Owner Registration Prevention
        try:
            response = self.make_request('POST', '/auth/register', json={
                "email": "fake_owner@example.com",
                "password": "TestPass123!",
                "name": "Fake Owner",
                "role": "owner",
                "phone": "555-0789"
            })
            
            if response.status_code == 403:
                self.log_result("Owner Registration Prevention", True, "Owner registration correctly blocked")
            else:
                self.log_result("Owner Registration Prevention", False, f"Status: {response.status_code} (should be 403)", response.text)
        except Exception as e:
            self.log_result("Owner Registration Prevention", False, f"Exception: {str(e)}")

    def test_dynamic_inspector_selection(self):
        """Test 2: Dynamic Inspector Selection"""
        print("=== Testing Dynamic Inspector Selection ===")
        
        if not self.owner_token:
            self.log_result("Dynamic Inspector Selection", False, "No owner token available")
            return

        # Test 2.1: GET /api/users/inspectors (Owner access)
        try:
            response = self.make_request('GET', '/users/inspectors', token=self.owner_token)
            
            if response.status_code == 200:
                data = response.json()
                inspectors = data.get('inspectors', [])
                
                # Verify structure and required fields
                valid_structure = True
                for inspector in inspectors:
                    required_fields = ['id', 'name', 'email', 'role']
                    if not all(field in inspector for field in required_fields):
                        valid_structure = False
                        break
                    
                    # Verify only inspector/owner roles returned
                    if inspector['role'] not in ['inspector', 'owner']:
                        valid_structure = False
                        break
                
                if valid_structure and len(inspectors) > 0:
                    self.log_result("GET /users/inspectors (Owner)", True, f"Found {len(inspectors)} inspectors with correct structure")
                else:
                    self.log_result("GET /users/inspectors (Owner)", False, f"Invalid structure or no inspectors found", data)
            else:
                self.log_result("GET /users/inspectors (Owner)", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /users/inspectors (Owner)", False, f"Exception: {str(e)}")

        # Test 2.2: GET /api/users/inspectors (Customer access - should be 403)
        if self.customer_token:
            try:
                response = self.make_request('GET', '/users/inspectors', token=self.customer_token)
                
                if response.status_code == 403:
                    self.log_result("GET /users/inspectors (Customer - 403)", True, "Customer correctly blocked from inspector list")
                else:
                    self.log_result("GET /users/inspectors (Customer - 403)", False, f"Status: {response.status_code} (should be 403)", response.text)
            except Exception as e:
                self.log_result("GET /users/inspectors (Customer - 403)", False, f"Exception: {str(e)}")

    def test_quote_workflow(self):
        """Test 3: Quote Workflow"""
        print("=== Testing Quote Workflow ===")
        
        if not self.customer_token or not self.owner_token:
            self.log_result("Quote Workflow", False, "Missing required tokens")
            return

        quote_id = None

        # Test 3.1: Customer creates quote
        try:
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
                "additional_notes": "Test quote for backend testing",
                "wdi_report": False,
                "sprinkler_system": True,
                "detached_building": False
            }
            
            response = self.make_request('POST', '/quotes', token=self.customer_token, json=quote_data)
            
            if response.status_code == 200:
                data = response.json()
                quote_id = data.get('id')
                if quote_id and data.get('status') == 'pending':
                    self.log_result("Customer Create Quote", True, f"Quote created: {quote_id}")
                else:
                    self.log_result("Customer Create Quote", False, "Missing quote ID or incorrect status", data)
            else:
                self.log_result("Customer Create Quote", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Customer Create Quote", False, f"Exception: {str(e)}")

        # Test 3.2: Owner views all quotes
        if quote_id:
            try:
                response = self.make_request('GET', '/admin/quotes', token=self.owner_token)
                
                if response.status_code == 200:
                    quotes = response.json()
                    found_quote = any(q.get('id') == quote_id for q in quotes)
                    
                    if found_quote:
                        self.log_result("Owner View All Quotes", True, f"Found {len(quotes)} quotes including test quote")
                    else:
                        self.log_result("Owner View All Quotes", False, f"Test quote {quote_id} not found in {len(quotes)} quotes")
                else:
                    self.log_result("Owner View All Quotes", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Owner View All Quotes", False, f"Exception: {str(e)}")

        # Test 3.3: Owner sets quote price
        if quote_id:
            try:
                response = self.make_request('PATCH', f'/admin/quotes/{quote_id}/price', 
                                           token=self.owner_token, 
                                           params={'quote_amount': 450.00})
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('quote_amount') == 450.0 and data.get('status') == 'quoted':
                        self.log_result("Owner Set Quote Price", True, f"Quote priced at $450.00, status: quoted")
                    else:
                        self.log_result("Owner Set Quote Price", False, "Incorrect amount or status", data)
                else:
                    self.log_result("Owner Set Quote Price", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Owner Set Quote Price", False, f"Exception: {str(e)}")

        return quote_id

    def test_inspection_workflow(self, quote_id: str = None):
        """Test 4: Inspection Workflow"""
        print("=== Testing Inspection Workflow ===")
        
        if not quote_id or not self.customer_token or not self.owner_token:
            self.log_result("Inspection Workflow", False, "Missing quote ID or tokens")
            return

        inspection_id = None

        # Test 4.1: Customer schedules inspection from quote
        try:
            scheduling_data = {
                "quote_id": quote_id,
                "option_period_end_date": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
                "option_period_unsure": False,
                "preferred_days_of_week": ["Monday", "Tuesday", "Wednesday"]
            }
            
            response = self.make_request('POST', '/inspections', token=self.customer_token, json=scheduling_data)
            
            if response.status_code == 200:
                data = response.json()
                inspection_id = data.get('id')
                if inspection_id and data.get('status') == 'pending_scheduling':
                    self.log_result("Customer Schedule Inspection", True, f"Inspection scheduled: {inspection_id}")
                else:
                    self.log_result("Customer Schedule Inspection", False, "Missing inspection ID or incorrect status", data)
            else:
                self.log_result("Customer Schedule Inspection", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Customer Schedule Inspection", False, f"Exception: {str(e)}")

        # Test 4.2: Owner offers time slots
        if inspection_id:
            try:
                time_slots = [
                    {
                        "date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
                        "time": "09:00",
                        "inspector": "Brad Baker",
                        "inspectorLicense": "TREC123",
                        "inspectorPhone": "512-555-0123"
                    },
                    {
                        "date": (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d"),
                        "time": "14:00",
                        "inspector": "Brad Baker",
                        "inspectorLicense": "TREC123",
                        "inspectorPhone": "512-555-0123"
                    }
                ]
                
                response = self.make_request('PATCH', f'/admin/inspections/{inspection_id}/offer-times',
                                           token=self.owner_token,
                                           json={"offered_time_slots": time_slots})
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'awaiting_customer_selection':
                        self.log_result("Owner Offer Time Slots", True, f"Time slots offered, status: awaiting_customer_selection")
                    else:
                        self.log_result("Owner Offer Time Slots", False, "Incorrect status after offering times", data)
                else:
                    self.log_result("Owner Offer Time Slots", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Owner Offer Time Slots", False, f"Exception: {str(e)}")

        # Test 4.3: Customer confirms time slot
        if inspection_id:
            try:
                confirmation_data = {
                    "scheduled_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
                    "scheduled_time": "09:00",
                    "inspector": "Brad Baker",
                    "inspectorLicense": "TREC123",
                    "inspectorPhone": "512-555-0123"
                }
                
                response = self.make_request('PATCH', f'/inspections/{inspection_id}/confirm-time',
                                           token=self.customer_token,
                                           json=confirmation_data)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'scheduled':
                        self.log_result("Customer Confirm Time Slot", True, f"Time slot confirmed, status: scheduled")
                    else:
                        self.log_result("Customer Confirm Time Slot", False, "Incorrect status after confirmation", data)
                else:
                    self.log_result("Customer Confirm Time Slot", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Customer Confirm Time Slot", False, f"Exception: {str(e)}")

        return inspection_id

    def test_chat_system(self, inspection_id: str = None):
        """Test 5: Chat System"""
        print("=== Testing Chat System ===")
        
        if not self.owner_token or not self.customer_token:
            self.log_result("Chat System", False, "Missing required tokens")
            return

        # Test 5.1: GET /api/conversations (Owner)
        try:
            response = self.make_request('GET', '/conversations', token=self.owner_token)
            
            if response.status_code == 200:
                conversations = response.json()
                self.log_result("GET /conversations (Owner)", True, f"Retrieved {len(conversations)} conversations")
            else:
                self.log_result("GET /conversations (Owner)", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /conversations (Owner)", False, f"Exception: {str(e)}")

        # Test 5.2: POST /api/messages (Owner chat)
        message_id = None
        try:
            message_data = {
                "message_text": "Test message from backend testing",
                "conversation_type": "owner_chat"
            }
            
            response = self.make_request('POST', '/messages', token=self.owner_token, json=message_data)
            
            if response.status_code == 200:
                data = response.json()
                message_id = data.get('message_id')
                if message_id:
                    self.log_result("POST /messages (Owner Chat)", True, f"Message sent: {message_id}")
                else:
                    self.log_result("POST /messages (Owner Chat)", False, "Missing message ID", data)
            else:
                self.log_result("POST /messages (Owner Chat)", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /messages (Owner Chat)", False, f"Exception: {str(e)}")

        # Test 5.3: POST /api/messages (Inspector chat)
        if inspection_id:
            try:
                message_data = {
                    "message_text": "Test inspector message from backend testing",
                    "inspection_id": inspection_id
                }
                
                response = self.make_request('POST', '/messages', token=self.customer_token, json=message_data)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('message_id'):
                        self.log_result("POST /messages (Inspector Chat)", True, f"Inspector message sent")
                    else:
                        self.log_result("POST /messages (Inspector Chat)", False, "Missing message ID", data)
                else:
                    self.log_result("POST /messages (Inspector Chat)", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("POST /messages (Inspector Chat)", False, f"Exception: {str(e)}")

        # Test 5.4: GET /api/messages/{inspection_id}
        if inspection_id:
            try:
                response = self.make_request('GET', f'/messages/{inspection_id}', token=self.customer_token)
                
                if response.status_code == 200:
                    messages = response.json()
                    self.log_result("GET /messages/{inspection_id}", True, f"Retrieved {len(messages)} messages for inspection")
                else:
                    self.log_result("GET /messages/{inspection_id}", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("GET /messages/{inspection_id}", False, f"Exception: {str(e)}")

    def test_inspector_assignment(self, inspection_id: str = None):
        """Test 6: Inspector Assignment & Calendar Features"""
        print("=== Testing Inspector Assignment & Calendar Features ===")
        
        if not inspection_id or not self.owner_token:
            self.log_result("Inspector Assignment", False, "Missing inspection ID or owner token")
            return

        # Test 6.1: PATCH /api/admin/inspections/{inspection_id}/update
        try:
            # First get list of inspectors
            inspectors_response = self.make_request('GET', '/users/inspectors', token=self.owner_token)
            
            if inspectors_response.status_code == 200:
                inspectors_data = inspectors_response.json()
                inspectors = inspectors_data.get('inspectors', [])
                
                if len(inspectors) > 0:
                    # Use first inspector for assignment
                    inspector = inspectors[0]
                    
                    update_data = {
                        "inspector_id": inspector['id'],
                        "inspector_email": inspector['email'],
                        "inspector_name": inspector['name']
                    }
                    
                    response = self.make_request('PATCH', f'/admin/inspections/{inspection_id}/update',
                                               token=self.owner_token,
                                               json=update_data)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('inspector_id') == inspector['id']:
                            self.log_result("Inspector Assignment", True, f"Inspector assigned: {inspector['name']}")
                        else:
                            self.log_result("Inspector Assignment", False, "Inspector not properly assigned", data)
                    else:
                        self.log_result("Inspector Assignment", False, f"Status: {response.status_code}", response.text)
                else:
                    self.log_result("Inspector Assignment", False, "No inspectors available for assignment")
            else:
                self.log_result("Inspector Assignment", False, f"Failed to get inspectors: {inspectors_response.status_code}")
        except Exception as e:
            self.log_result("Inspector Assignment", False, f"Exception: {str(e)}")

    def test_manual_inspection_edits(self):
        """Test 7: Manual Inspection Edits"""
        print("=== Testing Manual Inspection Edits ===")
        
        if not self.owner_token:
            self.log_result("Manual Inspection Edits", False, "No owner token available")
            return

        # First, check if there are any existing inspections to edit
        try:
            response = self.make_request('GET', '/admin/inspections/confirmed', token=self.owner_token)
            
            if response.status_code == 200:
                inspections = response.json()
                
                if len(inspections) > 0:
                    # Use first inspection for testing
                    inspection = inspections[0]
                    inspection_id = inspection.get('id')
                    
                    # Test manual inspection edit
                    edit_data = {
                        "client_name": "Updated Test Client",
                        "client_email": "updated@test.com",
                        "client_phone": "555-9999",
                        "property_address": "456 Updated Street",
                        "property_city": "Austin",
                        "property_zip": "78702",
                        "inspection_date": "2025-01-20",
                        "inspection_time": "10:00"
                    }
                    
                    response = self.make_request('PATCH', f'/admin/manual-inspection/{inspection_id}',
                                               token=self.owner_token,
                                               json=edit_data)
                    
                    if response.status_code == 200:
                        self.log_result("Manual Inspection Edit", True, f"Manual inspection updated: {inspection_id}")
                    else:
                        self.log_result("Manual Inspection Edit", False, f"Status: {response.status_code}", response.text)
                else:
                    self.log_result("Manual Inspection Edit", False, "No existing inspections to test manual edits")
            else:
                self.log_result("Manual Inspection Edit", False, f"Failed to get inspections: {response.status_code}")
        except Exception as e:
            self.log_result("Manual Inspection Edit", False, f"Exception: {str(e)}")

    def test_edge_cases_and_errors(self):
        """Test 8: Edge Cases & Error Handling"""
        print("=== Testing Edge Cases & Error Handling ===")
        
        # Test 8.1: Invalid authentication token
        try:
            response = self.make_request('GET', '/auth/me', token='invalid_token_12345')
            
            if response.status_code == 401:
                self.log_result("Invalid Token Handling", True, "Invalid token correctly rejected")
            else:
                self.log_result("Invalid Token Handling", False, f"Status: {response.status_code} (should be 401)", response.text)
        except Exception as e:
            self.log_result("Invalid Token Handling", False, f"Exception: {str(e)}")

        # Test 8.2: Missing required fields in quote creation
        if self.customer_token:
            try:
                incomplete_quote = {
                    "property_address": "123 Test Street"
                    # Missing required fields
                }
                
                response = self.make_request('POST', '/quotes', token=self.customer_token, json=incomplete_quote)
                
                if response.status_code in [400, 422]:  # Bad request or validation error
                    self.log_result("Missing Fields Validation", True, "Missing fields correctly rejected")
                else:
                    self.log_result("Missing Fields Validation", False, f"Status: {response.status_code} (should be 400/422)", response.text)
            except Exception as e:
                self.log_result("Missing Fields Validation", False, f"Exception: {str(e)}")

        # Test 8.3: Invalid inspection ID (404 responses)
        if self.owner_token:
            try:
                fake_id = str(uuid.uuid4())
                response = self.make_request('GET', f'/admin/inspections/{fake_id}', token=self.owner_token)
                
                if response.status_code == 404:
                    self.log_result("Invalid Inspection ID (404)", True, "Invalid inspection ID correctly returns 404")
                else:
                    self.log_result("Invalid Inspection ID (404)", False, f"Status: {response.status_code} (should be 404)", response.text)
            except Exception as e:
                self.log_result("Invalid Inspection ID (404)", False, f"Exception: {str(e)}")

        # Test 8.4: Role-based access control (403 responses)
        if self.customer_token:
            try:
                response = self.make_request('GET', '/admin/quotes', token=self.customer_token)
                
                if response.status_code == 403:
                    self.log_result("Role-based Access Control (403)", True, "Customer correctly blocked from admin endpoints")
                else:
                    self.log_result("Role-based Access Control (403)", False, f"Status: {response.status_code} (should be 403)", response.text)
            except Exception as e:
                self.log_result("Role-based Access Control (403)", False, f"Exception: {str(e)}")

    def test_backend_stability(self):
        """Test 9: Backend Stability & Health"""
        print("=== Testing Backend Stability & Health ===")
        
        # Test 9.1: Basic health check
        try:
            response = self.make_request('GET', '/')
            
            if response.status_code == 200:
                self.log_result("Backend Health Check", True, "Backend is responding")
            else:
                self.log_result("Backend Health Check", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Backend Health Check", False, f"Exception: {str(e)}")

        # Test 9.2: Multiple concurrent requests (basic load test)
        if self.owner_token:
            try:
                import threading
                
                results = []
                
                def make_concurrent_request():
                    try:
                        response = self.make_request('GET', '/auth/me', token=self.owner_token)
                        results.append(response.status_code == 200)
                    except:
                        results.append(False)
                
                # Create 5 concurrent requests
                threads = []
                for i in range(5):
                    thread = threading.Thread(target=make_concurrent_request)
                    threads.append(thread)
                    thread.start()
                
                # Wait for all threads to complete
                for thread in threads:
                    thread.join()
                
                success_rate = sum(results) / len(results) * 100
                
                if success_rate >= 80:  # 80% success rate acceptable
                    self.log_result("Concurrent Requests", True, f"Success rate: {success_rate}%")
                else:
                    self.log_result("Concurrent Requests", False, f"Low success rate: {success_rate}%")
            except Exception as e:
                self.log_result("Concurrent Requests", False, f"Exception: {str(e)}")

    def run_comprehensive_tests(self):
        """Run all comprehensive backend tests"""
        print("🚀 Starting Comprehensive Backend Testing for Beneficial Inspections")
        print(f"Testing against: {BASE_URL}")
        print(f"Test credentials: {OWNER_EMAIL}")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all test suites
        self.test_authentication_system()
        self.test_dynamic_inspector_selection()
        quote_id = self.test_quote_workflow()
        inspection_id = self.test_inspection_workflow(quote_id)
        self.test_chat_system(inspection_id)
        self.test_inspector_assignment(inspection_id)
        self.test_manual_inspection_edits()
        self.test_edge_cases_and_errors()
        self.test_backend_stability()
        
        # Generate summary
        end_time = time.time()
        duration = end_time - start_time
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print("=" * 80)
        print("🏁 COMPREHENSIVE BACKEND TESTING COMPLETE")
        print(f"⏱️  Duration: {duration:.2f} seconds")
        print(f"📊 Results: {passed_tests}/{total_tests} tests passed ({passed_tests/total_tests*100:.1f}%)")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['details']}")
        
        print(f"\n✅ PASSED TESTS ({passed_tests}):")
        for result in self.test_results:
            if result['success']:
                print(f"   • {result['test']}")
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': passed_tests/total_tests*100,
            'duration': duration,
            'results': self.test_results
        }

if __name__ == "__main__":
    tester = BackendTester()
    summary = tester.run_comprehensive_tests()
    
    # Save detailed results to file
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")