import frappe

@frappe.whitelist(allow_guest=True)
def get_tenant_config():
    """
    Returns the Rental Settings and Branding Settings for the current tenant.
    This is used by the generic React frontend to render dynamic UIs and branding.
    """
    config = {}

    # Fallback to default company if not set
    default_company = frappe.defaults.get_user_default("Company")
    if not default_company:
        companies = frappe.get_all("Company", limit=1)
        if companies:
            default_company = companies[0].name
    
    if frappe.db.exists("DocType", "Branding Settings"):
        try:
            branding = frappe.get_single("Branding Settings")
            config["branding"] = {
                "company_name": branding.get("company_name") or default_company or "Rental SaaS",
                "logo": branding.get("logo"),
                "primary_color": branding.get("primary_color"),
                "secondary_color": branding.get("secondary_color"),
                "website": branding.get("website"),
                "support_email": branding.get("support_email")
            }
        except Exception:
            config["branding"] = {"company_name": default_company or "Rental SaaS"}
    else:
        config["branding"] = {"company_name": default_company or "Rental SaaS"}

    # Fetch Rental Settings
    if frappe.db.exists("DocType", "Rental Settings"):
        try:
            settings = frappe.get_single("Rental Settings")
            config["features"] = {
                "enable_security_deposit": bool(settings.get("enable_security_deposit")),
                "enable_damage_charges": bool(settings.get("enable_damage_charges")),
                "enable_fuel_tracking": bool(settings.get("enable_fuel_tracking")),
                "enable_driver_details": bool(settings.get("enable_driver_details")),
                "enable_hourly_rental": bool(settings.get("enable_hourly_rental")),
                "enable_daily_rental": bool(settings.get("enable_daily_rental")),
                "enable_weekly_rental": bool(settings.get("enable_weekly_rental")),
                "enable_late_fees": bool(settings.get("enable_late_fees"))
            }
        except Exception:
            config["features"] = {}

    return config

@frappe.whitelist(allow_guest=True)
def get_rental_assets(**kwargs):
    """
    Returns the list of Rental Items for the dynamic UI.
    Filters by category if provided.
    """
    try:
        category = kwargs.get("category")
        item_name = kwargs.get("item_name")
        status = kwargs.get("status")

        # 1. Fetch Items
        item_filters = {"custom_is_rental_asset": 1}
        if category:
            item_filters["item_group"] = category
        if item_name:
            item_filters["item_name"] = ["like", f"%{item_name}%"]

        items = frappe.get_all("Item", filters=item_filters, fields=["name", "item_name", "item_group", "custom_daily_rate", "image", "custom_asset_tracking_mode"])

        results = []
        for item in items:
            rate = item.get("custom_daily_rate") or 0
            if item.custom_asset_tracking_mode == "Individual":
                # Fetch Serial Numbers
                sn_filters = {"item_code": item.name}
                if status:
                    if status == "Available":
                        sn_filters["status"] = "Active"
                    else:
                        sn_filters["status"] = status

                serial_nos = frappe.get_all("Serial No", filters=sn_filters, fields=["name", "status"])
                for sn in serial_nos:
                    results.append({
                        "id": sn.name,
                        "name": f"{item.item_name} ({sn.name})",
                        "category": item.item_group,
                        "rate": rate,
                        "status": "Available" if sn.status == "Active" else sn.status,
                        "image": item.image or "https://images.unsplash.com/photo-1558981806-ec527fa842a5?w=500&q=80",
                        "stock_qty": 1,
                        "is_serial_no": True,
                        "item_code": item.name
                    })
            else:
                # Quantity mode
                stock_qty = sum([b.actual_qty for b in frappe.get_all("Bin", filters={"item_code": item.name}, fields=["actual_qty"])])
                if status == "Available" and stock_qty <= 0:
                    continue
                
                results.append({
                    "id": item.name,
                    "name": item.item_name,
                    "category": item.item_group,
                    "rate": rate,
                    "status": "Available" if stock_qty > 0 else "Out of Stock",
                    "image": item.image or "https://images.unsplash.com/photo-1558981806-ec527fa842a5?w=500&q=80",
                    "stock_qty": stock_qty,
                    "is_serial_no": False,
                    "item_code": item.name
                })
        
        sort_price = kwargs.get("sort_price")
        if sort_price:
            reverse = True if sort_price == "High to Low" else False
            results = sorted(results, key=lambda x: x.get("rate") or 0, reverse=reverse)
                
        return {"status": "success", "data": results}
    except Exception as e:
        frappe.log_error(f"Error fetching Rental Assets: {str(e)}")
        return {"status": "error", "message": "Failed to fetch rental assets"}

@frappe.whitelist(allow_guest=True)
def get_rental_asset_categories():
    """
    Returns a list of all Rental Asset Categories (Item Groups) for the UI filters.
    """
    try:
        categories = frappe.db.sql("""
            SELECT DISTINCT item_group as name, item_group as category_name
            FROM `tabItem`
            WHERE custom_is_rental_asset = 1
        """, as_dict=True)
        return categories
    except Exception as e:
        frappe.log_error(f"Error fetching Rental Asset Categories: {str(e)}")
        return []
