import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    # 1. Create Event Type DocType
    if not frappe.db.exists("DocType", "Event Type"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Event Type",
            "module": "Rental Platform",
            "custom": 1,
            "autoname": "field:event_type_name",
            "fields": [
                {"fieldname": "event_type_name", "fieldtype": "Data", "label": "Event Type Name", "reqd": 1, "unique": 1},
                {"fieldname": "description", "fieldtype": "Text", "label": "Description"}
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
        })
        doc.insert(ignore_permissions=True)
        print("Created Event Type DocType")
    else:
        print("Event Type DocType already exists")

    # 2. Create Time Slot DocType
    if not frappe.db.exists("DocType", "Time Slot"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Time Slot",
            "module": "Rental Platform",
            "custom": 1,
            "autoname": "field:slot_name",
            "fields": [
                {"fieldname": "slot_name", "fieldtype": "Data", "label": "Slot Name", "reqd": 1, "unique": 1},
                {"fieldname": "start_time", "fieldtype": "Time", "label": "Start Time"},
                {"fieldname": "end_time", "fieldtype": "Time", "label": "End Time"}
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
        })
        doc.insert(ignore_permissions=True)
        print("Created Time Slot DocType")
    else:
        print("Time Slot DocType already exists")

    # 3. Add custom fields to Item
    custom_fields = {
        "Item": [
            {"fieldname": "venue_details_section", "fieldtype": "Section Break", "label": "Venue Details", "insert_after": "item_group"},
            {"fieldname": "is_venue", "fieldtype": "Check", "label": "Is Venue", "insert_after": "venue_details_section"},
            {"fieldname": "venue_capacity", "fieldtype": "Int", "label": "Venue Capacity", "insert_after": "is_venue", "depends_on": "eval:doc.is_venue==1"},
            {"fieldname": "venue_facilities", "fieldtype": "Text", "label": "Venue Facilities", "insert_after": "venue_capacity", "depends_on": "eval:doc.is_venue==1"}
        ]
    }
    create_custom_fields(custom_fields, ignore_validate=True)
    print("Added custom fields to Item")
    
    frappe.db.commit()
