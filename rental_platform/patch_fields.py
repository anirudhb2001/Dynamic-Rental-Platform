import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def apply():
    print("Creating Custom Fields for Item...")
    custom_fields = [
        {"fieldname": "custom_is_rental_asset", "fieldtype": "Check", "label": "Is Rental Asset", "insert_after": "item_group"},
        {"fieldname": "custom_asset_tracking_mode", "fieldtype": "Select", "label": "Asset Tracking Mode", "options": "Individual\nQuantity", "default": "Individual", "insert_after": "custom_is_rental_asset", "depends_on": "eval:doc.custom_is_rental_asset==1"},
        {"fieldname": "custom_hourly_rate", "fieldtype": "Currency", "label": "Hourly Rate", "insert_after": "custom_asset_tracking_mode", "depends_on": "eval:doc.custom_is_rental_asset==1"},
        {"fieldname": "custom_daily_rate", "fieldtype": "Currency", "label": "Daily Rate", "insert_after": "custom_hourly_rate", "depends_on": "eval:doc.custom_is_rental_asset==1"},
        {"fieldname": "custom_weekly_rate", "fieldtype": "Currency", "label": "Weekly Rate", "insert_after": "custom_daily_rate", "depends_on": "eval:doc.custom_is_rental_asset==1"},
        {"fieldname": "custom_monthly_rate", "fieldtype": "Currency", "label": "Monthly Rate", "insert_after": "custom_weekly_rate", "depends_on": "eval:doc.custom_is_rental_asset==1"},
        {"fieldname": "custom_security_deposit", "fieldtype": "Currency", "label": "Security Deposit", "insert_after": "custom_monthly_rate", "depends_on": "eval:doc.custom_is_rental_asset==1"},
        {"fieldname": "custom_show_in_portal", "fieldtype": "Check", "label": "Show in Portal", "default": "1", "insert_after": "custom_security_deposit", "depends_on": "eval:doc.custom_is_rental_asset==1"},
        {"fieldname": "custom_featured_asset", "fieldtype": "Check", "label": "Featured Asset", "default": "0", "insert_after": "custom_show_in_portal", "depends_on": "eval:doc.custom_is_rental_asset==1"},
        {"fieldname": "custom_legacy_rental_asset", "fieldtype": "Link", "label": "Legacy Rental Asset", "options": "Rental Asset", "hidden": 1, "insert_after": "custom_featured_asset"}
    ]
    for field in custom_fields:
        create_custom_field("Item", field)

    print("Creating Custom Fields for Rental Return and Inspection...")
    rental_fields = [
        {"fieldname": "item", "fieldtype": "Link", "label": "Item", "options": "Item", "insert_after": "asset"},
        {"fieldname": "serial_no", "fieldtype": "Link", "label": "Serial No", "options": "Serial No", "insert_after": "item"}
    ]
    for doctype in ["Rental Return", "Rental Inspection", "Booking Details", "Booking details Table"]:
        for field in rental_fields:
            create_custom_field(doctype, field)

    print("Updating Branding Settings...")
    dt = frappe.get_doc("DocType", "Branding Settings")
    
    new_fields = [
        {"fieldname": "default_asset_tracking_mode", "fieldtype": "Select", "label": "Default Asset Tracking Mode", "options": "Individual\nQuantity\nMixed", "default": "Individual"},
        {"fieldname": "default_serial_no_mode", "fieldtype": "Select", "label": "Default Serial No Mode", "options": "Manual\nAuto", "default": "Manual"}
    ]
    existing = [f.fieldname for f in dt.fields]
    for f in new_fields:
        if f["fieldname"] not in existing:
            dt.append("fields", f)
            
    dt.save()
    frappe.db.commit()
    print("Done")
