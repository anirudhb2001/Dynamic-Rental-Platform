import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    # 1. Create the Child Table DocType
    doctype_name = "Reservation Extension"
    if not frappe.db.exists("DocType", doctype_name):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": doctype_name,
            "module": "Rental Platform",
            "custom": 1,
            "istable": 1,
            "fields": [
                {"fieldname": "extension_date", "fieldtype": "Date", "label": "Extension Date", "reqd": 1, "in_list_view": 1},
                {"fieldname": "time_slot", "fieldtype": "Link", "options": "Time Slot", "label": "Time Slot", "in_list_view": 1},
                {"fieldname": "from_time", "fieldtype": "Time", "label": "From Time", "in_list_view": 1},
                {"fieldname": "to_time", "fieldtype": "Time", "label": "To Time", "in_list_view": 1},
                {"fieldname": "sales_order", "fieldtype": "Link", "options": "Sales Order", "label": "Sales Order", "read_only": 1, "in_list_view": 1},
                {"fieldname": "amount", "fieldtype": "Currency", "label": "Amount", "read_only": 1, "in_list_view": 1},
                {"fieldname": "notes", "fieldtype": "Text", "label": "Notes"},
                {"fieldname": "status", "fieldtype": "Select", "options": "Reserved\nConfirmed\nCancelled", "label": "Status", "default": "Reserved", "read_only": 1}
            ]
        })
        doc.insert(ignore_permissions=True)
        print(f"Created DocType: {doctype_name}")
    else:
        print(f"DocType {doctype_name} already exists.")

    # 2. Add Child Table to Booking Entry
    custom_fields = {
        "Booking Entry": [
            {
                "fieldname": "extensions_tab",
                "fieldtype": "Tab Break",
                "label": "Extensions",
                "insert_after": "special_instructions"
            },
            {
                "fieldname": "reservation_extensions",
                "fieldtype": "Table",
                "options": "Reservation Extension",
                "label": "Reservation Extensions",
                "insert_after": "extensions_tab"
            }
        ]
    }
    create_custom_fields(custom_fields, ignore_validate=True)
    frappe.db.commit()
    print("Added Reservation Extensions child table to Booking Entry")
