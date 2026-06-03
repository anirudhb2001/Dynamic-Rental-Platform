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
        filters = {}
        category = kwargs.get("category")
        if category:
            filters["asset_category"] = category
            
        item_name = kwargs.get("item_name")
        if item_name:
            filters["asset_name"] = ["like", f"%{item_name}%"]
            
        status = kwargs.get("status")
        if status:
            filters["asset_status"] = status

        assets = frappe.get_all(
            "Rental Asset",
            filters=filters,
            fields=["name as id", "asset_name as name", "asset_category as category", "rental_rate as rate", "asset_status as status", "custom_image as image", "custom_stock_qty as stock_qty"]
        )
        
        sort_price = kwargs.get("sort_price")
        if sort_price:
            reverse = True if sort_price == "High to Low" else False
            assets = sorted(assets, key=lambda x: x.get("rate") or 0, reverse=reverse)
        # Process image paths if needed
        for asset in assets:
            if not asset.get("image"):
                # Default placeholder image if none exists
                asset["image"] = "https://images.unsplash.com/photo-1558981806-ec527fa842a5?w=500&q=80"
                
            # Default rate if none
            if not asset.get("rate"):
                asset["rate"] = 0
            
            # Default stock_qty if none
            if asset.get("stock_qty") is None:
                asset["stock_qty"] = 0
                
        return {"status": "success", "data": assets}
    except Exception as e:
        frappe.log_error(f"Error fetching Rental Assets: {str(e)}")
        return {"status": "error", "message": "Failed to fetch rental assets"}

@frappe.whitelist(allow_guest=True)
def get_rental_asset_categories():
    """
    Returns a list of all Rental Asset Categories for the UI filters.
    """
    try:
        categories = frappe.get_all("Rental Asset Category", fields=["name", "name as category_name"])
        return categories
    except Exception as e:
        frappe.log_error(f"Error fetching Rental Asset Categories: {str(e)}")
        return []
