"""
Super Admin API Tests for Apartment Rent Payment Kiosk System
Tests super admin auth, company subscription management, invoice generation, and payment registration
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Super Admin credentials
SA_EMAIL = "admin@facturatie.sr"
SA_PASSWORD = "Bharat7755"

# Demo company credentials
DEMO_EMAIL = "demo@vastgoed.sr"
DEMO_PASSWORD = "demo123"
DEMO_COMPANY_ID = "comp_demo"

# Subscription constants
SUBSCRIPTION_PRICE = 3500
BANK_NAME = "Hakrinbank"
BANK_ACCOUNT = "205911044"
BANK_REFERENCE = "5978934982"


class TestSuperAdminAuth:
    """Super Admin authentication tests"""
    
    def test_superadmin_login_success(self):
        """Test successful super admin login"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/superadmin/login", json={
            "email": SA_EMAIL,
            "password": SA_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["email"] == SA_EMAIL
        assert data["role"] == "superadmin"
        
    def test_superadmin_login_invalid_credentials(self):
        """Test super admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/superadmin/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
    def test_superadmin_login_wrong_password(self):
        """Test super admin login with correct email but wrong password"""
        response = requests.post(f"{BASE_URL}/api/superadmin/login", json={
            "email": SA_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
    def test_superadmin_me_without_auth(self):
        """Test /superadmin/me without authentication returns 401"""
        response = requests.get(f"{BASE_URL}/api/superadmin/me")
        assert response.status_code == 401
        
    def test_superadmin_me_with_auth(self):
        """Test /superadmin/me with valid session"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/superadmin/login", json={
            "email": SA_EMAIL,
            "password": SA_PASSWORD
        })
        assert login_resp.status_code == 200
        
        response = session.get(f"{BASE_URL}/api/superadmin/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == SA_EMAIL
        assert data["role"] == "superadmin"
        
    def test_superadmin_logout(self):
        """Test super admin logout"""
        session = requests.Session()
        # Login
        session.post(f"{BASE_URL}/api/superadmin/login", json={
            "email": SA_EMAIL,
            "password": SA_PASSWORD
        })
        
        # Verify logged in
        response = session.get(f"{BASE_URL}/api/superadmin/me")
        assert response.status_code == 200
        
        # Logout
        response = session.post(f"{BASE_URL}/api/superadmin/logout")
        assert response.status_code == 200
        
        # Verify logged out
        response = session.get(f"{BASE_URL}/api/superadmin/me")
        assert response.status_code == 401


class TestSuperAdminStats:
    """Super Admin dashboard stats tests"""
    
    @pytest.fixture
    def sa_session(self):
        """Create authenticated super admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/superadmin/login", json={
            "email": SA_EMAIL,
            "password": SA_PASSWORD
        })
        assert response.status_code == 200
        return session
        
    def test_stats_endpoint(self, sa_session):
        """Test super admin stats endpoint returns all required fields"""
        response = sa_session.get(f"{BASE_URL}/api/superadmin/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required stats fields
        assert "total_companies" in data
        assert "trial_companies" in data
        assert "active_companies" in data
        assert "free_companies" in data
        assert "expired_companies" in data
        assert "deactivated_companies" in data
        assert "total_invoices" in data
        assert "paid_invoices" in data
        assert "pending_invoices" in data
        assert "total_revenue" in data
        
        # Verify bank details
        assert data["subscription_price"] == SUBSCRIPTION_PRICE
        assert data["bank_name"] == BANK_NAME
        assert data["bank_account"] == BANK_ACCOUNT
        assert data["bank_reference"] == BANK_REFERENCE
        
    def test_stats_without_auth(self):
        """Test stats endpoint without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/superadmin/stats")
        assert response.status_code == 401


class TestSuperAdminCompanies:
    """Super Admin company management tests"""
    
    @pytest.fixture
    def sa_session(self):
        """Create authenticated super admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/superadmin/login", json={
            "email": SA_EMAIL,
            "password": SA_PASSWORD
        })
        assert response.status_code == 200
        return session
        
    def test_list_companies(self, sa_session):
        """Test listing all companies"""
        response = sa_session.get(f"{BASE_URL}/api/superadmin/companies")
        assert response.status_code == 200
        companies = response.json()
        assert isinstance(companies, list)
        assert len(companies) >= 1  # At least demo company
        
        # Verify company structure
        for company in companies:
            assert "company_id" in company
            assert "name" in company
            assert "email" in company
            assert "subscription_status" in company
            assert "password_hash" not in company  # Should not expose password
            
    def test_get_company_details(self, sa_session):
        """Test getting specific company details"""
        response = sa_session.get(f"{BASE_URL}/api/superadmin/companies/{DEMO_COMPANY_ID}")
        assert response.status_code == 200
        company = response.json()
        
        assert company["company_id"] == DEMO_COMPANY_ID
        assert company["name"] == "Demo Vastgoed BV"
        assert "subscription_status" in company
        assert "apartment_count" in company
        assert "tenant_count" in company
        assert "payment_count" in company
        
    def test_get_company_not_found(self, sa_session):
        """Test getting non-existent company returns 404"""
        response = sa_session.get(f"{BASE_URL}/api/superadmin/companies/invalid_company")
        assert response.status_code == 404


class TestSubscriptionManagement:
    """Subscription management tests - activate, deactivate, free subscription"""
    
    @pytest.fixture
    def sa_session(self):
        """Create authenticated super admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/superadmin/login", json={
            "email": SA_EMAIL,
            "password": SA_PASSWORD
        })
        assert response.status_code == 200
        return session
        
    @pytest.fixture
    def test_company(self, sa_session):
        """Create a test company for subscription tests"""
        # Register new company
        unique_id = uuid.uuid4().hex[:8]
        company_session = requests.Session()
        response = company_session.post(f"{BASE_URL}/api/companies/register", json={
            "name": f"TEST Subscription Company {unique_id}",
            "email": f"test_sub_{unique_id}@test.sr",
            "password": "testpass123"
        })
        assert response.status_code == 200
        company = response.json()
        
        yield company
        
        # Cleanup: No need to delete, just leave it
        
    def test_company_registration_has_trial_status(self, test_company):
        """Test that newly registered company has trial subscription status"""
        assert test_company["subscription_status"] == "trial"
        assert "trial_end" in test_company
        
    def test_activate_company(self, sa_session, test_company):
        """Test activating a company subscription for 30 days"""
        company_id = test_company["company_id"]
        
        response = sa_session.put(f"{BASE_URL}/api/superadmin/companies/{company_id}/activate")
        assert response.status_code == 200
        
        # Verify company is now active
        response = sa_session.get(f"{BASE_URL}/api/superadmin/companies/{company_id}")
        assert response.status_code == 200
        company = response.json()
        assert company["subscription_status"] == "active"
        assert "subscription_end" in company
        
    def test_deactivate_company(self, sa_session, test_company):
        """Test deactivating a company"""
        company_id = test_company["company_id"]
        
        response = sa_session.put(f"{BASE_URL}/api/superadmin/companies/{company_id}/deactivate")
        assert response.status_code == 200
        
        # Verify company is deactivated
        response = sa_session.get(f"{BASE_URL}/api/superadmin/companies/{company_id}")
        assert response.status_code == 200
        company = response.json()
        assert company["subscription_status"] == "deactivated"
        
    def test_grant_free_subscription(self, sa_session, test_company):
        """Test granting free subscription (no expiry)"""
        company_id = test_company["company_id"]
        
        response = sa_session.put(f"{BASE_URL}/api/superadmin/companies/{company_id}/free-subscription")
        assert response.status_code == 200
        
        # Verify company has free subscription
        response = sa_session.get(f"{BASE_URL}/api/superadmin/companies/{company_id}")
        assert response.status_code == 200
        company = response.json()
        assert company["subscription_status"] == "free"
        assert company.get("is_free") == True


class TestDeactivatedCompanyAccess:
    """Test that deactivated companies cannot access admin or kiosk"""
    
    @pytest.fixture
    def sa_session(self):
        """Create authenticated super admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/superadmin/login", json={
            "email": SA_EMAIL,
            "password": SA_PASSWORD
        })
        assert response.status_code == 200
        return session
        
    @pytest.fixture
    def deactivated_company(self, sa_session):
        """Create and deactivate a test company"""
        # Register new company
        unique_id = uuid.uuid4().hex[:8]
        company_session = requests.Session()
        response = company_session.post(f"{BASE_URL}/api/companies/register", json={
            "name": f"TEST Deactivated Company {unique_id}",
            "email": f"test_deact_{unique_id}@test.sr",
            "password": "testpass123"
        })
        assert response.status_code == 200
        company = response.json()
        
        # Deactivate the company
        sa_session.put(f"{BASE_URL}/api/superadmin/companies/{company['company_id']}/deactivate")
        
        return company, company_session
        
    def test_deactivated_company_admin_access_blocked(self, deactivated_company):
        """Test that deactivated company cannot access admin dashboard"""
        company, company_session = deactivated_company
        
        # Try to access admin dashboard stats
        response = company_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
    def test_deactivated_company_kiosk_access_blocked(self, deactivated_company):
        """Test that deactivated company's kiosk is blocked"""
        company, _ = deactivated_company
        company_id = company["company_id"]
        
        # Try to access kiosk routes
        response = requests.get(f"{BASE_URL}/api/kiosk/{company_id}/company")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        response = requests.get(f"{BASE_URL}/api/kiosk/{company_id}/apartments")
        assert response.status_code == 403
        
        response = requests.get(f"{BASE_URL}/api/kiosk/{company_id}/tenants")
        assert response.status_code == 403


class TestInvoiceManagement:
    """Invoice generation and payment registration tests"""
    
    @pytest.fixture
    def sa_session(self):
        """Create authenticated super admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/superadmin/login", json={
            "email": SA_EMAIL,
            "password": SA_PASSWORD
        })
        assert response.status_code == 200
        return session
        
    def test_list_invoices(self, sa_session):
        """Test listing all invoices"""
        response = sa_session.get(f"{BASE_URL}/api/superadmin/invoices")
        assert response.status_code == 200
        invoices = response.json()
        assert isinstance(invoices, list)
        
    def test_generate_invoice(self, sa_session):
        """Test generating invoice for a company"""
        response = sa_session.post(f"{BASE_URL}/api/superadmin/invoices/generate/{DEMO_COMPANY_ID}")
        assert response.status_code == 200
        invoice = response.json()
        
        # Verify invoice structure
        assert "invoice_id" in invoice
        assert "invoice_number" in invoice
        assert invoice["invoice_number"].startswith("FAC-")
        assert invoice["company_id"] == DEMO_COMPANY_ID
        assert invoice["company_name"] == "Demo Vastgoed BV"
        assert invoice["amount"] == SUBSCRIPTION_PRICE
        assert invoice["status"] == "pending"
        assert invoice["bank_name"] == BANK_NAME
        assert invoice["bank_account"] == BANK_ACCOUNT
        assert invoice["bank_reference"] == BANK_REFERENCE
        
        return invoice
        
    def test_generate_invoice_not_found(self, sa_session):
        """Test generating invoice for non-existent company returns 404"""
        response = sa_session.post(f"{BASE_URL}/api/superadmin/invoices/generate/invalid_company")
        assert response.status_code == 404
        
    def test_register_payment_activates_subscription(self, sa_session):
        """Test that registering payment on invoice activates company subscription"""
        # First create a test company
        unique_id = uuid.uuid4().hex[:8]
        company_session = requests.Session()
        response = company_session.post(f"{BASE_URL}/api/companies/register", json={
            "name": f"TEST Invoice Company {unique_id}",
            "email": f"test_inv_{unique_id}@test.sr",
            "password": "testpass123"
        })
        assert response.status_code == 200
        company = response.json()
        company_id = company["company_id"]
        
        # Generate invoice for the company
        response = sa_session.post(f"{BASE_URL}/api/superadmin/invoices/generate/{company_id}")
        assert response.status_code == 200
        invoice = response.json()
        invoice_id = invoice["invoice_id"]
        
        # Register payment
        response = sa_session.post(f"{BASE_URL}/api/superadmin/invoices/{invoice_id}/register-payment", json={
            "paid_amount": SUBSCRIPTION_PRICE
        })
        assert response.status_code == 200
        
        # Verify invoice is now paid
        response = sa_session.get(f"{BASE_URL}/api/superadmin/invoices")
        invoices = response.json()
        paid_invoice = next((i for i in invoices if i["invoice_id"] == invoice_id), None)
        assert paid_invoice is not None
        assert paid_invoice["status"] == "paid"
        assert paid_invoice["paid_amount"] == SUBSCRIPTION_PRICE
        
        # Verify company subscription is now active
        response = sa_session.get(f"{BASE_URL}/api/superadmin/companies/{company_id}")
        company = response.json()
        assert company["subscription_status"] == "active"
        assert "subscription_end" in company
        
    def test_register_payment_already_paid(self, sa_session):
        """Test that registering payment on already paid invoice fails"""
        # Create company and invoice
        unique_id = uuid.uuid4().hex[:8]
        company_session = requests.Session()
        response = company_session.post(f"{BASE_URL}/api/companies/register", json={
            "name": f"TEST Double Pay {unique_id}",
            "email": f"test_dbl_{unique_id}@test.sr",
            "password": "testpass123"
        })
        company = response.json()
        
        # Generate and pay invoice
        response = sa_session.post(f"{BASE_URL}/api/superadmin/invoices/generate/{company['company_id']}")
        invoice = response.json()
        
        sa_session.post(f"{BASE_URL}/api/superadmin/invoices/{invoice['invoice_id']}/register-payment", json={
            "paid_amount": SUBSCRIPTION_PRICE
        })
        
        # Try to pay again
        response = sa_session.post(f"{BASE_URL}/api/superadmin/invoices/{invoice['invoice_id']}/register-payment", json={
            "paid_amount": SUBSCRIPTION_PRICE
        })
        assert response.status_code == 400


class TestExistingMultiTenantFeatures:
    """Verify existing multi-tenant features still work"""
    
    def test_company_login_still_works(self):
        """Test company login still works"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/companies/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["company_id"] == DEMO_COMPANY_ID
        
    def test_kiosk_flow_still_works(self):
        """Test kiosk flow still works for active company"""
        # Get company info
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/company")
        assert response.status_code == 200
        
        # Get apartments
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/apartments")
        assert response.status_code == 200
        apartments = response.json()
        assert len(apartments) >= 1
        
        # Get tenants
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/tenants")
        assert response.status_code == 200
        tenants = response.json()
        assert len(tenants) >= 1
        
        # Lookup tenant
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/tenants/lookup/HUR001")
        assert response.status_code == 200
        
    def test_admin_dashboard_still_works(self):
        """Test admin dashboard still works"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/companies/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        
        response = session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_apartments" in data
        assert "subscription_status" in data


class TestKioskPaymentWithBalanceUpdate:
    """Test kiosk payment flow with balance update"""
    
    def test_partial_rent_payment_decreases_outstanding(self):
        """Test that partial rent payment decreases outstanding_rent"""
        # Get tenant's current outstanding rent
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/tenants/lookup/HUR003")
        assert response.status_code == 200
        tenant = response.json()
        original_outstanding = tenant["outstanding_rent"]
        
        # Make partial payment
        payment_amount = 500.0
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
        
        # Verify balance was updated
        response = requests.get(f"{BASE_URL}/api/kiosk/{DEMO_COMPANY_ID}/tenants/lookup/HUR003")
        updated_tenant = response.json()
        expected_outstanding = original_outstanding - payment_amount
        assert updated_tenant["outstanding_rent"] == expected_outstanding, \
            f"Expected {expected_outstanding}, got {updated_tenant['outstanding_rent']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
