import frappe
from frappe import _

def update_asset_instance_status(item_code, registration_number, new_status):
    """
    Updates the status of an Asset Instance child row inside the Item doctype.
    Allowed statuses: Available, Reserved, On Rent, Maintenance, Sold
    """
    allowed_statuses = ["Available", "Reserved", "On Rent", "Maintenance", "Sold"]
    if new_status not in allowed_statuses:
        frappe.throw(_("Invalid Asset Instance status: {0}").format(new_status))
        
    if not item_code or not registration_number:
        return # Cannot update if details are missing
        
    # Find the row in Asset Instance where parent = item_code and registration_number matches
    instances = frappe.db.get_all(
        "Asset Instance",
        filters={
            "parent": item_code,
            "registration_number": registration_number,
            "parenttype": "Item"
        },
        fields=["name", "status"]
    )
    
    if instances:
        instance = instances[0]
        if instance.status != new_status:
            frappe.db.set_value("Asset Instance", instance.name, "status", new_status)
