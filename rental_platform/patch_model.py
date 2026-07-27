import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    meta = frappe.get_meta("Item")
    fields = [f for f in meta.fields if "model" in f.fieldname.lower() or "model" in f.label.lower()]
    print("Found model fields:", [f.fieldname for f in fields])
    
    if not any(f.fieldname == "custom_model" for f in fields):
        print("Creating custom_model field...")
        create_custom_field("Item", dict(
            fieldname="custom_model",
            label="Model",
            fieldtype="Data",
            insert_after="item_name"
        ))
        print("Done!")
