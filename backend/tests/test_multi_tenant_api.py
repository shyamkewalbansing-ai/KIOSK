"""
Multi-Tenant Apartment Rent Payment Kiosk API Tests
Tests company auth, admin protected routes, kiosk public routes, and multi-tenant data isolation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Demo company credentials
DEMO_EMAIL = "demo@vastgoed.sr"
DEMO_PASSWORD = "demo123"
DEMO_COMPANY_ID = "comp_demo"

# Test data prefix for cleanup
TEST_PREFIX = "TEST_"


class TestCompanyAuth:
    """Company authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful company login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/companies/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "company_id" in data
        assert data["company_id"] == DEMO_COMPANY_ID
        assert data["email"] == DEMO_EMAIL
        assert "password_hash" not in data  # Should not expose password hash
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/companies/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        
    def test_login_missing_password(self):
        """Test login with missing password returns error"""
        response = requests.post(f"{BASE_URL}/api/companies/login", json={
            "email": DEMO_EMAIL
        })
        assert response.status_code == 422  # Validation error
        
    def test_register_duplicate_email(self):
        """Test registration with existing email fails"""
        response = requests.post(f"{BASE_URL}/api/companies/register", json={
            "name": "Duplicate Test",
            "email": DEMO_EMAIL,  # Already exists
            "password": "testpass123"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
    def test_me_without_auth(self):
        """Test /companies/me without authentication returns 401"""
        response = requests.get(f"{BASE_URL}/api/companies/me")
        assert response.status_code == 401


class TestCompanySession:
    """Company session management tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200
        return session
        
    def test_me_with_auth(self, auth_session):
        """Test /companies/me with valid session"""
        response = auth_session.get(f"{BASE_URL}/api/companies/me")
        assert response.status_code == 200
        data = response.json()
        assert data["company_id"] == DEMO_COMPANY_ID
        assert data["email"] == DEMO_EMAIL
        assert "password_hash" not in data
        
    def test_logout(self, auth_session):
        """Test logout clears session"""
        # First verify we're logged in
        response = auth_session.get(f"{BASE_URL}/api/companies/me")
        assert response.status_code == 200
        
        # Logout
        response = auth_session.post(f"{BASE_URL}/api/companies/logout")
        assert response.status_code == 200
        
        # Verify session is cleared
        response = auth_session.get(f"{BASE_URL}/api/companies/me")
        assert response.status_code == 401


class TestKioskPublicRoutes:
    """Kiosk public routes (no auth required) - scoped by company_id in URL"""
    
    def test_kiosk_get_company(self):
        """Test getting company info for kiosk"""
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/company")
        assert response.status_code == 200
        data = response.json()
        assert data["company_id"] == DEMO_COMPANY_ID
        assert data["name"] == "Demo Vastgoed BV"
        assert "password_hash" not in data
        
    def test_kiosk_get_company_not_found(self):
        """Test getting non-existent company returns 404"""
        response = requests.get(f"{BASE_URL}/api/kiosk/invalid_company/company")
        assert response.status_code == 404
        
    def test_kiosk_list_apartments(self):
        """Test listing apartments for kiosk"""
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/apartments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 6  # Demo has 6 apartments
        # Verify all apartments belong to demo company
        for apt in data:
            assert apt["company_id"] == DEMO_COMPANY_ID
            assert "number" in apt
            assert "monthly_rent" in apt
            
    def test_kiosk_list_tenants(self):
        """Test listing tenants for kiosk"""
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/tenants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4  # Demo has 4 tenants
        # Verify all tenants belong to demo company
        for tenant in data:
            assert tenant["company_id"] == DEMO_COMPANY_ID
            assert "tenant_code" in tenant
            assert "name" in tenant
            
    def test_kiosk_tenant_lookup_by_code(self):
        """Test tenant lookup by tenant code"""
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/tenants/lookup/HUR001")
        assert response.status_code == 200
        data = response.json()
        assert data["tenant_code"] == "HUR001"
        assert data["name"] == "Radjesh Kanhai"
        assert data["company_id"] == DEMO_COMPANY_ID
        
    def test_kiosk_tenant_lookup_by_apartment(self):
        """Test tenant lookup by apartment number"""
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/tenants/lookup/A101")
        assert response.status_code == 200
        data = response.json()
        assert data["apartment_number"] == "A101"
        assert data["company_id"] == DEMO_COMPANY_ID
        
    def test_kiosk_tenant_lookup_not_found(self):
        """Test tenant lookup with invalid code returns 404"""
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/tenants/lookup/INVALID")
        assert response.status_code == 404


class TestAdminProtectedRoutes:
    """Admin protected routes (require auth) - scoped to logged-in company"""
    
    @pytest.fixture
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200
        return session
        
    def test_dashboard_stats(self, auth_session):
        """Test dashboard stats endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_apartments" in data
        assert "occupied_apartments" in data
        assert "total_tenants" in data
        assert "total_revenue" in data
        assert "outstanding_rent" in data
        assert "recent_payments" in data
        
    def test_dashboard_stats_without_auth(self):
        """Test dashboard stats without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 401
        
    def test_list_apartments(self, auth_session):
        """Test listing apartments (admin)"""
        response = auth_session.get(f"{BASE_URL}/api/apartments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All apartments should belong to logged-in company
        for apt in data:
            assert apt["company_id"] == DEMO_COMPANY_ID
            
    def test_list_tenants(self, auth_session):
        """Test listing tenants (admin)"""
        response = auth_session.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All tenants should belong to logged-in company
        for tenant in data:
            assert tenant["company_id"] == DEMO_COMPANY_ID
            
    def test_list_payments(self, auth_session):
        """Test listing payments (admin)"""
        response = auth_session.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All payments should belong to logged-in company
        for payment in data:
            assert payment["company_id"] == DEMO_COMPANY_ID


class TestPaymentProcessing:
    """Payment processing tests - both kiosk and admin"""
    
    def test_kiosk_payment_partial_rent(self):
        """Test kiosk partial rent payment and balance update"""
        # Get tenant's current outstanding rent
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/tenants/lookup/HUR002")
        assert response.status_code == 200
        tenant = response.json()
        original_outstanding = tenant["outstanding_rent"]
        
        # Make partial payment
        payment_amount = 100.0
        response = requests.post(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/payments", json={
            "tenant_id": tenant["tenant_id"],
            "amount": payment_amount,
            "payment_type": "partial_rent",
            "payment_method": "cash",
            "description": "TEST partial payment"
        })
        assert response.status_code == 200
        payment = response.json()
        assert payment["amount"] == payment_amount
        assert payment["payment_type"] == "partial_rent"
        assert "kwitantie_nummer" in payment
        assert payment["kwitantie_nummer"].startswith("KW-")
        
        # Verify balance was updated
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/tenants/lookup/HUR002")
        assert response.status_code == 200
        updated_tenant = response.json()
        expected_outstanding = original_outstanding - payment_amount
        assert updated_tenant["outstanding_rent"] == expected_outstanding, \
            f"Expected {expected_outstanding}, got {updated_tenant['outstanding_rent']}"
            
    def test_kiosk_payment_invalid_tenant(self):
        """Test kiosk payment with invalid tenant returns 404"""
        response = requests.post(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/payments", json={
            "tenant_id": "invalid_tenant",
            "amount": 100.0,
            "payment_type": "rent",
            "payment_method": "cash"
        })
        assert response.status_code == 404


class TestMultiTenantDataIsolation:
    """Multi-tenant data isolation tests - Company A cannot see Company B's data"""
    
    @pytest.fixture
    def new_company_session(self):
        """Register a new company and return authenticated session"""
        session = requests.Session()
        unique_id = uuid.uuid4().hex[:8]
        email = f"test_{unique_id}@isolation.test"
        
        # Register new company
        response = session.post(f"{BASE_URL}/api/companies/register", json={
            "name": f"TEST Isolation Company {unique_id}",
            "email": email,
            "password": "testpass123",
            "address": "Test Address",
            "phone": "+597 000-0000"
        })
        assert response.status_code == 200
        company = response.json()
        
        yield session, company
        
        # Cleanup: logout
        session.post(f"{BASE_URL}/api/companies/logout")
        
    def test_new_company_cannot_see_demo_apartments(self, new_company_session):
        """New company should not see demo company's apartments"""
        session, company = new_company_session
        
        # List apartments for new company
        response = session.get(f"{BASE_URL}/api/apartments")
        assert response.status_code == 200
        apartments = response.json()
        
        # New company should have no apartments
        assert len(apartments) == 0, "New company should have no apartments"
        
    def test_new_company_cannot_see_demo_tenants(self, new_company_session):
        """New company should not see demo company's tenants"""
        session, company = new_company_session
        
        # List tenants for new company
        response = session.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        tenants = response.json()
        
        # New company should have no tenants
        assert len(tenants) == 0, "New company should have no tenants"
        
    def test_new_company_cannot_see_demo_payments(self, new_company_session):
        """New company should not see demo company's payments"""
        session, company = new_company_session
        
        # List payments for new company
        response = session.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        payments = response.json()
        
        # New company should have no payments
        assert len(payments) == 0, "New company should have no payments"
        
    def test_kiosk_routes_scoped_to_company(self):
        """Kiosk routes should only return data for specified company"""
        # Get demo company apartments
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/apartments")
        assert response.status_code == 200
        demo_apartments = response.json()
        
        # All apartments should belong to demo company
        for apt in demo_apartments:
            assert apt["company_id"] == DEMO_COMPANY_ID
            
        # Try to access non-existent company
        response = requests.get(f"{BASE_URL}/api/kiosk/invalid_company_id/apartments")
        assert response.status_code == 404


class TestApartmentCRUD:
    """Apartment CRUD operations (admin)"""
    
    @pytest.fixture
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200
        return session
        
    def test_create_apartment(self, auth_session):
        """Test creating a new apartment"""
        unique_id = uuid.uuid4().hex[:4]
        response = auth_session.post(f"{BASE_URL}/api/apartments", json={
            "number": f"TEST_{unique_id}",
            "floor": 3,
            "monthly_rent": 1500.0,
            "service_costs": 100.0,
            "description": "Test apartment",
            "status": "vacant"
        })
        assert response.status_code == 200
        apt = response.json()
        assert apt["number"] == f"TEST_{unique_id}"
        assert apt["company_id"] == DEMO_COMPANY_ID
        assert apt["monthly_rent"] == 1500.0
        
        # Cleanup: delete the apartment
        auth_session.delete(f"{BASE_URL}/api/apartments/{apt['apartment_id']}")
        
    def test_get_apartment(self, auth_session):
        """Test getting a specific apartment"""
        response = auth_session.get(f"{BASE_URL}/api/apartments/apt_001")
        assert response.status_code == 200
        apt = response.json()
        assert apt["apartment_id"] == "apt_001"
        assert apt["number"] == "A101"
        
    def test_update_apartment(self, auth_session):
        """Test updating an apartment"""
        # Create test apartment
        unique_id = uuid.uuid4().hex[:4]
        response = auth_session.post(f"{BASE_URL}/api/apartments", json={
            "number": f"TEST_UPD_{unique_id}",
            "floor": 1,
            "monthly_rent": 1000.0
        })
        apt = response.json()
        apt_id = apt["apartment_id"]
        
        # Update apartment
        response = auth_session.put(f"{BASE_URL}/api/apartments/{apt_id}", json={
            "monthly_rent": 1200.0,
            "description": "Updated description"
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["monthly_rent"] == 1200.0
        assert updated["description"] == "Updated description"
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/apartments/{apt_id}")
        
    def test_delete_apartment(self, auth_session):
        """Test deleting an apartment"""
        # Create test apartment
        unique_id = uuid.uuid4().hex[:4]
        response = auth_session.post(f"{BASE_URL}/api/apartments", json={
            "number": f"TEST_DEL_{unique_id}",
            "floor": 1,
            "monthly_rent": 1000.0
        })
        apt = response.json()
        apt_id = apt["apartment_id"]
        
        # Delete apartment
        response = auth_session.delete(f"{BASE_URL}/api/apartments/{apt_id}")
        assert response.status_code == 200
        
        # Verify deleted
        response = auth_session.get(f"{BASE_URL}/api/apartments/{apt_id}")
        assert response.status_code == 404


class TestTenantCRUD:
    """Tenant CRUD operations (admin)"""
    
    @pytest.fixture
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200
        return session
        
    def test_create_tenant(self, auth_session):
        """Test creating a new tenant"""
        # Use vacant apartment apt_004 (A202)
        response = auth_session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST Tenant",
            "apartment_id": "apt_004",
            "phone": "+597 1234567",
            "email": "test@tenant.com",
            "deposit_required": 4400.0,
            "deposit_paid": 4400.0
        })
        assert response.status_code == 200
        tenant = response.json()
        assert tenant["name"] == "TEST Tenant"
        assert tenant["company_id"] == DEMO_COMPANY_ID
        assert tenant["apartment_id"] == "apt_004"
        assert "tenant_code" in tenant
        
        # Cleanup: delete the tenant
        auth_session.delete(f"{BASE_URL}/api/tenants/{tenant['tenant_id']}")
        
    def test_get_tenant(self, auth_session):
        """Test getting a specific tenant"""
        response = auth_session.get(f"{BASE_URL}/api/tenants/ten_001")
        assert response.status_code == 200
        tenant = response.json()
        assert tenant["tenant_id"] == "ten_001"
        assert tenant["name"] == "Radjesh Kanhai"
        
    def test_update_tenant(self, auth_session):
        """Test updating a tenant"""
        # Get current tenant data
        response = auth_session.get(f"{BASE_URL}/api/tenants/ten_001")
        original = response.json()
        
        # Update tenant
        response = auth_session.put(f"{BASE_URL}/api/tenants/ten_001", json={
            "phone": "+597 9999999"
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["phone"] == "+597 9999999"
        
        # Restore original phone
        auth_session.put(f"{BASE_URL}/api/tenants/ten_001", json={
            "phone": original["phone"]
        })


class TestCompanyRegistration:
    """Company registration tests"""
    
    def test_register_new_company(self):
        """Test registering a new company"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"test_{unique_id}@newcompany.sr"
        
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/register", json={
            "name": f"TEST New Company {unique_id}",
            "email": email,
            "password": "testpass123",
            "address": "Test Street 123",
            "phone": "+597 111-1111"
        })
        assert response.status_code == 200
        company = response.json()
        assert company["email"] == email
        assert "company_id" in company
        assert company["company_id"].startswith("comp_")
        assert "password_hash" not in company
        
        # Verify session is created (can access /me)
        response = session.get(f"{BASE_URL}/api/companies/me")
        assert response.status_code == 200
        
        # Cleanup: logout
        session.post(f"{BASE_URL}/api/companies/logout")
        
    def test_register_short_password(self):
        """Test registration with short password (frontend validation)"""
        # Note: Backend doesn't enforce password length, but frontend does
        unique_id = uuid.uuid4().hex[:8]
        response = requests.post(f"{BASE_URL}/api/companies/register", json={
            "name": f"TEST Short Pass {unique_id}",
            "email": f"test_{unique_id}@shortpass.sr",
            "password": "123"  # Short password
        })
        # Backend accepts it (validation is on frontend)
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
