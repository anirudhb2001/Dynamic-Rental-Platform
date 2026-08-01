import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    # 1. Create Hotel Property DocType
    if not frappe.db.exists("DocType", "Hotel Property"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Hotel Property",
            "module": "Rental Platform",
            "custom": 1,
            "naming_rule": "By fieldname",
            "autoname": "field:hotel_name",
            "fields": [
                {"fieldname": "hotel_name", "fieldtype": "Data", "label": "Hotel Name", "reqd": 1, "unique": 1},
                {"fieldname": "hotel_code", "fieldtype": "Data", "label": "Hotel Code"},
                {"fieldname": "address", "fieldtype": "Small Text", "label": "Address"},
                {"fieldname": "city", "fieldtype": "Data", "label": "City"},
                {"fieldname": "state", "fieldtype": "Data", "label": "State"},
                {"fieldname": "contact_number", "fieldtype": "Data", "label": "Contact Number"},
                {"fieldname": "email", "fieldtype": "Data", "label": "Email"},
                {"fieldname": "website", "fieldtype": "Data", "label": "Website"},
                {"fieldname": "property_image", "fieldtype": "Attach Image", "label": "Property Image"},
                {"fieldname": "description", "fieldtype": "Text Editor", "label": "Description"},
                {"fieldname": "enabled", "fieldtype": "Check", "label": "Enabled", "default": "1"}
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
        })
        doc.insert()
        print("Created Hotel Property DocType")
    else:
        print("Hotel Property DocType already exists")

    # 2. Create Seating Type DocType
    if not frappe.db.exists("DocType", "Seating Type"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Seating Type",
            "module": "Rental Platform",
            "custom": 1,
            "naming_rule": "By fieldname",
            "autoname": "field:type_name",
            "fields": [
                {"fieldname": "type_name", "fieldtype": "Data", "label": "Type Name", "reqd": 1, "unique": 1}
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
        })
        doc.insert()
        print("Created Seating Type DocType")
    else:
        print("Seating Type DocType already exists")

    # 3. Create Venue Seating Capacity Child Table
    if not frappe.db.exists("DocType", "Venue Seating Capacity"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Venue Seating Capacity",
            "module": "Rental Platform",
            "custom": 1,
            "istable": 1,
            "fields": [
                {"fieldname": "seating_type", "fieldtype": "Link", "options": "Seating Type", "label": "Seating Type", "in_list_view": 1, "reqd": 1},
                {"fieldname": "capacity", "fieldtype": "Int", "label": "Capacity", "in_list_view": 1, "reqd": 1}
            ]
        })
        doc.insert()
        print("Created Venue Seating Capacity DocType")
    else:
        print("Venue Seating Capacity DocType already exists")

    # 4. Custom Fields for Item and Booking Entry
    custom_fields = {
        "Item": [
            {"fieldname": "hotel_property", "fieldtype": "Link", "options": "Hotel Property", "label": "Hotel Property", "insert_after": "is_venue"},
            {"fieldname": "venue_size", "fieldtype": "Float", "label": "Venue Size", "insert_after": "hotel_property"},
            {"fieldname": "venue_size_unit", "fieldtype": "Select", "options": "\nsq. ft.\nsq. m.", "label": "Size Unit", "insert_after": "venue_size"},
            {"fieldname": "venue_status", "fieldtype": "Select", "options": "\nAvailable\nMaintenance\nBlocked\nInactive", "label": "Venue Status", "insert_after": "venue_size_unit"},
            {"fieldname": "venue_description", "fieldtype": "Text Editor", "label": "Venue Description", "insert_after": "venue_status"},
            {"fieldname": "venue_image", "fieldtype": "Attach Image", "label": "Venue Image", "insert_after": "venue_description"},
            {"fieldname": "seating_capacities", "fieldtype": "Table", "options": "Venue Seating Capacity", "label": "Seating Capacities", "insert_after": "venue_image"}
        ],
        "Booking Entry": [
            {"fieldname": "hotel_property", "fieldtype": "Link", "options": "Hotel Property", "label": "Hotel Property", "insert_after": "customer"},
            {"fieldname": "seating_type", "fieldtype": "Link", "options": "Seating Type", "label": "Seating Type", "insert_after": "time_slot"}
        ]
    }

    create_custom_fields(custom_fields, update=True)
    frappe.db.commit()
    print("Custom fields added successfully.")
