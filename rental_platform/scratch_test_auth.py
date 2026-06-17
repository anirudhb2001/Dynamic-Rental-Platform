import frappe
from rental_platform.web_api.customer_portal_auth import _determine_approval_status, _enforce_approval_policy

def run_test():
    print("--- Test Matrix: _enforce_approval_policy ---")
    
    if frappe.db.exists("Customer", {"customer_name": "Test Enforce Approval"}):
        frappe.delete_doc("Customer", frappe.db.get_value("Customer", {"customer_name": "Test Enforce Approval"}, "name"))

    cust = frappe.new_doc("Customer")
    cust.customer_name = "Test Enforce Approval"
    cust.customer_type = "Individual"
    cust.portal_approval_status = "Pending"
    cust.custom_customer_verified = 1
    cust.insert(ignore_permissions=True)
    customer_name = cust.name

    print(f"Initial Status: {frappe.db.get_value('Customer', customer_name, 'portal_approval_status')}")

    # Test retro-active upgrade to OTP Login
    policy = {"authentication_mode": "OTP Login", "is_admin_approval_required": True}
    new_status = _enforce_approval_policy(customer_name, policy, "Pending")
    print(f"Switched to OTP Login -> New Status: {new_status} (Expected: Approved)")
    
    # Set back to pending
    frappe.db.set_value("Customer", customer_name, "portal_approval_status", "Pending")

    # Test retro-active upgrade to Google Login
    policy = {"authentication_mode": "Google Login", "is_admin_approval_required": True}
    new_status = _enforce_approval_policy(customer_name, policy, "Pending")
    print(f"Switched to Google Login -> New Status: {new_status} (Expected: Approved)")

    # Set back to pending
    frappe.db.set_value("Customer", customer_name, "portal_approval_status", "Pending")

    # Test no-upgrade for Email + Password when approval is required
    policy = {"authentication_mode": "Email + Password", "is_admin_approval_required": True}
    new_status = _enforce_approval_policy(customer_name, policy, "Pending")
    print(f"Switched to Email+Pass(require_admin=True) -> New Status: {new_status} (Expected: Pending)")

    # Test retro-active upgrade to Email + Password when approval is NOT required
    policy = {"authentication_mode": "Email + Password", "is_admin_approval_required": False}
    new_status = _enforce_approval_policy(customer_name, policy, "Pending")
    print(f"Switched to Email+Pass(require_admin=False) -> New Status: {new_status} (Expected: Approved)")
    
    frappe.delete_doc("Customer", customer_name)
