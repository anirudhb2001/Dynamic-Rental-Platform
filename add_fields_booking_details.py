import frappe

def add_fields():
    custom_fields = [
        {
            "dt": "Booking details Table",
            "fieldname": "serial_no",
            "fieldtype": "Link",
            "options": "Serial No",
            "label": "Serial No",
            "insert_after": "item_name"
        },
        {
            "dt": "Booking details Table",
            "fieldname": "asset_instance",
            "fieldtype": "Link",
            "options": "Asset Instance",
            "label": "Asset Instance",
            "insert_after": "serial_no"
        }
    ]

    for field in custom_fields:
        if not frappe.db.exists("Custom Field", f"{field['dt']}-{field['fieldname']}"):
            frappe.get_doc({
                "doctype": "Custom Field",
                **field
            }).insert()
            print(f"Added {field['fieldname']}")
        else:
            print(f"Field {field['fieldname']} already exists.")
