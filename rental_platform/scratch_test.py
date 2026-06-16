import frappe
from rental_platform.web_api.customer_portal_auth import _get_or_create_customer

def run_test():
    # Test 1: Create a customer without mobile number
    full_name = "Test No Mobile"
    email = "testnomobile@example.com"
    
    # ensure it doesn't exist
    if frappe.db.exists("Customer", {"custom_email": email}):
        frappe.delete_doc("Customer", frappe.db.get_value("Customer", {"custom_email": email}, "name"))
        
    customer_name, is_new = _get_or_create_customer(full_name=full_name, email=email, policy={"require_admin_approval": 0}, registration_method=None)
    
    doc = frappe.get_doc("Customer", customer_name)
    print(f"Test 1 - Customer Name: {doc.name}")
    print(f"Test 1 - Mobile No: {doc.mobile_no}")
    print(f"Test 1 - Alt Number: {doc.custom_alternate_number}")
    print(f"Test 1 - Verified: {doc.custom_customer_verified}")
    
    # Test 2: Create a customer with mobile number
    mobile = "9999999999"
    if frappe.db.exists("Customer", {"mobile_no": mobile}):
        frappe.delete_doc("Customer", frappe.db.get_value("Customer", {"mobile_no": mobile}, "name"))
        
    c2, is_new2 = _get_or_create_customer(full_name="Test With Mobile", mobile_no=mobile, policy={"require_admin_approval": 0}, registration_method=None)
    
    doc2 = frappe.get_doc("Customer", c2)
    print(f"Test 2 - Customer Name: {doc2.name}")
    print(f"Test 2 - Mobile No: {doc2.mobile_no}")
    print(f"Test 2 - Alt Number: {doc2.custom_alternate_number}")
