import json
import os

filepath = "/home/anirudh-b/mynew-bench/apps/rental_platform/rental_platform/rental_platform/doctype/booking_details_sal/booking_details_sal.json"

with open(filepath, "r") as f:
    data = json.loads(f.read())

# Modify existing fields
for field in data.get("fields", []):
    if field.get("fieldname") == "rental_item_id":
        field["options"] = "Rental Asset"
        field["reqd"] = 0
    if field.get("fieldname") == "item_name":
        field["options"] = "Rental Asset"

# Check if fields exist to avoid duplicate appends
fieldnames = [f.get("fieldname") for f in data.get("fields", [])]

new_fields = []
if "item" not in fieldnames:
    new_fields.append({
        "fieldname": "item",
        "fieldtype": "Link",
        "label": "Item",
        "options": "Item"
    })
if "serial_no" not in fieldnames:
    new_fields.append({
        "fieldname": "serial_no",
        "fieldtype": "Link",
        "label": "Serial No",
        "options": "Serial No"
    })
if "source_type" not in fieldnames:
    new_fields.append({
        "fieldname": "source_type",
        "fieldtype": "Select",
        "label": "Source Type",
        "options": "Rental Asset\nItem\nSerial No"
    })
if "display_name" not in fieldnames:
    new_fields.append({
        "fieldname": "display_name",
        "fieldtype": "Data",
        "label": "Display Name",
        "in_list_view": 1
    })

# Add new fields right after item_name
item_name_idx = next((i for i, f in enumerate(data.get("fields", [])) if f.get("fieldname") == "item_name"), 2)

for i, f in enumerate(new_fields):
    data["fields"].insert(item_name_idx + 1 + i, f)

# Update field order
data["field_order"] = [f["fieldname"] for f in data.get("fields", [])]

with open(filepath, "w") as f:
    json.dump(data, f, indent=1)

print("Modified booking_details_sal.json successfully")
