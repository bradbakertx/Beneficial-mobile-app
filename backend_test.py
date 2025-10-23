#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Socket.IO Real-Time Updates
Tests Socket.IO server functionality, JWT authentication, and real-time event emissions
"""

import asyncio
import aiohttp
import socketio
import json
import logging
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test Configuration
BASE_URL = "https://benefi-inspect.preview.emergentagent.com/api"
SOCKET_URL = "https://benefi-inspect.preview.emergentagent.com"
TEST_CREDENTIALS = {
    "email": "bradbakertx@gmail.com",
    "password": "Beneficial1!"
}

class SocketIOTester:
    def __init__(self):
        self.session = None
        self.jwt_token = None
        self.user_data = None
        self.sio_client = None
        self.received_events = []
        self.test_results = []
        
    async def setup_session(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        """Cleanup resources"""
        if self.sio_client and self.sio_client.connected:
            await self.sio_client.disconnect()
        if self.session:
            await self.session.close()
            
    async def login(self) -> bool:
        """Login and get JWT token"""
        try:
            async with self.session.post(
                f"{BASE_URL}/auth/login",
                json=TEST_CREDENTIALS
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.jwt_token = data.get("session_token")
                    self.user_data = data.get("user")
                    logger.info(f"✅ Login successful for {self.user_data.get('name')} ({self.user_data.get('role')})")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Login failed: {response.status} - {error_text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Login error: {str(e)}")
            return False
            
    async def test_socket_connection(self) -> bool:
        """Test Socket.IO connection with JWT authentication"""
        try:
            # Create Socket.IO client
            self.sio_client = socketio.AsyncClient(logger=False, engineio_logger=False)
            
            # Event handlers
            @self.sio_client.event
            async def connect():
                logger.info("🔌 Socket.IO connected successfully")
                
            @self.sio_client.event
            async def disconnect():
                logger.info("🔌 Socket.IO disconnected")
                
            @self.sio_client.event
            async def connection_established(data):
                logger.info(f"✅ Connection established event received: {data}")
                self.received_events.append({"event": "connection_established", "data": data})
                
            # Generic event handler for all real-time events
            @self.sio_client.event
            async def new_quote(data):
                logger.info(f"📤 Received new_quote event: {data}")
                self.received_events.append({"event": "new_quote", "data": data})
                
            @self.sio_client.event
            async def quote_updated(data):
                logger.info(f"📤 Received quote_updated event: {data}")
                self.received_events.append({"event": "quote_updated", "data": data})
                
            @self.sio_client.event
            async def new_inspection(data):
                logger.info(f"📤 Received new_inspection event: {data}")
                self.received_events.append({"event": "new_inspection", "data": data})
                
            @self.sio_client.event
            async def time_slot_confirmed(data):
                logger.info(f"📤 Received time_slot_confirmed event: {data}")
                self.received_events.append({"event": "time_slot_confirmed", "data": data})
                
            @self.sio_client.event
            async def new_message(data):
                logger.info(f"📤 Received new_message event: {data}")
                self.received_events.append({"event": "new_message", "data": data})
            
            # Connect with JWT token
            await self.sio_client.connect(
                SOCKET_URL,
                auth={"token": self.jwt_token},
                transports=['websocket', 'polling']
            )
            
            # Wait for connection to establish
            await asyncio.sleep(2)
            
            if self.sio_client.connected:
                logger.info("✅ Socket.IO connection test PASSED")
                return True
            else:
                logger.error("❌ Socket.IO connection test FAILED - Not connected")
                return False
                
        except Exception as e:
            logger.error(f"❌ Socket.IO connection error: {str(e)}")
            return False
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

    def test_agent_workflow_redesign(self):
        """Test Agent Workflow Redesign - Complete End-to-End Flow"""
        print("=== Testing Agent Workflow Redesign ===")
        
        # Test Agent Credentials
        TEST_AGENT_EMAIL = "test.agent@example.com"
        TEST_AGENT_PASSWORD = "TestAgent123!"
        
        agent_token = None
        agent_quote_id = None
        agent_inspection_id = None
        
        # Step 1: Agent login or create test agent
        try:
            # Try login first
            response = self.make_request('POST', '/auth/login', json={
                "email": TEST_AGENT_EMAIL,
                "password": TEST_AGENT_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                agent_token = data.get('session_token')
                user = data.get('user', {})
                if user.get('role') == 'agent':
                    self.log_result("Agent Login", True, f"Agent logged in: {user.get('name')}")
                else:
                    self.log_result("Agent Login", False, f"User role is {user.get('role')}, not agent")
            else:
                # Try to create agent if login failed
                response = self.make_request('POST', '/auth/register', json={
                    "email": TEST_AGENT_EMAIL,
                    "password": TEST_AGENT_PASSWORD,
                    "name": "Test Agent",
                    "role": "agent",
                    "phone": "555-0123",
                    "terms_accepted": True,
                    "privacy_policy_accepted": True,
                    "marketing_consent": False
                })
                
                if response.status_code == 200:
                    data = response.json()
                    agent_token = data.get('session_token')
                    self.log_result("Agent Registration", True, f"Test agent created and logged in")
                else:
                    self.log_result("Agent Authentication", False, f"Failed to login or create agent: {response.status_code}")
        except Exception as e:
            self.log_result("Agent Authentication", False, f"Exception: {str(e)}")
        
        if not agent_token:
            self.log_result("Agent Workflow", False, "Cannot proceed without agent token")
            return
        
        # Step 2: Agent creates quote with is_agent_quote=true
        try:
            quote_data = {
                "property_address": "789 Agent Test Property",
                "property_city": "Austin",
                "property_zip": "78701",
                "property_type": "Single Family",
                "square_feet": 2200,
                "year_built": 2015,
                "foundation_type": "Slab",
                "num_buildings": 1,
                "num_units": 1,
                "additional_notes": "Agent workflow redesign test - client property inspection",
                "wdi_report": True,
                "sprinkler_system": False,
                "detached_building": False,
                "detached_building_type": None,
                "detached_building_sqft": None
            }
            
            response = self.make_request('POST', '/quotes', token=agent_token, json=quote_data)
            
            if response.status_code == 200:
                data = response.json()
                agent_quote_id = data.get('id')
                
                # Verify agent quote fields
                is_agent_quote = data.get('is_agent_quote')
                agent_name = data.get('agent_name')
                agent_email = data.get('agent_email')
                customer_email = data.get('customer_email')
                customer_name = data.get('customer_name')
                
                if (is_agent_quote == True and agent_name and agent_email == TEST_AGENT_EMAIL and 
                    customer_email == "" and customer_name == ""):
                    self.log_result("Agent Quote Creation", True, f"Agent quote created with correct fields: {agent_quote_id}")
                else:
                    self.log_result("Agent Quote Creation", False, f"Quote validation failed", {
                        "is_agent_quote": is_agent_quote,
                        "agent_email": agent_email,
                        "customer_email": customer_email
                    })
            else:
                self.log_result("Agent Quote Creation", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Agent Quote Creation", False, f"Exception: {str(e)}")
        
        # Step 3: Owner views pending quotes (should see agent quote as orange card)
        if agent_quote_id and self.owner_token:
            try:
                response = self.make_request('GET', '/admin/quotes', token=self.owner_token)
                
                if response.status_code == 200:
                    quotes = response.json()
                    agent_quote = next((q for q in quotes if q.get('id') == agent_quote_id), None)
                    
                    if agent_quote and agent_quote.get('is_agent_quote') == True:
                        self.log_result("Owner View Agent Quote", True, f"Owner can see agent quote with is_agent_quote=True")
                    else:
                        self.log_result("Owner View Agent Quote", False, f"Agent quote not found or missing is_agent_quote flag")
                else:
                    self.log_result("Owner View Agent Quote", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Owner View Agent Quote", False, f"Exception: {str(e)}")
        
        # Step 4: Owner sets quote price
        if agent_quote_id and self.owner_token:
            try:
                response = self.make_request('PATCH', f'/admin/quotes/{agent_quote_id}/price', 
                                           token=self.owner_token, 
                                           params={'quote_amount': 475.00})
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('quote_amount') == 475.0 and data.get('status') == 'quoted':
                        self.log_result("Owner Set Agent Quote Price", True, f"Agent quote priced at $475.00")
                    else:
                        self.log_result("Owner Set Agent Quote Price", False, "Price/status validation failed", data)
                else:
                    self.log_result("Owner Set Agent Quote Price", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Owner Set Agent Quote Price", False, f"Exception: {str(e)}")
        
        # Step 5: Agent views their quotes and sees quoted price
        if agent_quote_id and agent_token:
            try:
                response = self.make_request('GET', '/quotes', token=agent_token)
                
                if response.status_code == 200:
                    quotes = response.json()
                    agent_quote = next((q for q in quotes if q.get('id') == agent_quote_id), None)
                    
                    if agent_quote and agent_quote.get('quote_amount') == 475.0 and agent_quote.get('status') == 'quoted':
                        self.log_result("Agent View Quoted Price", True, f"Agent can see quoted price: $475.00")
                    else:
                        self.log_result("Agent View Quoted Price", False, "Quote price/status not correct", agent_quote)
                else:
                    self.log_result("Agent View Quoted Price", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Agent View Quoted Price", False, f"Exception: {str(e)}")
        
        # Step 6: Agent schedules inspection from quote
        if agent_quote_id and agent_token:
            try:
                from datetime import datetime, timedelta
                option_end = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
                
                scheduling_data = {
                    "quote_id": agent_quote_id,
                    "option_period_end_date": option_end,
                    "option_period_unsure": False,
                    "preferred_days_of_week": ["Monday", "Tuesday", "Wednesday"]
                }
                
                response = self.make_request('POST', '/inspections', token=agent_token, json=scheduling_data)
                
                if response.status_code == 200:
                    data = response.json()
                    agent_inspection_id = data.get('id')
                    
                    # Verify agent inspection fields
                    agent_name = data.get('agent_name')
                    agent_email = data.get('agent_email')
                    customer_id = data.get('customer_id')
                    customer_email = data.get('customer_email')
                    
                    if (agent_name and agent_email == TEST_AGENT_EMAIL and 
                        customer_id is None and customer_email == ""):
                        self.log_result("Agent Schedule Inspection", True, f"Agent inspection scheduled: {agent_inspection_id}")
                    else:
                        self.log_result("Agent Schedule Inspection", False, "Inspection field validation failed", data)
                else:
                    self.log_result("Agent Schedule Inspection", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Agent Schedule Inspection", False, f"Exception: {str(e)}")
        
        # Step 7: Owner offers time slots
        if agent_inspection_id and self.owner_token:
            try:
                from datetime import datetime, timedelta
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
                    "fee_amount": 475.00
                }
                
                response = self.make_request('PATCH', f'/admin/inspections/{agent_inspection_id}/offer-times', 
                                           token=self.owner_token, json=time_slots_data)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'awaiting_customer_selection':
                        self.log_result("Owner Offer Times to Agent", True, f"Time slots offered to agent")
                    else:
                        self.log_result("Owner Offer Times to Agent", False, "Status not correct after offering times", data)
                else:
                    self.log_result("Owner Offer Times to Agent", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Owner Offer Times to Agent", False, f"Exception: {str(e)}")
        
        # Step 8: Agent confirms time slot
        if agent_inspection_id and agent_token:
            try:
                from datetime import datetime, timedelta
                tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
                
                confirm_data = {
                    "scheduled_date": tomorrow,
                    "scheduled_time": "09:00 AM",
                    "inspector": "Brad Baker",
                    "inspectorLicense": "TREC-12345",
                    "inspectorPhone": "512-555-0100"
                }
                
                response = self.make_request('PATCH', f'/inspections/{agent_inspection_id}/confirm-time', 
                                           token=agent_token, json=confirm_data)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'scheduled':
                        self.log_result("Agent Confirm Time Slot", True, f"Agent confirmed time slot successfully")
                    else:
                        self.log_result("Agent Confirm Time Slot", False, "Status not scheduled after confirmation", data)
                else:
                    self.log_result("Agent Confirm Time Slot", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Agent Confirm Time Slot", False, f"Exception: {str(e)}")
        
        # Step 9: Agent adds client information
        if agent_inspection_id and agent_token:
            try:
                client_data = {
                    "client_name": "Jane Doe",
                    "client_email": "jane.doe@example.com",
                    "client_phone": "555-0188"
                }
                
                response = self.make_request('PATCH', f'/inspections/{agent_inspection_id}/client-info', 
                                           token=agent_token, json=client_data)
                
                if response.status_code == 200:
                    data = response.json()
                    customer_name = data.get('customer_name')
                    customer_email = data.get('customer_email')
                    customer_phone = data.get('customer_phone')
                    agent_name = data.get('agent_name')
                    
                    if (customer_name == "Jane Doe" and customer_email == "jane.doe@example.com" and 
                        customer_phone == "555-0188" and agent_name):
                        self.log_result("Agent Add Client Info", True, f"Client info added: {customer_name} ({customer_email})")
                    else:
                        self.log_result("Agent Add Client Info", False, "Client info validation failed", data)
                else:
                    self.log_result("Agent Add Client Info", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Agent Add Client Info", False, f"Exception: {str(e)}")
        
        # Step 10: Verify final inspection state
        if agent_inspection_id and agent_token:
            try:
                response = self.make_request('GET', f'/inspections/{agent_inspection_id}', token=agent_token)
                
                if response.status_code == 200:
                    data = response.json()
                    
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
                        self.log_result("Agent Workflow Final State", True, f"All fields populated, inspection scheduled")
                    else:
                        self.log_result("Agent Workflow Final State", False, f"Missing fields: {missing_fields}", required_fields)
                else:
                    self.log_result("Agent Workflow Final State", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Agent Workflow Final State", False, f"Exception: {str(e)}")

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
        
        # NEW: Test Agent Workflow Redesign
        self.test_agent_workflow_redesign()
        
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