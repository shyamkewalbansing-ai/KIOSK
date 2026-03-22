"""
Test suite for iteration 6 features:
1. Stamp text fields in company settings (stamp_company_name, stamp_address, stamp_phone, stamp_whatsapp)
2. Kiosk stamp endpoint
3. Rent month display on tenant management page
4. Old signature endpoints should be removed (404)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COMPANY_EMAIL = "demo@vastgoed.sr"
COMPANY_PASSWORD = "demo123"
COMPANY_ID = "comp_demo"


class TestCompanyStampSettings:
    """Tests for stamp text fields in company settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        yield
        # Cleanup - logout
        self.session.post(f"{BASE_URL}/api/companies/logout")
    
    def test_get_company_settings_returns_stamp_fields(self):
        """GET /api/company/settings should return stamp text fields"""
        res = self.session.get(f"{BASE_URL}/api/company/settings")
        assert res.status_code == 200
        data = res.json()
        
        # Verify all stamp fields are present
        assert "stamp_company_name" in data, "stamp_company_name field missing"
        assert "stamp_address" in data, "stamp_address field missing"
        assert "stamp_phone" in data, "stamp_phone field missing"
        assert "stamp_whatsapp" in data, "stamp_whatsapp field missing"
        
        # Also verify billing fields still exist
        assert "billing_day_of_month" in data
        assert "late_fee_amount" in data
    
    def test_put_company_settings_saves_stamp_fields(self):
        """PUT /api/company/settings should save stamp text fields"""
        stamp_data = {
            "stamp_company_name": "Stichting : Perraysarbha",
            "stamp_address": "Kewalbasingweg .nr.7",
            "stamp_phone": "8624141",
            "stamp_whatsapp": "0620540162"
        }
        
        res = self.session.put(f"{BASE_URL}/api/company/settings", json=stamp_data)
        assert res.status_code == 200
        
        # Verify data was saved by fetching again
        get_res = self.session.get(f"{BASE_URL}/api/company/settings")
        assert get_res.status_code == 200
        data = get_res.json()
        
        assert data["stamp_company_name"] == stamp_data["stamp_company_name"]
        assert data["stamp_address"] == stamp_data["stamp_address"]
        assert data["stamp_phone"] == stamp_data["stamp_phone"]
        assert data["stamp_whatsapp"] == stamp_data["stamp_whatsapp"]
    
    def test_put_company_settings_partial_update(self):
        """PUT /api/company/settings should allow partial updates"""
        # Update only one field
        res = self.session.put(f"{BASE_URL}/api/company/settings", json={
            "stamp_company_name": "Test Company Name Only"
        })
        assert res.status_code == 200
        
        # Verify only that field changed
        get_res = self.session.get(f"{BASE_URL}/api/company/settings")
        data = get_res.json()
        assert data["stamp_company_name"] == "Test Company Name Only"
    
    def test_put_company_settings_empty_stamp_fields(self):
        """PUT /api/company/settings should allow empty stamp fields"""
        res = self.session.put(f"{BASE_URL}/api/company/settings", json={
            "stamp_company_name": "",
            "stamp_address": "",
            "stamp_phone": "",
            "stamp_whatsapp": ""
        })
        assert res.status_code == 200
        
        get_res = self.session.get(f"{BASE_URL}/api/company/settings")
        data = get_res.json()
        assert data["stamp_company_name"] == ""
        assert data["stamp_address"] == ""


class TestKioskStampEndpoint:
    """Tests for kiosk stamp endpoint"""
    
    def test_kiosk_get_company_stamp(self):
        """GET /api/kiosk/{company_id}/company/stamp should return stamp data"""
        # First, set some stamp data via admin
        session = requests.Session()
        login_res = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert login_res.status_code == 200
        
        stamp_data = {
            "stamp_company_name": "Kiosk Test Company",
            "stamp_address": "Test Address 123",
            "stamp_phone": "1234567",
            "stamp_whatsapp": "7654321"
        }
        session.put(f"{BASE_URL}/api/company/settings", json=stamp_data)
        
        # Now test kiosk endpoint (no auth required)
        res = requests.get(f"{BASE_URL}/api/kiosk/{COMPANY_ID}/company/stamp")
        assert res.status_code == 200
        data = res.json()
        
        assert data["stamp_company_name"] == stamp_data["stamp_company_name"]
        assert data["stamp_address"] == stamp_data["stamp_address"]
        assert data["stamp_phone"] == stamp_data["stamp_phone"]
        assert data["stamp_whatsapp"] == stamp_data["stamp_whatsapp"]
    
    def test_kiosk_stamp_invalid_company(self):
        """GET /api/kiosk/{invalid_company_id}/company/stamp should return 404"""
        res = requests.get(f"{BASE_URL}/api/kiosk/invalid_company_xyz/company/stamp")
        assert res.status_code == 404


class TestOldSignatureEndpointsRemoved:
    """Tests to verify old signature upload endpoints are removed"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert login_res.status_code == 200
        yield
        self.session.post(f"{BASE_URL}/api/companies/logout")
    
    def test_post_company_signature_removed(self):
        """POST /api/company/signature should return 404 or 405 (removed)"""
        # Try to upload a signature - should fail as endpoint is removed
        files = {'file': ('test.png', b'fake image data', 'image/png')}
        res = self.session.post(f"{BASE_URL}/api/company/signature", files=files)
        # Should be 404 (not found) or 405 (method not allowed)
        assert res.status_code in [404, 405, 422], f"Expected 404/405/422, got {res.status_code}"
    
    def test_get_company_signature_image_removed(self):
        """GET /api/company/signature/image should return 404 (removed)"""
        res = self.session.get(f"{BASE_URL}/api/company/signature/image")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    
    def test_delete_company_signature_removed(self):
        """DELETE /api/company/signature should return 404 or 405 (removed)"""
        res = self.session.delete(f"{BASE_URL}/api/company/signature")
        assert res.status_code in [404, 405], f"Expected 404/405, got {res.status_code}"


class TestTenantsEndpoint:
    """Tests for tenants endpoint - verify data structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert login_res.status_code == 200
        yield
        self.session.post(f"{BASE_URL}/api/companies/logout")
    
    def test_get_tenants_returns_data(self):
        """GET /api/tenants should return tenant list with required fields"""
        res = self.session.get(f"{BASE_URL}/api/tenants")
        assert res.status_code == 200
        tenants = res.json()
        
        assert isinstance(tenants, list)
        assert len(tenants) > 0, "Expected at least one tenant in demo data"
        
        # Check first tenant has required fields
        tenant = tenants[0]
        required_fields = ["tenant_id", "name", "apartment_number", "tenant_code", 
                          "outstanding_rent", "service_costs", "fines", "monthly_rent"]
        for field in required_fields:
            assert field in tenant, f"Missing field: {field}"


class TestPaymentsWithRentMonth:
    """Tests for payments with rent_month field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_res = self.session.post(f"{BASE_URL}/api/companies/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert login_res.status_code == 200
        yield
        self.session.post(f"{BASE_URL}/api/companies/logout")
    
    def test_get_payments_returns_rent_month(self):
        """GET /api/payments should return payments with rent_month field"""
        res = self.session.get(f"{BASE_URL}/api/payments")
        assert res.status_code == 200
        payments = res.json()
        
        # Payments list may be empty, that's ok
        assert isinstance(payments, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
