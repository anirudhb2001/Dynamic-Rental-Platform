import frappe
from rental_platform.web_api.customer_portal_auth import _get_or_create_customer

def run_test():
    # Setup test policy for OTP + Approval
    policy = {
        "authentication_mode": "OTP + Approval",
        "require_admin_approval": 0
    }
    
    # 1. Clear previous test records
    frappe.db.delete("Customer", {"custom_email": "testnotif@example.com"})
    frappe.db.delete("Rental Notification", {"title": "New Customer Awaiting Approval"})
    frappe.db.delete("Notification Log", {"subject": "🔔 New Customer Registration Awaiting Approval"})
    
    # 2. Trigger creation
    customer_name, _ = _get_or_create_customer(
        "Test Notification Customer", 
        email="testnotif@example.com", 
        policy=policy, 
        registration_method="Google"
    )
    
    # 3. Verify Customer was created as Pending with registration_method = Google
    cust = frappe.get_doc("Customer", customer_name)
    print(f"Customer Created: Status={cust.portal_approval_status}, Method={cust.custom_registration_method}")
    
    # 4. Verify Notification Log was created
    notifs = frappe.get_all("Notification Log", filters={"subject": "🔔 New Customer Registration Awaiting Approval"}, fields=["subject", "link", "email_content"])
    print(f"Notification Logs created: {len(notifs)}")
    if notifs:
        print(f"First Notif: Subject='{notifs[0].subject}', Link='{notifs[0].link}'")
        
    frappe.db.delete("Customer", {"custom_email": "testnotif@example.com"})
