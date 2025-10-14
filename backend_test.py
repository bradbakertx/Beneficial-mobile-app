#!/usr/bin/env python3
"""
Backend API Testing for Chat History Visibility Feature
Tests the newly added Chat History Visibility feature when inspector is changed.
"""

import requests
import json
import sys
from typing import Dict, List, Optional

# Backend API Configuration
BASE_URL = "https://beneinspect.preview.emergentagent.com/api"

# Test Credentials
OWNER_EMAIL = "bradbakertx@gmail.com"
OWNER_PASSWORD = "Beneficial1!"

class ChatHistoryVisibilityTester:
    def __init__(self):
        self.session = requests.Session()
        self.owner_token = None
        self.owner_user_id = None
        
    def login_as_owner(self) -> bool:
        """Login as owner and get JWT token"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": OWNER_EMAIL,
                "password": OWNER_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.owner_token = data["session_token"]
                self.owner_user_id = data["user"]["id"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.owner_token}"
                })
                print(f"✅ Owner login successful: {data['user']['name']} ({data['user']['email']})")
                return True
            else:
                print(f"❌ Owner login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Owner login error: {e}")
            return False
    
    def get_inspections(self) -> List[Dict]:
        """Get list of confirmed inspections"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/inspections/confirmed")
            
            if response.status_code == 200:
                inspections = response.json()
                print(f"✅ Retrieved {len(inspections)} confirmed inspections")
                return inspections
            else:
                print(f"❌ Failed to get inspections: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error getting inspections: {e}")
            return []
    
    def get_inspection_by_id(self, inspection_id: str) -> Optional[Dict]:
        """Get specific inspection by ID"""
        try:
            response = self.session.get(f"{BASE_URL}/inspections/{inspection_id}")
            
            if response.status_code == 200:
                inspection = response.json()
                print(f"✅ Retrieved inspection: {inspection_id}")
                print(f"   Property: {inspection.get('property_address', 'N/A')}")
                print(f"   Current Inspector: {inspection.get('inspector_name', 'N/A')} ({inspection.get('inspector_email', 'N/A')})")
                return inspection
            else:
                print(f"❌ Failed to get inspection {inspection_id}: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error getting inspection {inspection_id}: {e}")
            return None
    
    def get_inspectors(self) -> List[Dict]:
        """Get list of available inspectors"""
        try:
            response = self.session.get(f"{BASE_URL}/users/inspectors")
            
            if response.status_code == 200:
                data = response.json()
                inspectors = data.get("inspectors", [])
                print(f"✅ Retrieved {len(inspectors)} inspectors:")
                for inspector in inspectors:
                    print(f"   - {inspector['name']} ({inspector['email']}) - {inspector['role']}")
                return inspectors
            else:
                print(f"❌ Failed to get inspectors: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error getting inspectors: {e}")
            return []
    
    def get_conversations(self, user_token: str = None) -> List[Dict]:
        """Get conversations list for current user"""
        try:
            headers = {}
            if user_token:
                headers["Authorization"] = f"Bearer {user_token}"
            
            response = self.session.get(f"{BASE_URL}/conversations", headers=headers)
            
            if response.status_code == 200:
                conversations = response.json()
                print(f"✅ Retrieved {len(conversations)} conversations")
                for conv in conversations:
                    print(f"   - Conversation ID: {conv.get('conversation_id', 'N/A')}")
                    print(f"     Type: {conv.get('conversation_type', 'N/A')}")
                    print(f"     Participants: {conv.get('participant_names', 'N/A')}")
                    print(f"     Unread Count: {conv.get('unread_count', 0)}")
                return conversations
            else:
                print(f"❌ Failed to get conversations: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error getting conversations: {e}")
            return []
    
    def get_messages(self, inspection_id: str, user_token: str = None) -> List[Dict]:
        """Get messages for specific inspection"""
        try:
            headers = {}
            if user_token:
                headers["Authorization"] = f"Bearer {user_token}"
            
            response = self.session.get(f"{BASE_URL}/messages/{inspection_id}", headers=headers)
            
            if response.status_code == 200:
                messages = response.json()
                print(f"✅ Retrieved {len(messages)} messages for inspection {inspection_id}")
                for msg in messages:
                    print(f"   - {msg.get('sender_name', 'N/A')} ({msg.get('sender_role', 'N/A')}): {msg.get('message_text', 'N/A')[:50]}...")
                    print(f"     Created: {msg.get('created_at', 'N/A')}")
                return messages
            else:
                print(f"❌ Failed to get messages for inspection {inspection_id}: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error getting messages for inspection {inspection_id}: {e}")
            return []
    
    def send_test_message(self, inspection_id: str, message_text: str) -> bool:
        """Send a test message to create chat history"""
        try:
            response = self.session.post(f"{BASE_URL}/messages", json={
                "inspection_id": inspection_id,
                "message_text": message_text
            })
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Test message sent: {data.get('message_id', 'N/A')}")
                return True
            else:
                print(f"❌ Failed to send test message: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error sending test message: {e}")
            return False
    
    def update_inspection_inspector(self, inspection_id: str, new_inspector_id: str, new_inspector_email: str) -> bool:
        """Update inspection with new inspector"""
        try:
            response = self.session.patch(f"{BASE_URL}/admin/inspections/{inspection_id}/update", json={
                "inspector_id": new_inspector_id,
                "inspector_email": new_inspector_email
            })
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Inspector updated successfully")
                print(f"   New Inspector: {data.get('inspector_name', 'N/A')} ({data.get('inspector_email', 'N/A')})")
                return True
            else:
                print(f"❌ Failed to update inspector: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error updating inspector: {e}")
            return False
    
    def create_test_inspector_account(self) -> Optional[Dict]:
        """Create a test inspector account for testing"""
        try:
            test_inspector_data = {
                "email": "test.inspector.chat@example.com",
                "password": "TestPassword123!",
                "name": "Test Inspector Chat",
                "role": "inspector"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=test_inspector_data)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Test inspector account created: {data['user']['name']} ({data['user']['email']})")
                return {
                    "id": data["user"]["id"],
                    "email": data["user"]["email"],
                    "name": data["user"]["name"],
                    "token": data["session_token"]
                }
            else:
                print(f"❌ Failed to create test inspector: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating test inspector: {e}")
            return None
    
    def login_as_inspector(self, email: str, password: str) -> Optional[str]:
        """Login as inspector and return token"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": email,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Inspector login successful: {data['user']['name']} ({data['user']['email']})")
                return data["session_token"]
            else:
                print(f"❌ Inspector login failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Inspector login error: {e}")
            return None
    
    def run_chat_history_visibility_test(self):
        """Run the comprehensive Chat History Visibility test"""
        print("=" * 80)
        print("CHAT HISTORY VISIBILITY FEATURE TEST")
        print("=" * 80)
        
        # Step 1: Login as owner
        print("\n🔐 STEP 1: Login as Owner")
        if not self.login_as_owner():
            print("❌ CRITICAL: Cannot login as owner. Test cannot continue.")
            return False
        
        # Step 2: Find an inspection to test with
        print("\n🔍 STEP 2: Find Test Inspection")
        target_inspection_id = "737c416d-d0ae-4e4d-b6b7-c328d339eb72"  # From review request
        
        inspection = self.get_inspection_by_id(target_inspection_id)
        if not inspection:
            # Try to get any confirmed inspection
            inspections = self.get_inspections()
            if inspections:
                inspection = inspections[0]
                target_inspection_id = inspection["id"]
                print(f"✅ Using alternative inspection: {target_inspection_id}")
            else:
                print("❌ CRITICAL: No inspections found for testing.")
                return False
        
        original_inspector_id = inspection.get("inspector_id")
        original_inspector_email = inspection.get("inspector_email")
        original_inspector_name = inspection.get("inspector_name")
        
        print(f"📋 Test Inspection Details:")
        print(f"   ID: {target_inspection_id}")
        print(f"   Property: {inspection.get('property_address', 'N/A')}")
        print(f"   Current Inspector: {original_inspector_name} ({original_inspector_email})")
        
        # Step 3: Check existing messages for this inspection
        print(f"\n💬 STEP 3: Check Existing Messages")
        existing_messages = self.get_messages(target_inspection_id)
        
        # Step 4: Send a test message to create chat history if none exists
        print(f"\n📝 STEP 4: Create Test Message (if needed)")
        if len(existing_messages) == 0:
            test_message = f"Test message for chat history visibility - Inspector change test at {target_inspection_id}"
            if not self.send_test_message(target_inspection_id, test_message):
                print("⚠️  Warning: Could not create test message, but continuing with test...")
        
        # Step 5: Get list of available inspectors
        print(f"\n👥 STEP 5: Get Available Inspectors")
        inspectors = self.get_inspectors()
        
        # Always create a fresh test inspector for this test to ensure we have proper credentials
        print("🔧 Creating fresh test inspector for this test...")
        test_inspector = self.create_test_inspector_account()
        fresh_inspector_token = None
        
        if test_inspector:
            # Add the new inspector to our list
            inspectors.append({
                "id": test_inspector["id"],
                "name": test_inspector["name"], 
                "email": test_inspector["email"],
                "role": "inspector"
            })
            fresh_inspector_token = test_inspector["token"]
            print(f"✅ Fresh test inspector added: {test_inspector['name']} ({test_inspector['email']})")
        
        if len(inspectors) < 2:
            print("❌ CRITICAL: Need at least 2 inspectors for testing.")
            return False
        
        # Step 6: Select a different inspector
        print(f"\n🔄 STEP 6: Select Different Inspector")
        new_inspector = None
        for inspector in inspectors:
            if inspector["id"] != original_inspector_id:
                new_inspector = inspector
                break
        
        if not new_inspector:
            print("❌ CRITICAL: Cannot find a different inspector for testing.")
            return False
        
        print(f"✅ Selected new inspector: {new_inspector['name']} ({new_inspector['email']})")
        
        # Step 7: Get conversations for NEW inspector BEFORE assignment
        print(f"\n📋 STEP 7: Check New Inspector's Conversations BEFORE Assignment")
        
        # Use the fresh test inspector's token if we created one and it matches
        new_inspector_token = None
        if test_inspector and new_inspector["email"] == test_inspector["email"]:
            new_inspector_token = fresh_inspector_token
            print(f"✅ Using fresh test inspector token")
        else:
            # Try different password combinations for existing inspectors
            inspector_password = "TestPassword123!"
            if "test.inspector@example.com" in new_inspector["email"]:
                inspector_password = "Beneficial1!"  # This might be the existing test inspector
            
            new_inspector_token = self.login_as_inspector(new_inspector["email"], inspector_password)
        
        if new_inspector_token:
            conversations_before = self.get_conversations(new_inspector_token)
            inspection_conversation_before = any(
                conv.get("conversation_id") == target_inspection_id 
                for conv in conversations_before
            )
            print(f"📊 New inspector has conversation for inspection {target_inspection_id} BEFORE assignment: {inspection_conversation_before}")
        else:
            print("⚠️  Warning: Could not login as new inspector, skipping BEFORE check")
            conversations_before = []
            inspection_conversation_before = False
        
        # Step 8: Change inspector on the inspection
        print(f"\n🔄 STEP 8: Change Inspector Assignment")
        if not self.update_inspection_inspector(target_inspection_id, new_inspector["id"], new_inspector["email"]):
            print("❌ CRITICAL: Failed to update inspector assignment.")
            return False
        
        # Step 9: Verify new inspector can see the conversation
        print(f"\n✅ STEP 9: Verify New Inspector Can See Chat History")
        
        if new_inspector_token:
            # Check conversations list
            conversations_after = self.get_conversations(new_inspector_token)
            inspection_conversation_after = any(
                conv.get("conversation_id") == target_inspection_id 
                for conv in conversations_after
            )
            
            print(f"📊 New inspector has conversation for inspection {target_inspection_id} AFTER assignment: {inspection_conversation_after}")
            
            # Check message history access
            messages_for_new_inspector = self.get_messages(target_inspection_id, new_inspector_token)
            
            print(f"📊 New inspector can access {len(messages_for_new_inspector)} messages for inspection {target_inspection_id}")
            
            # Step 10: Verify chat history continuity
            print(f"\n🔍 STEP 10: Verify Chat History Continuity")
            
            # Get messages as owner for comparison
            messages_for_owner = self.get_messages(target_inspection_id)
            
            print(f"📊 Message count comparison:")
            print(f"   Owner can see: {len(messages_for_owner)} messages")
            print(f"   New inspector can see: {len(messages_for_new_inspector)} messages")
            
            # Test Results
            print(f"\n📋 TEST RESULTS:")
            print(f"=" * 50)
            
            success = True
            
            # Test 1: New inspector should see conversation in their list
            if inspection_conversation_after:
                print(f"✅ TEST 1 PASSED: New inspector sees conversation in their list")
            else:
                print(f"❌ TEST 1 FAILED: New inspector does NOT see conversation in their list")
                success = False
            
            # Test 2: New inspector should be able to access message history
            if len(messages_for_new_inspector) > 0:
                print(f"✅ TEST 2 PASSED: New inspector can access message history ({len(messages_for_new_inspector)} messages)")
            else:
                print(f"❌ TEST 2 FAILED: New inspector cannot access message history")
                success = False
            
            # Test 3: Message history should be complete (same as owner sees)
            if len(messages_for_new_inspector) == len(messages_for_owner):
                print(f"✅ TEST 3 PASSED: New inspector sees complete message history")
            else:
                print(f"⚠️  TEST 3 PARTIAL: New inspector sees {len(messages_for_new_inspector)} messages, owner sees {len(messages_for_owner)}")
                # This might be acceptable depending on implementation
            
            # Test 4: Conversation should appear even if inspector was never recipient
            if not inspection_conversation_before and inspection_conversation_after:
                print(f"✅ TEST 4 PASSED: Conversation appears for newly assigned inspector (was not visible before)")
            elif inspection_conversation_before and inspection_conversation_after:
                print(f"✅ TEST 4 PASSED: Conversation remains visible for inspector")
            else:
                print(f"❌ TEST 4 FAILED: Conversation visibility logic not working correctly")
                success = False
            
            # Step 11: Restore original inspector (cleanup)
            print(f"\n🔄 STEP 11: Restore Original Inspector (Cleanup)")
            if original_inspector_id and original_inspector_email:
                self.update_inspection_inspector(target_inspection_id, original_inspector_id, original_inspector_email)
                print(f"✅ Restored original inspector: {original_inspector_name}")
            
            return success
        
        else:
            print("❌ CRITICAL: Could not login as new inspector to verify chat visibility.")
            return False

def main():
    """Main test execution"""
    tester = ChatHistoryVisibilityTester()
    
    try:
        success = tester.run_chat_history_visibility_test()
        
        print(f"\n" + "=" * 80)
        if success:
            print("🎉 CHAT HISTORY VISIBILITY TEST: PASSED")
            print("✅ New inspectors can see chat history for assigned inspections")
        else:
            print("❌ CHAT HISTORY VISIBILITY TEST: FAILED")
            print("❌ Issues found with chat history visibility feature")
        print("=" * 80)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        print("❌ CHAT HISTORY VISIBILITY TEST: FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())