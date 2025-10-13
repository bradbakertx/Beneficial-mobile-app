#!/usr/bin/env python3
"""
Backend API Testing for Manual Inspection Edit Data Sync
Tests the fix for manual inspection edits not reflecting on Active Inspections cards
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "https://scheduleplus-12.preview.emergentagent.com/api"

# Test credentials
TEST_EMAIL = "bradbakertx@gmail.com"
TEST_PASSWORD = "Beneficial1!"

class BackendTester:
    def __init__(self):
        self.session_token = None
        self.headers = {"Content-Type": "application/json"}
        
    def login(self):
        """Login and get session token"""
        print("🔐 Testing login...")
        
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
            print(f"Login response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.session_token = data.get("session_token")
                self.headers["Authorization"] = f"Bearer {self.session_token}"
                print("✅ Login successful")
                print(f"User: {data.get('user', {}).get('name')} ({data.get('user', {}).get('role')})")
                return True
            else:
                print(f"❌ Login failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get_confirmed_inspections(self):
        """Get all confirmed inspections"""
        print("\n📋 Getting confirmed inspections...")
        
        try:
            response = requests.get(f"{BASE_URL}/admin/inspections/confirmed", headers=self.headers)
            print(f"Get confirmed inspections status: {response.status_code}")
            
            if response.status_code == 200:
                inspections = response.json()
                print(f"✅ Found {len(inspections)} confirmed inspections")
                return inspections
            else:
                print(f"❌ Failed to get inspections: {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error getting inspections: {e}")
            return []
    
    def get_manual_inspection(self, inspection_id):
        """Get manual inspection by ID"""
        print(f"\n🔍 Getting manual inspection {inspection_id}...")
        
        try:
            response = requests.get(f"{BASE_URL}/admin/manual-inspection/{inspection_id}", headers=self.headers)
            print(f"Get manual inspection status: {response.status_code}")
            
            if response.status_code == 200:
                inspection = response.json()
                print("✅ Manual inspection retrieved")
                print(f"Client: {inspection.get('client_name')} ({inspection.get('client_email')})")
                print(f"Address: {inspection.get('property_address')}")
                print(f"Date/Time: {inspection.get('inspection_date')} {inspection.get('inspection_time')}")
                return inspection
            else:
                print(f"❌ Failed to get manual inspection: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error getting manual inspection: {e}")
            return None
    
    def create_manual_inspection(self):
        """Create a manual inspection for testing"""
        print("\n➕ Creating manual inspection for testing...")
        
        inspection_data = {
            "client_name": "Test Client Original",
            "client_email": "original@test.com",
            "client_phone": "5551234567",
            "property_address": "123 Original St",
            "property_city": "Austin",
            "property_zip": "78701",
            "square_feet": 2000,
            "year_built": 2020,
            "foundation_type": "Slab",
            "property_type": "Single Family",
            "num_buildings": 1,
            "num_units": 1,
            "fee_amount": 500.00,
            "inspection_date": "2025-01-25",
            "inspection_time": "10:00"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/admin/manual-inspection", json=inspection_data, headers=self.headers)
            print(f"Create manual inspection status: {response.status_code}")
            
            if response.status_code == 200:
                inspection = response.json()
                print("✅ Manual inspection created")
                print(f"ID: {inspection.get('id')}")
                return inspection.get('id')
            else:
                print(f"❌ Failed to create manual inspection: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating manual inspection: {e}")
            return None
    
    def update_manual_inspection(self, inspection_id, update_data):
        """Update manual inspection"""
        print(f"\n✏️ Updating manual inspection {inspection_id}...")
        print(f"Update data: {json.dumps(update_data, indent=2)}")
        
        try:
            response = requests.patch(f"{BASE_URL}/admin/manual-inspection/{inspection_id}", json=update_data, headers=self.headers)
            print(f"Update manual inspection status: {response.status_code}")
            
            if response.status_code == 200:
                inspection = response.json()
                print("✅ Manual inspection updated")
                print(f"Updated client: {inspection.get('client_name')} ({inspection.get('client_email')})")
                print(f"Updated address: {inspection.get('property_address')}")
                print(f"Updated date/time: {inspection.get('inspection_date')} {inspection.get('inspection_time')}")
                return inspection
            else:
                print(f"❌ Failed to update manual inspection: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error updating manual inspection: {e}")
            return None
    
    def verify_sync_to_inspections(self, inspection_id, expected_data):
        """Verify that manual inspection changes are synced to inspections collection"""
        print(f"\n🔄 Verifying sync to inspections collection for {inspection_id}...")
        
        inspections = self.get_confirmed_inspections()
        
        # Find the inspection with matching ID
        target_inspection = None
        for inspection in inspections:
            if inspection.get('id') == inspection_id:
                target_inspection = inspection
                break
        
        if not target_inspection:
            print(f"❌ CRITICAL: Inspection {inspection_id} not found in confirmed inspections")
            return False
        
        print("🔍 Checking sync of displayable fields...")
        
        # Check critical sync fields
        sync_checks = []
        
        # customer_name should match client_name
        expected_customer_name = expected_data.get('client_name')
        actual_customer_name = target_inspection.get('customer_name')
        if expected_customer_name and actual_customer_name == expected_customer_name:
            print(f"✅ customer_name synced: {actual_customer_name}")
            sync_checks.append(True)
        elif expected_customer_name:
            print(f"❌ customer_name NOT synced. Expected: {expected_customer_name}, Got: {actual_customer_name}")
            sync_checks.append(False)
        
        # customer_email should match client_email
        expected_customer_email = expected_data.get('client_email')
        actual_customer_email = target_inspection.get('customer_email')
        if expected_customer_email and actual_customer_email == expected_customer_email:
            print(f"✅ customer_email synced: {actual_customer_email}")
            sync_checks.append(True)
        elif expected_customer_email:
            print(f"❌ customer_email NOT synced. Expected: {expected_customer_email}, Got: {actual_customer_email}")
            sync_checks.append(False)
        
        # property_address should be formatted with city and zip
        expected_address_parts = [
            expected_data.get('property_address'),
            expected_data.get('property_city'),
            expected_data.get('property_zip')
        ]
        if all(expected_address_parts):
            expected_full_address = f"{expected_address_parts[0]}, {expected_address_parts[1]}, TX {expected_address_parts[2]}"
            actual_property_address = target_inspection.get('property_address')
            if actual_property_address == expected_full_address:
                print(f"✅ property_address synced: {actual_property_address}")
                sync_checks.append(True)
            else:
                print(f"❌ property_address NOT synced. Expected: {expected_full_address}, Got: {actual_property_address}")
                sync_checks.append(False)
        
        # scheduled_date should match inspection_date
        expected_scheduled_date = expected_data.get('inspection_date')
        actual_scheduled_date = target_inspection.get('scheduled_date')
        if expected_scheduled_date and actual_scheduled_date == expected_scheduled_date:
            print(f"✅ scheduled_date synced: {actual_scheduled_date}")
            sync_checks.append(True)
        elif expected_scheduled_date:
            print(f"❌ scheduled_date NOT synced. Expected: {expected_scheduled_date}, Got: {actual_scheduled_date}")
            sync_checks.append(False)
        
        # scheduled_time should match inspection_time
        expected_scheduled_time = expected_data.get('inspection_time')
        actual_scheduled_time = target_inspection.get('scheduled_time')
        if expected_scheduled_time and actual_scheduled_time == expected_scheduled_time:
            print(f"✅ scheduled_time synced: {actual_scheduled_time}")
            sync_checks.append(True)
        elif expected_scheduled_time:
            print(f"❌ scheduled_time NOT synced. Expected: {expected_scheduled_time}, Got: {actual_scheduled_time}")
            sync_checks.append(False)
        
        all_synced = all(sync_checks) if sync_checks else False
        
        if all_synced:
            print("✅ ALL FIELDS SYNCED CORRECTLY")
        else:
            print("❌ SYNC ISSUES DETECTED")
        
        return all_synced
    
    def test_manual_inspection_sync(self):
        """Main test for manual inspection edit data sync"""
        print("=" * 60)
        print("🧪 TESTING MANUAL INSPECTION EDIT DATA SYNC")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login():
            return False
        
        # Step 2: Check existing inspections or create one
        inspections = self.get_confirmed_inspections()
        
        inspection_id = None
        if inspections:
            # Use existing inspection
            inspection_id = inspections[0].get('id')
            print(f"\n📌 Using existing inspection: {inspection_id}")
        else:
            # Create new inspection
            inspection_id = self.create_manual_inspection()
            if not inspection_id:
                print("❌ Failed to create test inspection")
                return False
        
        # Step 3: Get current inspection data
        original_inspection = self.get_manual_inspection(inspection_id)
        if not original_inspection:
            return False
        
        # Step 4: Update with comprehensive data
        print("\n" + "=" * 40)
        print("🔄 TESTING COMPREHENSIVE UPDATE")
        print("=" * 40)
        
        comprehensive_update = {
            "client_name": "Updated Test Client",
            "client_email": "updated@test.com",
            "client_phone": "9999999999",
            "property_address": "456 Updated St",
            "property_city": "Austin",
            "property_zip": "78701",
            "inspection_date": "2025-10-20",
            "inspection_time": "14:00"
        }
        
        updated_inspection = self.update_manual_inspection(inspection_id, comprehensive_update)
        if not updated_inspection:
            return False
        
        # Step 5: Verify sync to inspections collection
        sync_success = self.verify_sync_to_inspections(inspection_id, comprehensive_update)
        
        # Step 6: Test partial update
        print("\n" + "=" * 40)
        print("🔄 TESTING PARTIAL UPDATE")
        print("=" * 40)
        
        partial_update = {
            "client_name": "Partial Update Test"
        }
        
        partial_updated = self.update_manual_inspection(inspection_id, partial_update)
        if not partial_updated:
            return False
        
        # Verify partial sync
        expected_partial = comprehensive_update.copy()
        expected_partial.update(partial_update)
        
        partial_sync_success = self.verify_sync_to_inspections(inspection_id, expected_partial)
        
        # Final result
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        if sync_success and partial_sync_success:
            print("✅ ALL TESTS PASSED - Manual Inspection Edit Data Sync is working correctly")
            return True
        else:
            print("❌ TESTS FAILED - Manual Inspection Edit Data Sync has issues")
            if not sync_success:
                print("  - Comprehensive update sync failed")
            if not partial_sync_success:
                print("  - Partial update sync failed")
            return False

def main():
    """Run the backend tests"""
    tester = BackendTester()
    
    print("🚀 Starting Backend API Tests for Manual Inspection Edit Data Sync")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test Account: {TEST_EMAIL}")
    
    success = tester.test_manual_inspection_sync()
    
    if success:
        print("\n🎉 All tests completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()