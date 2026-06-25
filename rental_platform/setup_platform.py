import frappe

def create_doctypes():
    doctypes_to_recreate = [
        "Branding Settings",
        "Rental Asset Category",
        "Rental Asset",
        "Rental Booking",
        "Rental Return",
        "Rental Inspection"
    ]

    for dt in doctypes_to_recreate:
        if frappe.db.exists("DocType", dt):
            print(f"Deleting existing DocType {dt}...")
            frappe.delete_doc("DocType", dt, force=1)

    print("Creating Branding Settings...")
    frappe.get_doc({
        "doctype": "DocType",
        "name": "Branding Settings",
        "module": "Rental Platform",
        "custom": 0,
        "issingle": 1,
        "fields": [
            {"fieldname": "company_name", "fieldtype": "Data", "label": "Company Name"},
            {"fieldname": "logo", "fieldtype": "Attach Image", "label": "Logo"},
            {"fieldname": "primary_color", "fieldtype": "Color", "label": "Primary Color"},
            {"fieldname": "secondary_color", "fieldtype": "Color", "label": "Secondary Color"},
            {"fieldname": "website", "fieldtype": "Data", "label": "Website"},
            {"fieldname": "support_email", "fieldtype": "Data", "label": "Support Email"},
            {"fieldname": "default_asset_tracking_mode", "fieldtype": "Select", "label": "Default Asset Tracking Mode", "options": "Individual\nQuantity\nMixed", "default": "Individual"},
            {"fieldname": "default_serial_no_mode", "fieldtype": "Select", "label": "Default Serial No Mode", "options": "Manual\nAuto", "default": "Manual"}
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1}]
    }).insert(ignore_permissions=True)

    print("Updating Rental Settings...")
    # Rental Settings already exists, we will ensure it's not custom, though it might be owned by Rental Platform
    if frappe.db.exists("DocType", "Rental Settings"):
        settings = frappe.get_doc("DocType", "Rental Settings")
        settings.custom = 0
        new_fields = [
            {"fieldname": "enable_security_deposit", "fieldtype": "Check", "label": "Enable Security Deposit"},
            {"fieldname": "enable_damage_charges", "fieldtype": "Check", "label": "Enable Damage Charges"},
            {"fieldname": "enable_fuel_tracking", "fieldtype": "Check", "label": "Enable Fuel Tracking"},
            {"fieldname": "enable_driver_details", "fieldtype": "Check", "label": "Enable Driver Details"},
            {"fieldname": "enable_hourly_rental", "fieldtype": "Check", "label": "Enable Hourly Rental"},
            {"fieldname": "enable_daily_rental", "fieldtype": "Check", "label": "Enable Daily Rental"},
            {"fieldname": "enable_weekly_rental", "fieldtype": "Check", "label": "Enable Weekly Rental"},
            {"fieldname": "enable_late_fees", "fieldtype": "Check", "label": "Enable Late Fees"}
        ]
        existing_fields = [f.fieldname for f in settings.fields]
        for f in new_fields:
            if f["fieldname"] not in existing_fields:
                settings.append("fields", f)
        settings.save(ignore_permissions=True)

    print("Creating Rental Asset Category...")
    frappe.get_doc({
        "doctype": "DocType",
        "name": "Rental Asset Category",
        "module": "Rental Platform",
        "custom": 0,
        "autoname": "field:category_name",
        "fields": [
            {"fieldname": "category_name", "fieldtype": "Data", "label": "Category Name", "reqd": 1, "unique": 1},
            {"fieldname": "description", "fieldtype": "Small Text", "label": "Description"},
            {"fieldname": "active", "fieldtype": "Check", "label": "Active", "default": "1"}
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1}]
    }).insert(ignore_permissions=True)

    print("Creating Rental Asset...")
    frappe.get_doc({
        "doctype": "DocType",
        "name": "Rental Asset",
        "module": "Rental Platform",
        "custom": 0,
        "autoname": "field:asset_name",
        "fields": [
            {"fieldname": "asset_name", "fieldtype": "Data", "label": "Asset Name", "reqd": 1, "unique": 1},
            {"fieldname": "asset_category", "fieldtype": "Link", "label": "Asset Category", "options": "Rental Asset Category", "reqd": 1},
            {"fieldname": "serial_number", "fieldtype": "Data", "label": "Serial Number"},
            {"fieldname": "asset_status", "fieldtype": "Select", "label": "Asset Status", "options": "Available\nReserved\nRented\nMaintenance\nInactive", "default": "Available"},
            {"fieldname": "rental_rate", "fieldtype": "Currency", "label": "Rental Rate"},
            {"fieldname": "security_deposit", "fieldtype": "Currency", "label": "Security Deposit"},
            {"fieldname": "location", "fieldtype": "Data", "label": "Location"},
            {"fieldname": "notes", "fieldtype": "Small Text", "label": "Notes"}
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1}]
    }).insert(ignore_permissions=True)

    print("Creating Rental Booking...")
    frappe.get_doc({
        "doctype": "DocType",
        "name": "Rental Booking",
        "module": "Rental Platform",
        "custom": 0,
        "autoname": "RB-.YYYY.-.#####",
        "fields": [
            {"fieldname": "customer", "fieldtype": "Link", "label": "Customer", "options": "Customer", "reqd": 1},
            {"fieldname": "asset", "fieldtype": "Link", "label": "Asset", "options": "Rental Asset", "reqd": 1},
            {"fieldname": "start_date", "fieldtype": "Datetime", "label": "Start Date", "reqd": 1},
            {"fieldname": "end_date", "fieldtype": "Datetime", "label": "End Date", "reqd": 1},
            {"fieldname": "rental_duration", "fieldtype": "Int", "label": "Rental Duration (Hours/Days)"},
            {"fieldname": "rental_rate", "fieldtype": "Currency", "label": "Rental Rate"},
            {"fieldname": "deposit_amount", "fieldtype": "Currency", "label": "Deposit Amount"},
            {"fieldname": "booking_status", "fieldtype": "Select", "label": "Booking Status", "options": "Draft\nReserved\nPicked Up\nReturned\nCompleted", "default": "Draft"}
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1}]
    }).insert(ignore_permissions=True)

    print("Creating Rental Return...")
    frappe.get_doc({
        "doctype": "DocType",
        "name": "Rental Return",
        "module": "Rental Platform",
        "custom": 0,
        "autoname": "RR-.YYYY.-.#####",
        "fields": [
            {"fieldname": "booking", "fieldtype": "Link", "label": "Booking", "options": "Rental Booking", "reqd": 1},
            {"fieldname": "return_date", "fieldtype": "Datetime", "label": "Return Date", "reqd": 1},
            {"fieldname": "damage_found", "fieldtype": "Check", "label": "Damage Found"},
            {"fieldname": "damage_cost", "fieldtype": "Currency", "label": "Damage Cost"},
            {"fieldname": "remarks", "fieldtype": "Small Text", "label": "Remarks"}
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1}]
    }).insert(ignore_permissions=True)

    print("Creating Rental Inspection...")
    frappe.get_doc({
        "doctype": "DocType",
        "name": "Rental Inspection",
        "module": "Rental Platform",
        "custom": 0,
        "autoname": "RI-.YYYY.-.#####",
        "fields": [
            {"fieldname": "asset", "fieldtype": "Link", "label": "Asset", "options": "Rental Asset", "reqd": 1},
            {"fieldname": "inspection_date", "fieldtype": "Datetime", "label": "Inspection Date", "reqd": 1},
            {"fieldname": "condition_before", "fieldtype": "Small Text", "label": "Condition Before"},
            {"fieldname": "condition_after", "fieldtype": "Small Text", "label": "Condition After"},
            {"fieldname": "photos", "fieldtype": "Attach Image", "label": "Photos"},
            {"fieldname": "remarks", "fieldtype": "Small Text", "label": "Remarks"}
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1}]
    }).insert(ignore_permissions=True)

    print("Doctypes creation completed successfully.")
    frappe.db.commit()

def create_item_custom_fields():
    from frappe.custom.doctype.custom_field.custom_field import create_custom_field
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
    print("Item Custom Fields created successfully.")

create_doctypes()
create_item_custom_fields()
