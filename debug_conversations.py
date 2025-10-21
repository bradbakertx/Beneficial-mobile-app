#!/usr/bin/env python3
"""
Debug script to examine conversation structure and identify the issue
"""

import requests
import json

# Configuration
BACKEND_URL = "https://inspect-flow-3.preview.emergentagent.com/api"
OWNER_EMAIL = "bradbakertx@gmail.com"
OWNER_PASSWORD = "Beneficial1!"
TARGET_INSPECTION_ID = "737c416d-d0ae-4e4d-b6b7-c328d339eb72"

def login_and_get_token(email, password):
    """Login and get auth token"""
    response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    
    if response.status_code == 200:
        data = response.json()
        return data["session_token"], data["user"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None, None

def get_conversations_detailed(token):
    """Get conversations with detailed output"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BACKEND_URL}/conversations", headers=headers)
    
    if response.status_code == 200:
        conversations = response.json()
        print(f"Found {len(conversations)} conversations:")
        for i, conv in enumerate(conversations, 1):
            print(f"\nConversation {i}:")
            print(json.dumps(conv, indent=2))
        return conversations
    else:
        print(f"Failed to get conversations: {response.status_code} - {response.text}")
        return []

def get_inspection_details(token, inspection_id):
    """Get inspection details"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BACKEND_URL}/inspections/{inspection_id}", headers=headers)
    
    if response.status_code == 200:
        inspection = response.json()
        print(f"Inspection details:")
        print(json.dumps(inspection, indent=2))
        return inspection
    else:
        print(f"Failed to get inspection: {response.status_code} - {response.text}")
        return None

def main():
    print("🔍 DEBUGGING CONVERSATION STRUCTURE")
    print("=" * 50)
    
    # Login as owner
    owner_token, owner_user = login_and_get_token(OWNER_EMAIL, OWNER_PASSWORD)
    if not owner_token:
        return
    
    print(f"✅ Logged in as: {owner_user['name']} ({owner_user['email']})")
    
    # Get inspection details
    print(f"\n📋 INSPECTION DETAILS:")
    inspection = get_inspection_details(owner_token, TARGET_INSPECTION_ID)
    
    # Get conversations as owner
    print(f"\n💬 OWNER CONVERSATIONS:")
    owner_conversations = get_conversations_detailed(owner_token)
    
    # Check if target inspection appears in owner conversations
    target_found = False
    for conv in owner_conversations:
        if conv.get("inspection_id") == TARGET_INSPECTION_ID:
            target_found = True
            print(f"\n✅ FOUND TARGET CONVERSATION IN OWNER LIST:")
            print(f"   ID: {conv.get('id')}")
            print(f"   Type: {conv.get('conversation_type')}")
            print(f"   Inspection ID: {conv.get('inspection_id')}")
            print(f"   Customer Name: {conv.get('customer_name')}")
            break
    
    if not target_found:
        print(f"\n❌ TARGET CONVERSATION NOT FOUND IN OWNER LIST")
        print(f"   Looking for inspection_id: {TARGET_INSPECTION_ID}")
    
    # Now test with a fresh inspector
    print(f"\n🔧 CREATING FRESH TEST INSPECTOR...")
    import time
    timestamp = str(int(time.time()))
    test_inspector_data = {
        "email": f"debug.inspector.{timestamp}@example.com",
        "password": "TestPassword123!",
        "name": f"Debug Inspector {timestamp}",
        "role": "inspector"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/register", json=test_inspector_data)
    if response.status_code == 200:
        inspector_data = response.json()
        inspector_token = inspector_data["session_token"]
        inspector_user = inspector_data["user"]
        print(f"✅ Created inspector: {inspector_user['name']} ({inspector_user['email']})")
        
        # Update inspection with new inspector
        print(f"\n🔄 ASSIGNING INSPECTOR TO INSPECTION...")
        headers = {"Authorization": f"Bearer {owner_token}"}
        update_response = requests.patch(
            f"{BACKEND_URL}/admin/inspections/{TARGET_INSPECTION_ID}/update",
            headers=headers,
            json={
                "inspector_id": inspector_user["id"],
                "inspector_email": inspector_user["email"]
            }
        )
        
        if update_response.status_code == 200:
            print(f"✅ Inspector assigned successfully")
            
            # Get conversations as new inspector
            print(f"\n💬 NEW INSPECTOR CONVERSATIONS:")
            inspector_conversations = get_conversations_detailed(inspector_token)
            
            # Check if target inspection appears
            target_found_inspector = False
            for conv in inspector_conversations:
                if conv.get("inspection_id") == TARGET_INSPECTION_ID:
                    target_found_inspector = True
                    print(f"\n✅ FOUND TARGET CONVERSATION IN INSPECTOR LIST:")
                    print(f"   ID: {conv.get('id')}")
                    print(f"   Type: {conv.get('conversation_type')}")
                    print(f"   Inspection ID: {conv.get('inspection_id')}")
                    print(f"   Customer Name: {conv.get('customer_name')}")
                    break
            
            if not target_found_inspector:
                print(f"\n❌ TARGET CONVERSATION NOT FOUND IN INSPECTOR LIST")
                print(f"   Looking for inspection_id: {TARGET_INSPECTION_ID}")
                
                # Let's check what conversations the inspector does see
                if inspector_conversations:
                    print(f"\n🔍 INSPECTOR SEES THESE CONVERSATIONS:")
                    for conv in inspector_conversations:
                        print(f"   - ID: {conv.get('id')}")
                        print(f"     Type: {conv.get('conversation_type')}")
                        print(f"     Inspection ID: {conv.get('inspection_id')}")
                        print(f"     Customer: {conv.get('customer_name')}")
            
            # Test message access
            print(f"\n📨 TESTING MESSAGE ACCESS:")
            headers = {"Authorization": f"Bearer {inspector_token}"}
            msg_response = requests.get(f"{BACKEND_URL}/messages/{TARGET_INSPECTION_ID}", headers=headers)
            
            if msg_response.status_code == 200:
                messages = msg_response.json()
                print(f"✅ Inspector can access {len(messages)} messages directly")
            else:
                print(f"❌ Inspector cannot access messages: {msg_response.status_code}")
                
        else:
            print(f"❌ Failed to assign inspector: {update_response.status_code} - {update_response.text}")
    else:
        print(f"❌ Failed to create inspector: {response.status_code} - {response.text}")

if __name__ == "__main__":
    main()