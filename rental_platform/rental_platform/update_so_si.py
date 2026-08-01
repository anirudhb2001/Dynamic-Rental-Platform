import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Order": [
            {"fieldname": "custom_booking_entry", "fieldtype": "Link", "options": "Booking Entry", "label": "Venue Booking", "insert_after": "customer"}
        ],
        "Sales Invoice": [
            {"fieldname": "custom_booking_entry", "fieldtype": "Link", "options": "Booking Entry", "label": "Venue Booking", "insert_after": "customer"}
        ]
    }
    create_custom_fields(custom_fields, ignore_validate=True)
    frappe.db.commit()
    print("Added custom_booking_entry to SO and SI")
