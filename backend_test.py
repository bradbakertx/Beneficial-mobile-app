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
BASE_URL = "https://beneficial-mobile.preview.emergentagent.com/api"
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
        
    def send_customer_message_to_owner(self, customer_email, customer_password, message_text):
        """Send a message from customer to owner (no recipient_id)"""
        self.log(f"📤 Customer {customer_email} sending message to owner: '{message_text[:50]}...'")
        
        # Login as customer
        auth_header = self.session.headers.pop("Authorization", None)
        
        login_response = self.session.post(f"{BACKEND_URL}/auth/login", json={
            "email": customer_email,
            "password": "TestPassword123!"
        })
        
        if login_response.status_code != 200:
            raise Exception(f"Customer login failed: {login_response.status_code}")
            
        customer_token = login_response.json()["session_token"]
        self.session.headers["Authorization"] = f"Bearer {customer_token}"
        
        # Send message (no inspection_id, no recipient_id - goes to owner)
        response = self.session.post(f"{BACKEND_URL}/messages", json={
            "message_text": message_text
        })
        
        # Restore owner auth
        if auth_header:
            self.session.headers["Authorization"] = auth_header
        
        if response.status_code != 200:
            raise Exception(f"Customer message send failed: {response.status_code} - {response.text}")
            
        message_data = response.json()
        self.log(f"✅ Customer message sent. Message ID: {message_data['id']}")
        return message_data
        
    def send_owner_message_to_customer(self, customer_id, message_text):
        """Send a message from owner to specific customer (with recipient_id)"""
        self.log(f"📤 Owner sending message to customer {customer_id}: '{message_text[:50]}...'")
        
        # Send message with recipient_id (owner -> specific customer)
        response = self.session.post(f"{BACKEND_URL}/messages", json={
            "message_text": message_text,
            "recipient_id": customer_id
        })
        
        if response.status_code != 200:
            raise Exception(f"Owner message send failed: {response.status_code} - {response.text}")
            
        message_data = response.json()
        self.log(f"✅ Owner message sent. Message ID: {message_data['id']}, Recipient ID: {message_data.get('recipient_id')}")
        return message_data
        
    def get_conversations(self):
        """Get conversations list as owner"""
        self.log("📋 Getting conversations list...")
        
        response = self.session.get(f"{BACKEND_URL}/conversations")
        
        if response.status_code != 200:
            raise Exception(f"Get conversations failed: {response.status_code} - {response.text}")
            
        conversations = response.json()
        self.log(f"✅ Retrieved {len(conversations)} conversations")
        return conversations
        
    def get_owner_chat_messages(self):
        """Get all owner chat messages"""
        self.log("📋 Getting owner chat messages...")
        
        response = self.session.get(f"{BACKEND_URL}/messages/owner/chat")
        
        if response.status_code != 200:
            raise Exception(f"Get owner chat messages failed: {response.status_code} - {response.text}")
            
        messages = response.json()
        self.log(f"✅ Retrieved {len(messages)} owner chat messages")
        return messages
        
    def verify_message_grouping(self, conversations, customer1_id, customer2_id):
        """Verify that messages are properly grouped by customer"""
        self.log("🔍 Verifying message grouping by customer...")
        
        # Find conversations for each customer
        customer1_conversations = [c for c in conversations if c.get("customer_id") == customer1_id and c.get("conversation_type") == "owner_chat"]
        customer2_conversations = [c for c in conversations if c.get("customer_id") == customer2_id and c.get("conversation_type") == "owner_chat"]
        
        self.log(f"Customer 1 ({customer1_id}) conversations: {len(customer1_conversations)}")
        self.log(f"Customer 2 ({customer2_id}) conversations: {len(customer2_conversations)}")
        
        # Should have exactly 1 conversation per customer
        if len(customer1_conversations) != 1:
            raise Exception(f"Expected 1 conversation for customer1, got {len(customer1_conversations)}")
            
        if len(customer2_conversations) != 1:
            raise Exception(f"Expected 1 conversation for customer2, got {len(customer2_conversations)}")
            
        # Conversations should be distinct
        if customer1_conversations[0]["id"] == customer2_conversations[0]["id"]:
            raise Exception("Customer conversations have the same ID - messages are not properly separated!")
            
        self.log("✅ Messages are properly grouped by customer - each has distinct conversation")
        return customer1_conversations[0], customer2_conversations[0]
        
    def verify_database_state(self, customer1_id, customer2_id):
        """Verify database state by checking message recipient_ids"""
        self.log("🔍 Verifying database state - checking recipient_id preservation...")
        
        # Get all owner chat messages
        messages = self.get_owner_chat_messages()
        
        # Filter messages by sender/recipient
        customer1_messages = []
        customer2_messages = []
        
        for msg in messages:
            # Messages from owner to customer1 should have recipient_id = customer1_id
            if msg.get("sender_role") == "owner" and msg.get("recipient_id") == customer1_id:
                customer1_messages.append(msg)
            # Messages from customer1 to owner should have sender_id = customer1_id
            elif msg.get("sender_id") == customer1_id and msg.get("recipient_role") == "owner":
                customer1_messages.append(msg)
            # Messages from owner to customer2 should have recipient_id = customer2_id  
            elif msg.get("sender_role") == "owner" and msg.get("recipient_id") == customer2_id:
                customer2_messages.append(msg)
            # Messages from customer2 to owner should have sender_id = customer2_id
            elif msg.get("sender_id") == customer2_id and msg.get("recipient_role") == "owner":
                customer2_messages.append(msg)
        
        self.log(f"Customer 1 messages: {len(customer1_messages)}")
        self.log(f"Customer 2 messages: {len(customer2_messages)}")
        
        # Verify owner->customer messages have correct recipient_id
        owner_to_customer1 = [m for m in customer1_messages if m.get("sender_role") == "owner"]
        owner_to_customer2 = [m for m in customer2_messages if m.get("sender_role") == "owner"]
        
        for msg in owner_to_customer1:
            if msg.get("recipient_id") != customer1_id:
                raise Exception(f"Owner message to customer1 has wrong recipient_id: {msg.get('recipient_id')} != {customer1_id}")
                
        for msg in owner_to_customer2:
            if msg.get("recipient_id") != customer2_id:
                raise Exception(f"Owner message to customer2 has wrong recipient_id: {msg.get('recipient_id')} != {customer2_id}")
        
        self.log("✅ Database state verified - recipient_id correctly preserved for owner messages")
        
        # Check for message mixing
        mixed_messages = []
        for msg in customer1_messages:
            if msg.get("sender_role") == "owner" and msg.get("recipient_id") == customer2_id:
                mixed_messages.append(msg)
            elif msg.get("sender_id") == customer2_id:
                mixed_messages.append(msg)
                
        for msg in customer2_messages:
            if msg.get("sender_role") == "owner" and msg.get("recipient_id") == customer1_id:
                mixed_messages.append(msg)
            elif msg.get("sender_id") == customer1_id:
                mixed_messages.append(msg)
        
        if mixed_messages:
            raise Exception(f"Found {len(mixed_messages)} mixed messages between customer conversations!")
            
        self.log("✅ No message mixing detected - conversations remain distinct")
        
        return {
            "customer1_messages": len(customer1_messages),
            "customer2_messages": len(customer2_messages),
            "owner_to_customer1": len(owner_to_customer1),
            "owner_to_customer2": len(owner_to_customer2)
        }
        
    def run_comprehensive_test(self):
        """Run comprehensive test of Owner Chat Grouping Fix"""
        self.log("🚀 Starting comprehensive Owner Chat Grouping Fix test...")
        
        try:
            # 1. Login as owner
            owner = self.login_owner()
            
            # 2. Create test customers
            customer1 = self.create_test_customer("Test Customer 1", f"testcustomer1_{int(time.time())}@example.com")
            customer2 = self.create_test_customer("Test Customer 2", f"testcustomer2_{int(time.time())}@example.com")
            
            customer1_id = customer1["id"]
            customer2_id = customer2["id"]
            
            # 3. Have customers send messages to owner
            self.send_customer_message_to_owner(customer1["email"], "TestPassword123!", "Hello from customer 1 - initial message")
            self.send_customer_message_to_owner(customer2["email"], "TestPassword123!", "Hello from customer 2 - initial message")
            
            # 4. Get conversations and verify separation
            conversations = self.get_conversations()
            customer1_conv, customer2_conv = self.verify_message_grouping(conversations, customer1_id, customer2_id)
            
            # 5. Owner sends replies to each customer (with recipient_id)
            self.send_owner_message_to_customer(customer1_id, "Reply to customer 1 - this should be grouped with customer 1")
            self.send_owner_message_to_customer(customer2_id, "Reply to customer 2 - this should be grouped with customer 2")
            
            # 6. Send more messages to test continued separation
            self.send_customer_message_to_owner(customer1["email"], "TestPassword123!", "Customer 1 follow-up message")
            self.send_customer_message_to_owner(customer2["email"], "TestPassword123!", "Customer 2 follow-up message")
            
            self.send_owner_message_to_customer(customer1_id, "Owner second reply to customer 1")
            self.send_owner_message_to_customer(customer2_id, "Owner second reply to customer 2")
            
            # 7. Final verification
            final_conversations = self.get_conversations()
            self.verify_message_grouping(final_conversations, customer1_id, customer2_id)
            
            # 8. Verify database state
            stats = self.verify_database_state(customer1_id, customer2_id)
            
            self.log("🎉 ALL TESTS PASSED!")
            self.log("=" * 60)
            self.log("✅ Messages from owner to customer1 have recipient_id = customer1_id")
            self.log("✅ Messages from owner to customer2 have recipient_id = customer2_id") 
            self.log("✅ Each customer's conversation remains distinct and separate")
            self.log("✅ No message mixing between different customer conversations")
            self.log(f"✅ Customer 1 total messages: {stats['customer1_messages']}")
            self.log(f"✅ Customer 2 total messages: {stats['customer2_messages']}")
            self.log(f"✅ Owner->Customer1 messages: {stats['owner_to_customer1']}")
            self.log(f"✅ Owner->Customer2 messages: {stats['owner_to_customer2']}")
            self.log("=" * 60)
            
            return True
            
        except Exception as e:
            self.log(f"❌ TEST FAILED: {str(e)}")
            return False

def main():
    """Main test execution"""
    print("=" * 60)
    print("BACKEND TEST: Owner Chat Grouping Fix")
    print("=" * 60)
    
    tester = BackendTester()
    success = tester.run_comprehensive_test()
    
    if success:
        print("\n🎉 OWNER CHAT GROUPING FIX: WORKING CORRECTLY")
        exit(0)
    else:
        print("\n❌ OWNER CHAT GROUPING FIX: FAILED")
        exit(1)

if __name__ == "__main__":
    main()