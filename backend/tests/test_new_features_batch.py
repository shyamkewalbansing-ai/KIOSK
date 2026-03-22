"""
Test suite for new batch of features:
1. Apartment CRUD - 'Verdieping' (floor) field removed
2. Company Settings - billing_day_of_month and late_fee_amount
3. Signature upload/delete for companies
4. Late fee application
5. Payments with rent_month field
6. Payment month filter
7. Kiosk signature endpoint
"""

import pytest
import requests
import os
import io
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kiosk-huur.preview.emergentagent.com')

# Test credentials
COMPANY_EMAIL = "demo@vastgoed.sr"
COMPANY_PASSWORD = "demo123"
COMPANY_ID = "comp_demo"
TENANT_ID = "ten_001"


class TestCompanyLogin:
    """Test company authentication"""
    
    def test_company_login(self):
        """Test company login returns session cookie"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["company_id"] == COMPANY_ID
        assert "session_token" in session.cookies or response.cookies.get("session_token")
        print(f"✓ Company login successful: {data['name']}")


class TestApartmentCRUD:
    """Test apartment CRUD without floor field"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_create_apartment_without_floor(self, auth_session):
        """Test creating apartment without floor field (Verdieping removed)"""
        payload = {
            "number": "TEST_C101",
            "monthly_rent": 2000,
            "service_costs": 100,
            "description": "Test apartment without floor"
        }
        response = auth_session.post(f"{BASE_URL}/api/apartments", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["number"] == "TEST_C101"
        assert data["monthly_rent"] == 2000
        assert "floor" not in data or data.get("floor") is None, "Floor field should not be in response"
        print(f"✓ Apartment created without floor: {data['apartment_id']}")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/apartments/{data['apartment_id']}")
    
    def test_list_apartments(self, auth_session):
        """Test listing apartments"""
        response = auth_session.get(f"{BASE_URL}/api/apartments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Listed {len(data)} apartments")


class TestCompanySettings:
    """Test company settings endpoints"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_get_company_settings(self, auth_session):
        """Test GET /api/company/settings returns billing_day_of_month and late_fee_amount"""
        response = auth_session.get(f"{BASE_URL}/api/company/settings")
        assert response.status_code == 200, f"Get settings failed: {response.text}"
        data = response.json()
        assert "billing_day_of_month" in data
        assert "late_fee_amount" in data
        assert "signature_uploaded" in data
        assert isinstance(data["billing_day_of_month"], int)
        print(f"✓ Company settings retrieved: billing_day={data['billing_day_of_month']}, late_fee={data['late_fee_amount']}")
    
    def test_update_company_settings(self, auth_session):
        """Test PUT /api/company/settings updates billing_day_of_month and late_fee_amount"""
        # First get current settings
        get_response = auth_session.get(f"{BASE_URL}/api/company/settings")
        original = get_response.json()
        
        # Update settings
        new_billing_day = 15
        new_late_fee = 250.50
        response = auth_session.put(f"{BASE_URL}/api/company/settings", json={
            "billing_day_of_month": new_billing_day,
            "late_fee_amount": new_late_fee
        })
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update
        verify_response = auth_session.get(f"{BASE_URL}/api/company/settings")
        updated = verify_response.json()
        assert updated["billing_day_of_month"] == new_billing_day
        assert updated["late_fee_amount"] == new_late_fee
        print(f"✓ Company settings updated: billing_day={new_billing_day}, late_fee={new_late_fee}")
        
        # Restore original settings
        auth_session.put(f"{BASE_URL}/api/company/settings", json={
            "billing_day_of_month": original.get("billing_day_of_month", 1),
            "late_fee_amount": original.get("late_fee_amount", 0)
        })
    
    def test_billing_day_validation(self, auth_session):
        """Test billing day must be between 1-28"""
        # Test invalid day > 28
        response = auth_session.put(f"{BASE_URL}/api/company/settings", json={
            "billing_day_of_month": 31
        })
        assert response.status_code == 400, "Should reject billing day > 28"
        
        # Test invalid day < 1
        response = auth_session.put(f"{BASE_URL}/api/company/settings", json={
            "billing_day_of_month": 0
        })
        assert response.status_code == 400, "Should reject billing day < 1"
        print("✓ Billing day validation works (1-28)")
    
    def test_late_fee_validation(self, auth_session):
        """Test late fee cannot be negative"""
        response = auth_session.put(f"{BASE_URL}/api/company/settings", json={
            "late_fee_amount": -100
        })
        assert response.status_code == 400, "Should reject negative late fee"
        print("✓ Late fee validation works (no negative)")


class TestSignatureUpload:
    """Test signature/stamp upload endpoints"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_signature_upload_and_retrieve(self, auth_session):
        """Test POST /api/company/signature uploads image, GET /api/company/signature/image returns it"""
        # Create a simple PNG image (1x1 pixel)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 pixel
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('test_signature.png', io.BytesIO(png_data), 'image/png')}
        response = auth_session.post(f"{BASE_URL}/api/company/signature", files=files)
        assert response.status_code == 200, f"Upload failed: {response.text}"
        print("✓ Signature uploaded successfully")
        
        # Verify signature_uploaded flag
        settings_response = auth_session.get(f"{BASE_URL}/api/company/settings")
        assert settings_response.json()["signature_uploaded"] == True
        print("✓ Signature uploaded flag is True")
        
        # Retrieve signature image
        image_response = auth_session.get(f"{BASE_URL}/api/company/signature/image")
        assert image_response.status_code == 200, f"Get image failed: {image_response.text}"
        assert image_response.headers.get("content-type", "").startswith("image/")
        print("✓ Signature image retrieved successfully")
    
    def test_signature_delete(self, auth_session):
        """Test DELETE /api/company/signature removes signature"""
        # First ensure there's a signature
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        files = {'file': ('test_signature.png', io.BytesIO(png_data), 'image/png')}
        auth_session.post(f"{BASE_URL}/api/company/signature", files=files)
        
        # Delete signature
        response = auth_session.delete(f"{BASE_URL}/api/company/signature")
        assert response.status_code == 200, f"Delete failed: {response.text}"
        print("✓ Signature deleted successfully")
        
        # Verify signature_uploaded flag is False
        settings_response = auth_session.get(f"{BASE_URL}/api/company/settings")
        assert settings_response.json()["signature_uploaded"] == False
        print("✓ Signature uploaded flag is False after delete")
        
        # Verify image returns 404
        image_response = auth_session.get(f"{BASE_URL}/api/company/signature/image")
        assert image_response.status_code == 404
        print("✓ Signature image returns 404 after delete")


class TestLateFeeApplication:
    """Test late fee application endpoint"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_apply_late_fees_endpoint(self, auth_session):
        """Test POST /api/company/apply-late-fees applies fines to tenants"""
        # First set up late fee amount
        auth_session.put(f"{BASE_URL}/api/company/settings", json={
            "billing_day_of_month": 1,  # Set to day 1 so we're past it
            "late_fee_amount": 100
        })
        
        response = auth_session.post(f"{BASE_URL}/api/company/apply-late-fees")
        assert response.status_code == 200, f"Apply late fees failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "applied" in data
        print(f"✓ Late fees applied: {data['message']} (applied to {data['applied']} tenants)")


class TestPaymentsWithRentMonth:
    """Test payments with rent_month field"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_create_payment_with_rent_month(self, auth_session):
        """Test POST payment includes rent_month field"""
        current_month = datetime.now().strftime("%Y-%m")
        payload = {
            "tenant_id": TENANT_ID,
            "amount": 100,
            "payment_type": "rent",
            "payment_method": "cash",
            "description": "Test payment with rent_month"
        }
        response = auth_session.post(f"{BASE_URL}/api/payments", json=payload)
        assert response.status_code == 200, f"Create payment failed: {response.text}"
        data = response.json()
        assert "rent_month" in data
        assert data["rent_month"] == current_month, f"Expected rent_month {current_month}, got {data['rent_month']}"
        print(f"✓ Payment created with rent_month: {data['rent_month']}")
    
    def test_payment_month_filter(self, auth_session):
        """Test GET /api/payments?month=YYYY-MM filters by month"""
        current_month = datetime.now().strftime("%Y-%m")
        
        # Get all payments
        all_response = auth_session.get(f"{BASE_URL}/api/payments")
        all_payments = all_response.json()
        
        # Get filtered payments
        filtered_response = auth_session.get(f"{BASE_URL}/api/payments", params={"month": current_month})
        assert filtered_response.status_code == 200, f"Filter failed: {filtered_response.text}"
        filtered_payments = filtered_response.json()
        
        # Verify filter works
        for payment in filtered_payments:
            assert payment["created_at"].startswith(current_month), f"Payment {payment['payment_id']} not in {current_month}"
        
        print(f"✓ Payment month filter works: {len(filtered_payments)} payments in {current_month}")


class TestKioskPayments:
    """Test kiosk payment endpoints"""
    
    def test_kiosk_create_payment_with_rent_month(self):
        """Test POST kiosk payments include rent_month field"""
        current_month = datetime.now().strftime("%Y-%m")
        payload = {
            "tenant_id": TENANT_ID,
            "amount": 50,
            "payment_type": "rent",
            "payment_method": "cash",
            "description": "Kiosk test payment"
        }
        response = requests.post(f"{BASE_URL}/api/kiosk/{COMPANY_ID}/payments", json=payload)
        assert response.status_code == 200, f"Kiosk payment failed: {response.text}"
        data = response.json()
        assert "rent_month" in data
        assert data["rent_month"] == current_month
        print(f"✓ Kiosk payment created with rent_month: {data['rent_month']}")


class TestKioskSignature:
    """Test kiosk signature endpoint"""
    
    @pytest.fixture
    def setup_signature(self):
        """Upload a signature first"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        files = {'file': ('test_signature.png', io.BytesIO(png_data), 'image/png')}
        session.post(f"{BASE_URL}/api/company/signature", files=files)
        yield session
        # Cleanup - delete signature
        session.delete(f"{BASE_URL}/api/company/signature")
    
    def test_kiosk_get_company_signature(self, setup_signature):
        """Test GET /api/kiosk/{company_id}/company/signature returns image"""
        response = requests.get(f"{BASE_URL}/api/kiosk/{COMPANY_ID}/company/signature")
        assert response.status_code == 200, f"Kiosk signature failed: {response.text}"
        assert response.headers.get("content-type", "").startswith("image/")
        print("✓ Kiosk signature endpoint returns image")
    
    def test_kiosk_signature_404_when_not_uploaded(self):
        """Test kiosk signature returns 404 when no signature uploaded"""
        # First delete any existing signature
        session = requests.Session()
        session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        session.delete(f"{BASE_URL}/api/company/signature")
        
        # Now test kiosk endpoint
        response = requests.get(f"{BASE_URL}/api/kiosk/{COMPANY_ID}/company/signature")
        assert response.status_code == 404
        print("✓ Kiosk signature returns 404 when not uploaded")


class TestKioskTenantLookup:
    """Test kiosk tenant lookup"""
    
    def test_kiosk_tenant_lookup(self):
        """Test kiosk tenant lookup by code"""
        response = requests.get(f"{BASE_URL}/api/kiosk/{COMPANY_ID}/tenants/lookup/HUR001")
        assert response.status_code == 200, f"Lookup failed: {response.text}"
        data = response.json()
        assert data["tenant_code"] == "HUR001"
        assert data["tenant_id"] == TENANT_ID
        print(f"✓ Kiosk tenant lookup works: {data['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
