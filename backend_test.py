#!/usr/bin/env python3
"""
Backend API Testing for Inspector Selection Feature
Tests the newly implemented inspector selection functionality
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://beneinspect.preview.emergentagent.com/api"
TEST_EMAIL = "bradbakertx@gmail.com"
TEST_PASSWORD = "Beneficial1!"

class InspectorSelectionTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

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
    
    def test_get_conversations(self):
        """Test GET /api/conversations endpoint"""
        print("=== TESTING GET CONVERSATIONS ===")
        
        try:
            response = self.session.get(f"{API_BASE}/conversations")
            
            if response.status_code == 200:
                conversations = response.json()
                
                # Verify response structure
                if isinstance(conversations, list):
                    self.log_result(
                        "GET /api/conversations", 
                        True, 
                        f"Retrieved {len(conversations)} conversations",
                        {"count": len(conversations), "sample": conversations[:2] if conversations else []}
                    )
                    
                    # Check for expected conversation types
                    owner_chats = [c for c in conversations if c.get('conversation_type') == 'owner_chat']
                    inspector_chats = [c for c in conversations if c.get('conversation_type') == 'inspector_chat']
                    
                    self.log_result(
                        "Conversation Types Check",
                        True,
                        f"Found {len(owner_chats)} owner chats and {len(inspector_chats)} inspector chats"
                    )
                    
                    # Verify conversation structure for first conversation if exists
                    if conversations:
                        conv = conversations[0]
                        required_fields = ['id', 'conversation_type', 'customer_name', 'unread_count']
                        missing_fields = [field for field in required_fields if field not in conv]
                        
                        if not missing_fields:
                            self.log_result(
                                "Conversation Structure Check",
                                True,
                                "All required fields present in conversation objects"
                            )
                        else:
                            self.log_result(
                                "Conversation Structure Check",
                                False,
                                f"Missing fields: {missing_fields}",
                                conv
                            )
                    
                    return conversations
                else:
                    self.log_result(
                        "GET /api/conversations", 
                        False, 
                        "Response is not a list",
                        conversations
                    )
                    return []
            else:
                self.log_result(
                    "GET /api/conversations", 
                    False, 
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return []
                
        except Exception as e:
            self.log_result("GET /api/conversations", False, f"Exception: {str(e)}")
            return []
    
    def test_send_message(self, inspection_id=None):
        """Test POST /api/messages endpoint"""
        print("=== TESTING SEND MESSAGE ===")
        
        # Test sending message without inspection_id (owner chat)
        try:
            message_data = {
                "message_text": f"Test message from automated testing at {datetime.now().isoformat()}"
            }
            
            if inspection_id:
                message_data["inspection_id"] = inspection_id
                test_name = "POST /api/messages (Inspector Chat)"
                chat_type = "inspector chat"
            else:
                test_name = "POST /api/messages (Owner Chat)"
                chat_type = "owner chat"
            
            response = self.session.post(f"{API_BASE}/messages", json=message_data)
            
            if response.status_code == 200:
                message = response.json()
                
                # Verify response structure
                required_fields = ['id', 'sender_name', 'sender_role', 'message_text', 'created_at']
                missing_fields = [field for field in required_fields if field not in message]
                
                if not missing_fields:
                    self.log_result(
                        test_name,
                        True,
                        f"Successfully sent {chat_type} message",
                        {
                            "message_id": message.get('id'),
                            "sender": message.get('sender_name'),
                            "inspection_id": message.get('inspection_id')
                        }
                    )
                    return message
                else:
                    self.log_result(
                        test_name,
                        False,
                        f"Missing required fields: {missing_fields}",
                        message
                    )
                    return None
            else:
                self.log_result(
                    test_name,
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_result(test_name, False, f"Exception: {str(e)}")
            return None
    
    def test_get_messages(self, inspection_id):
        """Test GET /api/messages/{inspection_id} endpoint"""
        print("=== TESTING GET MESSAGE HISTORY ===")
        
        try:
            response = self.session.get(f"{API_BASE}/messages/{inspection_id}")
            
            if response.status_code == 200:
                messages = response.json()
                
                if isinstance(messages, list):
                    # Sort messages by created_at to verify chronological order
                    if messages:
                        sorted_messages = sorted(messages, key=lambda x: x.get('created_at', ''))
                        is_chronological = messages == sorted_messages
                        
                        self.log_result(
                            "GET /api/messages/{inspection_id}",
                            True,
                            f"Retrieved {len(messages)} messages for inspection {inspection_id}",
                            {"count": len(messages), "chronological": is_chronological}
                        )
                        
                        # Verify message structure
                        if messages:
                            msg = messages[0]
                            required_fields = ['sender_name', 'sender_role', 'message_text', 'created_at']
                            missing_fields = [field for field in required_fields if field not in msg]
                            
                            if not missing_fields:
                                self.log_result(
                                    "Message Structure Check",
                                    True,
                                    "All required fields present in message objects"
                                )
                            else:
                                self.log_result(
                                    "Message Structure Check",
                                    False,
                                    f"Missing fields: {missing_fields}",
                                    msg
                                )
                        
                        # Check chronological order
                        self.log_result(
                            "Chronological Order Check",
                            is_chronological,
                            "Messages are in chronological order" if is_chronological else "Messages are NOT in chronological order"
                        )
                    else:
                        self.log_result(
                            "GET /api/messages/{inspection_id}",
                            True,
                            f"No messages found for inspection {inspection_id} (empty list is valid)"
                        )
                    
                    return messages
                else:
                    self.log_result(
                        "GET /api/messages/{inspection_id}",
                        False,
                        "Response is not a list",
                        messages
                    )
                    return []
            elif response.status_code == 404:
                self.log_result(
                    "GET /api/messages/{inspection_id}",
                    False,
                    f"Inspection {inspection_id} not found",
                    response.text
                )
                return []
            else:
                self.log_result(
                    "GET /api/messages/{inspection_id}",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return []
                
        except Exception as e:
            self.log_result("GET /api/messages/{inspection_id}", False, f"Exception: {str(e)}")
            return []
    
    def get_test_inspection_id(self):
        """Get a valid inspection ID for testing"""
        try:
            # Try to get inspections for the current user
            response = self.session.get(f"{API_BASE}/inspections")
            if response.status_code == 200:
                inspections = response.json()
                if inspections:
                    return inspections[0].get('id')
            
            # If no customer inspections, try admin inspections (if user is owner)
            if self.user_info and self.user_info.get('role') == 'owner':
                response = self.session.get(f"{API_BASE}/admin/inspections/confirmed")
                if response.status_code == 200:
                    inspections = response.json()
                    if inspections:
                        return inspections[0].get('id')
                
                response = self.session.get(f"{API_BASE}/admin/inspections/pending-scheduling")
                if response.status_code == 200:
                    inspections = response.json()
                    if inspections:
                        return inspections[0].get('id')
            
            return None
            
        except Exception as e:
            print(f"Error getting test inspection ID: {e}")
            return None
    
    def test_complete_chat_flow(self):
        """Test the complete chat flow end-to-end"""
        print("=== TESTING COMPLETE CHAT FLOW ===")
        
        # Get a test inspection ID
        inspection_id = self.get_test_inspection_id()
        
        if inspection_id:
            print(f"Using inspection ID: {inspection_id}")
            
            # Test sending message with inspection_id
            sent_message = self.test_send_message(inspection_id)
            
            if sent_message:
                # Test retrieving messages for that inspection
                messages = self.test_get_messages(inspection_id)
                
                # Verify the sent message appears in the retrieved messages
                if messages:
                    sent_msg_id = sent_message.get('id')
                    found_message = any(msg.get('id') == sent_msg_id for msg in messages)
                    
                    self.log_result(
                        "Message Persistence Check",
                        found_message,
                        "Sent message found in message history" if found_message else "Sent message NOT found in message history"
                    )
                else:
                    self.log_result(
                        "Message Persistence Check",
                        False,
                        "Could not retrieve messages to verify persistence"
                    )
        else:
            print("No inspection ID available for testing inspector chat")
            # Test owner chat instead
            self.test_send_message(None)
    
    def run_all_tests(self):
        """Run all chat system tests"""
        print("🚀 Starting Chat System Backend Tests")
        print("=" * 50)
        
        # Test authentication first
        if not self.test_authentication():
            print("❌ Authentication failed - cannot proceed with other tests")
            return False
        
        # Test conversations endpoint
        conversations = self.test_get_conversations()
        
        # Test message sending and retrieval
        self.test_complete_chat_flow()
        
        # Print summary
        print("=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        return failed_tests == 0

def main():
    """Main test execution"""
    tester = ChatSystemTester()
    success = tester.run_all_tests()
    
    # Save detailed results to file
    with open('/app/chat_test_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: /app/chat_test_results.json")
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()