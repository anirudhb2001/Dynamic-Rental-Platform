import json
import os

filepath = "/home/anirudh-b/mynew-bench/apps/rental_platform/rental_platform/rental_platform/doctype/booking_details_sal/booking_details_sal.json"

with open(filepath, "r") as f:
    data = json.loads(f.read())

for field in data.get("fields", []):
    if field.get("fieldname") == "item_name":
        field["in_list_view"] = 0
    if field.get("fieldname") == "rental_item_id":
        field["in_list_view"] = 0

with open(filepath, "w") as f:
    json.dump(data, f, indent=1)

print("Modified booking_details_sal.json successfully")
