#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Apartment Rent Payment Kiosk System
Tests all endpoints: apartments, tenants, payments, dashboard stats, breakers
"""

import requests
import sys
import json
from datetime import datetime

class KioskBackendTester:
    def __init__(self, base_url="https://tenant-pay-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failures = []
        
    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - {message}")
        else:
            self.failures.append(f"{test_name}: {message}")
            print(f"❌ {test_name} - {message}")
            if response_data and isinstance(response_data, dict):
                print(f"   Response: {json.dumps(response_data, indent=2)}")
    
    def make_request(self, method, endpoint, data=None, auth_required=False):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.session_token:
            headers['Authorization'] = f'Bearer {self.session_token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
                
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None
    
    def test_apartments_endpoints(self):
        """Test apartment endpoints"""
        print("\n🏠 Testing Apartment Endpoints...")
        
        # Test list apartments
        response = self.make_request('GET', 'apartments')
        if response and response.status_code == 200:
            apartments = response.json()
            if isinstance(apartments, list) and len(apartments) == 6:
                self.log_result("GET /api/apartments", True, f"Found {len(apartments)} apartments")
                
                # Verify expected apartment numbers
                apt_numbers = [apt.get('number') for apt in apartments]
                expected = ['A101', 'A102', 'A201', 'A202', 'B101', 'B102']
                if all(num in apt_numbers for num in expected):
                    self.log_result("Apartment data validation", True, "All expected apartments found")
                else:
                    self.log_result("Apartment data validation", False, f"Missing apartments. Found: {apt_numbers}")
            else:
                self.log_result("GET /api/apartments", False, f"Expected 6 apartments, got {len(apartments) if isinstance(apartments, list) else 'invalid response'}")
        else:
            status = response.status_code if response else 'No response'
            self.log_result("GET /api/apartments", False, f"Failed with status {status}")
        
        # Test get specific apartment
        response = self.make_request('GET', 'apartments/apt_001')
        if response and response.status_code == 200:
            apartment = response.json()
            if apartment.get('number') == 'A101':
                self.log_result("GET /api/apartments/{id}", True, "Retrieved A101 apartment details")
            else:
                self.log_result("GET /api/apartments/{id}", False, "Apartment details mismatch")
        else:
            status = response.status_code if response else 'No response'
            self.log_result("GET /api/apartments/{id}", False, f"Failed with status {status}")
    
    def test_tenants_endpoints(self):
        """Test tenant endpoints"""
        print("\n👥 Testing Tenant Endpoints...")
        
        # Test list tenants
        response = self.make_request('GET', 'tenants')
        if response and response.status_code == 200:
            tenants = response.json()
            if isinstance(tenants, list) and len(tenants) == 4:
                self.log_result("GET /api/tenants", True, f"Found {len(tenants)} tenants")
            else:
                self.log_result("GET /api/tenants", False, f"Expected 4 tenants, got {len(tenants) if isinstance(tenants, list) else 'invalid response'}")
        else:
            status = response.status_code if response else 'No response'
            self.log_result("GET /api/tenants", False, f"Failed with status {status}")
        
        # Test tenant lookup by code HUR001
        response = self.make_request('GET', 'tenants/lookup/HUR001')
        if response and response.status_code == 200:
            tenant = response.json()
            if tenant.get('tenant_code') == 'HUR001' and tenant.get('name') == 'Radjesh Kanhai':
                self.log_result("GET /api/tenants/lookup/HUR001", True, "Found Radjesh Kanhai")
            else:
                self.log_result("GET /api/tenants/lookup/HUR001", False, f"Tenant data mismatch: {tenant}")
        else:
            status = response.status_code if response else 'No response'
            self.log_result("GET /api/tenants/lookup/HUR001", False, f"Failed with status {status}")
        
        # Test tenant lookup by apartment A101
        response = self.make_request('GET', 'tenants/lookup/A101')
        if response and response.status_code == 200:
            tenant = response.json()
            if tenant.get('apartment_number') == 'A101' and tenant.get('name') == 'Radjesh Kanhai':
                self.log_result("GET /api/tenants/lookup/A101", True, "Found tenant for A101")
            else:
                self.log_result("GET /api/tenants/lookup/A101", False, f"Tenant data mismatch: {tenant}")
        else:
            status = response.status_code if response else 'No response'
            self.log_result("GET /api/tenants/lookup/A101", False, f"Failed with status {status}")
    
    def test_payments_endpoint(self):
        """Test payment creation"""
        print("\n💰 Testing Payment Endpoints...")
        
        # Test payment creation
        payment_data = {
            "tenant_id": "ten_001",
            "amount": 1000.0,
            "payment_type": "rent",
            "payment_method": "cash",
            "description": "Test payment for rent"
        }
        
        response = self.make_request('POST', 'payments', payment_data)
        if response and response.status_code == 200:
            payment = response.json()
            if payment.get('amount') == 1000.0 and payment.get('tenant_name') == 'Radjesh Kanhai':
                self.log_result("POST /api/payments", True, f"Payment created with receipt: {payment.get('receipt_number')}")
                
                # Verify tenant balance was updated
                tenant_response = self.make_request('GET', 'tenants/ten_001')
                if tenant_response and tenant_response.status_code == 200:
                    tenant = tenant_response.json()
                    # Original outstanding_rent was 5000, after 1000 payment should be 4000
                    if tenant.get('outstanding_rent') == 4000:
                        self.log_result("Payment balance update", True, "Tenant balance updated correctly")
                    else:
                        self.log_result("Payment balance update", False, f"Expected 4000, got {tenant.get('outstanding_rent')}")
                else:
                    self.log_result("Payment balance verification", False, "Could not verify tenant balance")
            else:
                self.log_result("POST /api/payments", False, f"Payment data mismatch: {payment}")
        else:
            status = response.status_code if response else 'No response'
            self.log_result("POST /api/payments", False, f"Failed with status {status}")
        
        # Test list payments
        response = self.make_request('GET', 'payments')
        if response and response.status_code == 200:
            payments = response.json()
            if isinstance(payments, list):
                self.log_result("GET /api/payments", True, f"Retrieved {len(payments)} payments")
            else:
                self.log_result("GET /api/payments", False, "Invalid payments response")
        else:
            status = response.status_code if response else 'No response'
            self.log_result("GET /api/payments", False, f"Failed with status {status}")
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard Stats...")
        
        response = self.make_request('GET', 'dashboard/stats')
        if response and response.status_code == 200:
            stats = response.json()
            expected_fields = ['total_apartments', 'total_tenants', 'total_payments', 'total_revenue']
            
            if all(field in stats for field in expected_fields):
                self.log_result("GET /api/dashboard/stats", True, 
                    f"Stats: {stats['total_apartments']} apartments, {stats['total_tenants']} tenants, "
                    f"${stats['total_revenue']} revenue")
                
                # Verify expected values
                if stats['total_apartments'] == 6 and stats['total_tenants'] == 4:
                    self.log_result("Dashboard stats validation", True, "Apartment and tenant counts correct")
                else:
                    self.log_result("Dashboard stats validation", False, 
                        f"Expected 6 apartments/4 tenants, got {stats['total_apartments']}/{stats['total_tenants']}")
            else:
                missing = [f for f in expected_fields if f not in stats]
                self.log_result("GET /api/dashboard/stats", False, f"Missing fields: {missing}")
        else:
            status = response.status_code if response else 'No response'
            self.log_result("GET /api/dashboard/stats", False, f"Failed with status {status}")
    
    def test_breakers_endpoints(self):
        """Test Tuya breaker endpoints (MOCKED)"""
        print("\n⚡ Testing Breaker Endpoints (MOCKED)...")
        
        # Test list breakers
        response = self.make_request('GET', 'breakers')
        if response and response.status_code == 200:
            breakers = response.json()
            if isinstance(breakers, list) and len(breakers) == 6:
                self.log_result("GET /api/breakers", True, f"Found {len(breakers)} breakers (MOCKED)")
            else:
                self.log_result("GET /api/breakers", False, f"Expected 6 breakers, got {len(breakers) if isinstance(breakers, list) else 'invalid response'}")
        else:
            status = response.status_code if response else 'No response'
            self.log_result("GET /api/breakers", False, f"Failed with status {status}")
        
        # Test toggle breaker
        toggle_data = {
            "breaker_id": "brk_001",
            "status": "off"
        }
        
        response = self.make_request('POST', 'breakers/toggle', toggle_data)
        if response and response.status_code == 200:
            breaker = response.json()
            if breaker.get('status') == 'off' and breaker.get('apartment_number') == 'A101':
                self.log_result("POST /api/breakers/toggle", True, "Breaker A101 toggled to OFF (MOCKED)")
            else:
                self.log_result("POST /api/breakers/toggle", False, f"Toggle failed: {breaker}")
        else:
            status = response.status_code if response else 'No response'
            self.log_result("POST /api/breakers/toggle", False, f"Failed with status {status}")
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n📋 Test Summary")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failures:
            print(f"\n❌ Failures:")
            for failure in self.failures:
                print(f"   - {failure}")
        
        return self.tests_passed == self.tests_run

def main():
    """Run all backend tests"""
    print("🚀 Starting Backend API Tests for Apartment Rent Payment Kiosk System")
    print("=" * 80)
    
    tester = KioskBackendTester()
    
    # Run all test suites
    tester.test_apartments_endpoints()
    tester.test_tenants_endpoints()
    tester.test_payments_endpoint()
    tester.test_dashboard_stats()
    tester.test_breakers_endpoints()
    
    # Print results
    success = tester.print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())