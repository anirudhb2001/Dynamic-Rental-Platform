import frappe
import json

def create_workspace():
    workspace_name = "SaaS Rental Platform"
    if frappe.db.exists("Workspace", workspace_name):
        frappe.delete_doc("Workspace", workspace_name, force=1)

    print(f"Creating Workspace: {workspace_name}")
    
    workspace = frappe.get_doc({
        "doctype": "Workspace",
        "name": workspace_name,
        "title": workspace_name,
        "module": "Rental Platform",
        "is_standard": 1,
        "public": 1,
        "icon": "box",
        "indicator_color": "blue",
        "roles": [{"role": "System Manager"}],
        "links": [
            {
                "label": "Master Data",
                "type": "Card Break",
                "hidden": 0
            },
            {
                "label": "Rental Asset",
                "type": "Link",
                "link_type": "DocType",
                "link_to": "Rental Asset",
                "hidden": 0
            },
            {
                "label": "Rental Asset Category",
                "type": "Link",
                "link_type": "DocType",
                "link_to": "Rental Asset Category",
                "hidden": 0
            },
            {
                "label": "Transactions",
                "type": "Card Break",
                "hidden": 0
            },
            {
                "label": "Rental Booking",
                "type": "Link",
                "link_type": "DocType",
                "link_to": "Rental Booking",
                "hidden": 0
            },
            {
                "label": "Rental Return",
                "type": "Link",
                "link_type": "DocType",
                "link_to": "Rental Return",
                "hidden": 0
            },
            {
                "label": "Rental Inspection",
                "type": "Link",
                "link_type": "DocType",
                "link_to": "Rental Inspection",
                "hidden": 0
            },
            {
                "label": "Settings",
                "type": "Card Break",
                "hidden": 0
            },
            {
                "label": "Rental Settings",
                "type": "Link",
                "link_type": "DocType",
                "link_to": "Rental Settings",
                "hidden": 0
            },
            {
                "label": "Branding Settings",
                "type": "Link",
                "link_type": "DocType",
                "link_to": "Branding Settings",
                "hidden": 0
            }
        ]
    })
    
    workspace.insert(ignore_permissions=True)
    frappe.db.commit()
    print("Workspace created successfully.")

create_workspace()
