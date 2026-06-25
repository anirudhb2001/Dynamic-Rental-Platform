import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    doctypes = ["Rental Booking", "Rental Return"]
    fields = [
        {
            "fieldname": "asset_instance",
            "fieldtype": "Data",
            "label": "Asset Instance",
            "insert_after": "item"
        }
    ]

    for dt in doctypes:
        meta = frappe.get_meta(dt)
        for field in fields:
            if not meta.has_field(field['fieldname']):
                create_custom_field(dt, field)
                print(f"Added {field['fieldname']} to {dt}")
            else:
                print(f"Field {field['fieldname']} already exists in {dt}")

