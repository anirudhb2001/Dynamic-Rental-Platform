import frappe
from frappe import _
def validate_hotel_property_access(hotel_property, user=None):
    if not hotel_property:
        return
        
    user = user or frappe.session.user
    if "System Manager" in frappe.get_roles(user):
        return
        
    if hotel_property == "All Properties":
        frappe.throw(_("You cannot explicitly select All Properties"), frappe.PermissionError)
        

    permitted_properties = get_user_hotel_properties(user)
    
    if hotel_property not in permitted_properties:
        frappe.throw(_("You do not have access to Hotel Property: {0}").format(hotel_property), frappe.PermissionError)

@frappe.whitelist()
def get_user_hotel_properties(user=None):
    user = user or frappe.session.user
    
    if "System Manager" in frappe.get_roles(user):
        return frappe.get_all("Hotel Property", filters={"enabled": 1}, pluck="name")
        
    properties = frappe.get_all(
        "User Permission", 
        filters={"user": user, "allow": "Hotel Property"}, 
        pluck="for_value"
    )
    
    if properties:
        valid_properties = frappe.get_all("Hotel Property", filters={"name": ["in", properties], "enabled": 1}, pluck="name")
        return valid_properties
        
    return []

@frappe.whitelist()
def get_property_context():
    """API for frontend to get context"""
    properties = get_user_hotel_properties()
    
    default_prop = None
    if properties:
        if len(properties) == 1:
            default_prop = properties[0]
        else:
            default_prop = frappe.db.get_value("User Permission", {"user": frappe.session.user, "allow": "Hotel Property", "is_default": 1}, "for_value")
            
    return {
        "properties": properties,
        "default_property": default_prop,
        "can_view_all_properties": "System Manager" in frappe.get_roles(frappe.session.user)
    }

def get_sql_match_conditions(doctype, user=None, alias=None):
    """
    Returns SQL conditions to append to raw queries for strict property isolation.
    """
    user = user or frappe.session.user
    if "System Manager" in frappe.get_roles(user):
        return ""
        
    properties = get_user_hotel_properties(user)
    if not properties:
        return "1=0" # Block all if no properties
        
    # Format properties for SQL IN clause safely
    props_sql = ", ".join([frappe.db.escape(p) for p in properties])
    
    prefix = f"{alias}." if alias else ""
    
    # Depending on doctype, field might be different
    field = "hotel_property" if doctype == "Booking Entry" else "custom_hotel_property"
    
    return f"{prefix}{field} IN ({props_sql})"
