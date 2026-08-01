import frappe

def execute():
    be = frappe.get_doc("DocType", "Booking Entry")
    
    # Update name / UI label
    # While we keep "Booking Entry" as doctype name, we can set translated or just title.
    be.name = "Booking Entry" # Keep original

    # Remove old fields
    fields_to_remove = [
        "rental_from_date", "rental_to_date", "actual_to_date", 
        "security_document_status", "return_status", "pickup_from_date", 
        "rental_items"
    ]
    be.fields = [f for f in be.fields if f.fieldname not in fields_to_remove]

    # Update status options
    for f in be.fields:
        if f.fieldname == "status":
            f.options = "Reserved\nConfirmed\nCompleted\nCancelled"
            f.label = "Booking Status"

    # Add new fields
    new_fields = [
        {"fieldname": "venue", "fieldtype": "Link", "options": "Item", "label": "Venue", "reqd": 1, "insert_after": "customer"},
        {"fieldname": "event_type", "fieldtype": "Link", "options": "Event Type", "label": "Event Type", "reqd": 1, "insert_after": "venue"},
        {"fieldname": "event_date", "fieldtype": "Date", "label": "Event Date", "reqd": 1, "insert_after": "event_type"},
        {"fieldname": "time_slot", "fieldtype": "Link", "options": "Time Slot", "label": "Time Slot", "reqd": 1, "insert_after": "event_date"},
        {"fieldname": "guest_count", "fieldtype": "Int", "label": "Guest Count", "insert_after": "time_slot"},
        {"fieldname": "venue_capacity", "fieldtype": "Int", "label": "Venue Capacity", "read_only": 1, "fetch_from": "venue.venue_capacity", "insert_after": "guest_count"},
        {"fieldname": "special_instructions", "fieldtype": "Text", "label": "Special Instructions", "insert_after": "venue_capacity"}
    ]
    
    for nf in new_fields:
        be.append("fields", nf)
        
    be.save(ignore_permissions=True)
    frappe.db.commit()
    print("Refactored Booking Entry successfully.")
