import frappe
from frappe import _
import json

@frappe.whitelist()
def search_customers(search_term=""):
    """
    Custom search to find customers by name, mobile number, or email.
    """
    conditions = []
    if search_term:
        term = f"%{search_term}%"
        conditions = [
            ["Customer", "name", "like", term],
            ["Customer", "customer_name", "like", term],
            ["Customer", "mobile_no", "like", term],
            ["Customer", "email_id", "like", term],
        ]
        
    customers = frappe.get_all(
        "Customer",
        or_filters=conditions if search_term else None,
        fields=["name", "customer_name", "mobile_no", "email_id"],
        limit_page_length=20,
        order_by="modified desc"
    )
    
    # Masking is optional but recommended by requirements for privacy
    # For now we'll return exactly what's needed for the UI dropdown
    return customers

@frappe.whitelist()
def check_customer_permission():
    """
    Returns True if the current user has permission to create a Customer.
    """
    roles = frappe.get_roles()
    allowed_roles = ["System Manager", "Hotel Manager", "Hotel Reservation Staff"]
    if any(role in roles for role in allowed_roles):
        return True
    return frappe.has_permission("Customer", "create")

@frappe.whitelist()
def create_reservation_customer(**data):
    """
    Creates a Customer, Contact, and Address from a single payload.
    """
        
    roles = frappe.get_roles()
    allowed_roles = ["System Manager", "Hotel Manager", "Hotel Reservation Staff"]
    has_custom_role = any(role in roles for role in allowed_roles)
        
    if not has_custom_role and not frappe.has_permission("Customer", "create"):
        frappe.throw(_("You do not have permission to create Customers."), frappe.PermissionError)
        
    customer_name = data.get("customer_name")
    customer_type = data.get("customer_type", "Individual")
    mobile_no = data.get("mobile_no")
    email_id = data.get("email_id")
    
    if not customer_name:
        frappe.throw(_("Customer Name is required."))
        
    # Check for duplicates by mobile or email
    if mobile_no:
        existing = frappe.db.get_value("Customer", {"mobile_no": mobile_no}, ["name", "customer_name"], as_dict=True)
        if existing:
            frappe.throw(_("A customer already exists with this Mobile Number: {0} ({1})").format(existing.customer_name, existing.name))
            
    if email_id:
        existing = frappe.db.get_value("Customer", {"email_id": email_id}, ["name", "customer_name"], as_dict=True)
        if existing:
            frappe.throw(_("A customer already exists with this Email: {0} ({1})").format(existing.customer_name, existing.name))
            
    # Fallbacks for mandatory Customer fields
    customer_group = frappe.db.get_single_value("Selling Settings", "customer_group")
    if not customer_group:
        customer_group = frappe.db.get_value("Customer Group", {"is_group": 0}, "name") or "All Customer Groups"
        
    territory = frappe.db.get_single_value("Selling Settings", "territory")
    if not territory:
        territory = frappe.db.get_value("Territory", {"is_group": 0}, "name") or "All Territories"
        
    customer = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": customer_name,
        "customer_type": customer_type,
        "customer_group": customer_group,
        "territory": territory,
        "mobile_no": mobile_no,
        "email_id": email_id,
        "custom_customer_verified": 1
    })
    
    if has_custom_role:
        customer.flags.ignore_permissions = True
        
    customer.insert()
    
    # Create Contact
    if mobile_no or email_id:
        contact = frappe.get_doc({
            "doctype": "Contact",
            "first_name": customer_name,
            "is_primary_contact": 1,
            "links": [{"link_doctype": "Customer", "link_name": customer.name}]
        })
        if mobile_no:
            contact.append("phone_nos", {"phone": mobile_no, "is_primary_mobile_no": 1})
        if email_id:
            contact.append("email_ids", {"email_id": email_id, "is_primary": 1})
            
        if has_custom_role:
            contact.flags.ignore_permissions = True
        contact.insert()
        
    # Create Address
    address_line1 = data.get("address_line1")
    if address_line1:
        address = frappe.get_doc({
            "doctype": "Address",
            "address_title": customer_name,
            "address_type": "Billing",
            "address_line1": address_line1,
            "address_line2": data.get("address_line2"),
            "city": data.get("city"),
            "state": data.get("state"),
            "pincode": data.get("pincode"),
            "country": data.get("country", "India"),
            "links": [{"link_doctype": "Customer", "link_name": customer.name}]
        })
        
        if has_custom_role:
            address.flags.ignore_permissions = True
        address.insert()
        
    return {
        "name": customer.name,
        "customer_name": customer.customer_name,
        "mobile_no": customer.mobile_no,
        "email_id": customer.email_id
    }
