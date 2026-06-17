import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def setup():
    # 1. Add custom_registration_method to Customer
    if not frappe.db.exists("Custom Field", "Customer-custom_registration_method"):
        create_custom_field("Customer", {
            "fieldname": "custom_registration_method",
            "label": "Registration Method",
            "fieldtype": "Data",
            "insert_after": "custom_email",
            "read_only": 1,
            "translatable": 0
        })
        print("Created Custom Field: custom_registration_method")
    
    # 2. Create Number Card for Pending Approvals
    card_name = "Pending Customer Approvals"
    if not frappe.db.exists("Number Card", card_name):
        doc = frappe.new_doc("Number Card")
        doc.name = card_name
        doc.label = card_name
        doc.document_type = "Customer"
        doc.function = "Count"
        doc.filters_json = '[["Customer","portal_approval_status","=","Pending",false]]'
        doc.is_standard = 1
        doc.module = "Rental Platform"
        doc.is_public = 1
        doc.show_percentage_stats = 0
        doc.stats_time_interval = "Daily"
        doc.type = "Document Type"
        doc.insert(ignore_permissions=True)
        print("Created Number Card: Pending Customer Approvals")
    else:
        print("Number Card already exists")

    frappe.db.commit()

