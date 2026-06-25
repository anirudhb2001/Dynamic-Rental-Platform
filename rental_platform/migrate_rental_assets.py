import frappe

def execute():
    print("Starting Rental Asset to Item Migration...")

    # 1. Migrate Categories to Item Group
    categories = frappe.get_all("Rental Asset Category", fields=["name", "description"])
    for cat in categories:
        if not frappe.db.exists("Item Group", cat.name):
            doc = frappe.get_doc({
                "doctype": "Item Group",
                "item_group_name": cat.name,
                "parent_item_group": "All Item Groups",
                "description": cat.description,
                "is_group": 0
            })
            doc.insert(ignore_permissions=True)
            print(f"Created Item Group: {cat.name}")

    # 2. Migrate Rental Assets to Item
    assets = frappe.get_all("Rental Asset", fields=["name", "asset_name", "asset_category", "serial_number", "asset_status", "rental_rate", "security_deposit", "custom_image", "custom_stock_qty"])

    for asset in assets:
        item_code = asset.asset_name
        
        # Determine tracking mode
        if asset.serial_number:
            tracking_mode = "Individual"
        else:
            tracking_mode = "Quantity"

        if not frappe.db.exists("Item", item_code):
            item = frappe.get_doc({
                "doctype": "Item",
                "item_code": item_code,
                "item_name": asset.asset_name,
                "item_group": asset.asset_category if frappe.db.exists("Item Group", asset.asset_category) else "All Item Groups",
                "stock_uom": "Nos",
                "is_stock_item": 1,
                "has_serial_no": 1 if tracking_mode == "Individual" else 0,
                "custom_is_rental_asset": 1,
                "custom_asset_tracking_mode": tracking_mode,
                "custom_daily_rate": asset.rental_rate or 0,
                "custom_security_deposit": asset.security_deposit or 0,
                "custom_legacy_rental_asset": asset.name,
                "image": asset.custom_image
            })
            item.insert(ignore_permissions=True)
            print(f"Created Item: {item_code}")
        
        # Handle Serial Number mapping
        if tracking_mode == "Individual" and asset.serial_number:
            if not frappe.db.exists("Serial No", asset.serial_number):
                # Note: creating serial no directly might need a stock entry in standard ERPNext.
                # However, for migration, we can create it via Stock Reconciliation.
                
                # To simplify the migration, we will just create a basic Stock Reconciliation to bring the serial no into stock
                try:
                    sr = frappe.get_doc({
                        "doctype": "Stock Reconciliation",
                        "purpose": "Stock Opening",
                        "company": frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company"),
                        "items": [{
                            "item_code": item_code,
                            "warehouse": "Stores - RAC" if frappe.db.exists("Warehouse", "Stores - RAC") else frappe.db.get_value("Warehouse", {}, "name"),
                            "qty": 1,
                            "serial_no": asset.serial_number
                        }]
                    })
                    sr.insert(ignore_permissions=True)
                    sr.submit()
                    print(f"Created Serial No & Stock for {asset.serial_number}")
                except Exception as e:
                    print(f"Error creating Stock Reconciliation for {asset.serial_number}: {e}")
        elif tracking_mode == "Quantity" and asset.custom_stock_qty:
            try:
                sr = frappe.get_doc({
                    "doctype": "Stock Reconciliation",
                    "purpose": "Stock Opening",
                    "company": frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company"),
                    "items": [{
                        "item_code": item_code,
                        "warehouse": "Stores - RAC" if frappe.db.exists("Warehouse", "Stores - RAC") else frappe.db.get_value("Warehouse", {}, "name"),
                        "qty": asset.custom_stock_qty
                    }]
                })
                sr.insert(ignore_permissions=True)
                sr.submit()
                print(f"Created Stock for {item_code} - Qty: {asset.custom_stock_qty}")
            except Exception as e:
                print(f"Error creating Stock Reconciliation for {item_code}: {e}")

    print("Migration Completed Successfully.")

