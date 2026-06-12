import frappe

@frappe.whitelist(allow_guest=True)
def get_branding_settings():
    """Securely fetch branding settings without requiring System Manager privileges."""
    try:
        settings = frappe.db.get_value(
    "Branding Settings",
    "Branding Settings",
    [
        "company_name",
        "logo",
        "primary_color",
        "secondary_color",
        "hero_title",
        "hero_subtitle",
        "asset_label",
        "accent_color",
        "authentication_mode",
        "require_admin_approval",
        "enable_google_login",
        "google_client_id"
    ],
    as_dict=True
)
        return settings
    except Exception as e:
        frappe.log_error(f"Failed to fetch branding settings: {str(e)}", "Branding API Error")
        return None
