#!/usr/bin/env python3
"""
Auto-billing Feature Test for Apartment Rent Payment Kiosk System
Tests the new auto-billing feature where next month rent is automatically added
when outstanding rent reaches 0 after a full rent payment.
"""

import requests
import sys
import json

class AutoBillingTester:
    def __init__(self, base_url="https://kiosk-huur.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        
    def log_result(self, test_name, success, message=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - {message}")
        else:
            print(f"❌ {test_name} - {message}")
    
    def make_request(self, method, endpoint, data=None):
        """Make HTTP request"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None
    
    def test_auto_billing_feature(self):
        """Test auto-billing when paying full rent"""
        print("🔄 Testing Auto-billing Feature...")
        
        # Get tenant ten_002 (Maria Janssen, A102) current state
        response = self.make_request('GET', 'tenants/ten_002')
        if not response or response.status_code != 200:
            self.log_result("Get tenant initial state", False, "Could not fetch tenant")
            return
            
        tenant_before = response.json()
        initial_outstanding = tenant_before.get('outstanding_rent', 0)
        initial_service_costs = tenant_before.get('service_costs', 0)
        monthly_rent = tenant_before.get('monthly_rent', 0)
        
        print(f"Initial state - Outstanding: SRD {initial_outstanding}, Service: SRD {initial_service_costs}, Monthly: SRD {monthly_rent}")
        
        # Pay exact outstanding rent amount
        payment_data = {
            "tenant_id": "ten_002",
            "amount": initial_outstanding,
            "payment_type": "rent",
            "payment_method": "cash",
            "description": "Auto-billing test - full rent payment"
        }
        
        response = self.make_request('POST', 'payments', payment_data)
        if not response or response.status_code != 200:
            self.log_result("Create full rent payment", False, f"Payment failed with status {response.status_code if response else 'No response'}")
            return
            
        payment = response.json()
        self.log_result("Create full rent payment", True, f"Payment created: {payment.get('receipt_number')}")
        
        # Check tenant state after payment
        response = self.make_request('GET', 'tenants/ten_002')
        if not response or response.status_code != 200:
            self.log_result("Get tenant post-payment state", False, "Could not fetch tenant after payment")
            return
            
        tenant_after = response.json()
        final_outstanding = tenant_after.get('outstanding_rent', 0)
        final_service_costs = tenant_after.get('service_costs', 0)
        
        print(f"After payment - Outstanding: SRD {final_outstanding}, Service: SRD {final_service_costs}")
        
        # Get apartment info for expected service costs
        apt_response = self.make_request('GET', 'apartments/apt_002')
        if apt_response and apt_response.status_code == 200:
            apt = apt_response.json()
            expected_new_service_costs = initial_service_costs + apt.get('service_costs', 0)
            
            # Verify auto-billing logic
            if final_outstanding == monthly_rent:
                self.log_result("Auto-billing: next month rent added", True, f"Outstanding rent reset to monthly rent: SRD {monthly_rent}")
            else:
                self.log_result("Auto-billing: next month rent added", False, f"Expected {monthly_rent}, got {final_outstanding}")
            
            if final_service_costs == expected_new_service_costs:
                self.log_result("Auto-billing: service costs added", True, f"Service costs updated: SRD {final_service_costs}")
            else:
                self.log_result("Auto-billing: service costs added", False, f"Expected {expected_new_service_costs}, got {final_service_costs}")
        else:
            self.log_result("Get apartment for verification", False, "Could not fetch apartment data")
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n📋 Auto-billing Test Summary")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Run auto-billing tests"""
    print("🔄 Auto-billing Feature Test for Apartment Rent Payment Kiosk")
    print("=" * 70)
    
    tester = AutoBillingTester()
    tester.test_auto_billing_feature()
    
    success = tester.print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())