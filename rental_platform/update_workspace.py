import frappe
import json

def update_workspace():
    workspace_name = "SaaS Rental Platform"
    if not frappe.db.exists("Workspace", workspace_name):
        print("Workspace not found")
        return

    doc = frappe.get_doc("Workspace", workspace_name)
    
    # In Frappe 15, workspaces use the 'content' JSON field for the layout.
    # Let's check if we can add a number card block.
    if doc.content:
        content = json.loads(doc.content)
        # Check if number card already exists
        exists = any(block.get("type") == "number_card" and block.get("data", {}).get("number_card_name") == "Pending Customer Approvals" for block in content)
        if not exists:
            # We add it at the top
            content.insert(0, {
                "id": frappe.generate_hash(length=10),
                "type": "number_card",
                "data": {
                    "number_card_name": "Pending Customer Approvals"
                }
            })
            doc.content = json.dumps(content)
            doc.save(ignore_permissions=True)
            print("Added Number Card to Workspace content")
    else:
        # If there's no content, maybe it's using the old 'links' and 'shortcuts' tables.
        # Frappe 15 auto-migrates these or we can just append to content directly.
        content = [
            {
                "id": frappe.generate_hash(length=10),
                "type": "number_card",
                "data": {
                    "number_card_name": "Pending Customer Approvals"
                }
            }
        ]
        doc.content = json.dumps(content)
        doc.save(ignore_permissions=True)
        print("Initialized Workspace content with Number Card")

    frappe.db.commit()
