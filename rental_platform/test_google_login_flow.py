import frappe
from rental_platform.web_api.customer_portal_auth import _get_or_create_user, _get_or_create_customer, _determine_approval_status
def run_test():
    # Setup test policy
    policy = {
        "authentication_mode": "Google Login",
        "require_admin_approval": 0,
        "enable_google_login": 1,
        "google_client_id": "test_client_id"
    }
    
    email = "testgooglelogin@example.com"
    full_name = "Test Google Login"
    
    if frappe.db.exists("User", {"email": email}):
        frappe.delete_doc("User", frappe.db.get_value("User", {"email": email}, "name"))
    if frappe.db.exists("Customer", {"custom_email": email}):
        frappe.delete_doc("Customer", frappe.db.get_value("Customer", {"custom_email": email}, "name"))

    user_name, is_new_user = _get_or_create_user(email, full_name)
    frappe.db.set_value("User", user_name, "enabled", 1)
    
    customer_name, is_new_customer = _get_or_create_customer(full_name, email=email, policy=policy, registration_method="Google")
    
    approval_status = frappe.db.get_value("Customer", customer_name, "portal_approval_status") or "Approved"
    
    if policy.get("authentication_mode") == "Google Login" and approval_status != "Approved":
        frappe.db.set_value("Customer", customer_name, "portal_approval_status", "Approved")
        approval_status = "Approved"
        
    doc = frappe.get_doc("User", user_name)
    cust = frappe.get_doc("Customer", customer_name)
    
    print(f"User: {doc.name}, Enabled: {doc.enabled}")
    print(f"Customer: {cust.name}, Approval Status: {cust.portal_approval_status}")

    # Test Google + Approval
    policy2 = {
        "authentication_mode": "Google + Approval",
        "require_admin_approval": 1,
        "enable_google_login": 1
    }
    email2 = "testgoogleapproval@example.com"
    
    if frappe.db.exists("User", {"email": email2}):
        frappe.delete_doc("User", frappe.db.get_value("User", {"email": email2}, "name"))
    if frappe.db.exists("Customer", {"custom_email": email2}):
        frappe.delete_doc("Customer", frappe.db.get_value("Customer", {"custom_email": email2}, "name"))

    user_name2, _ = _get_or_create_user(email2, "Test Google Approval")
    frappe.db.set_value("User", user_name2, "enabled", 1)
    
    customer_name2, _ = _get_or_create_customer("Test Google Approval", email=email2, policy=policy2, registration_method="Google")
    
    approval_status2 = frappe.db.get_value("Customer", customer_name2, "portal_approval_status") or "Approved"
    
    if policy2.get("authentication_mode") == "Google Login" and approval_status2 != "Approved":
        frappe.db.set_value("Customer", customer_name2, "portal_approval_status", "Approved")
        approval_status2 = "Approved"

    doc2 = frappe.get_doc("User", user_name2)
    cust2 = frappe.get_doc("Customer", customer_name2)
    
    print(f"User2: {doc2.name}, Enabled: {doc2.enabled}")
    print(f"Customer2: {cust2.name}, Approval Status: {cust2.portal_approval_status}")

