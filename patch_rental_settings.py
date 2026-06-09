import json

file_path = "/home/anirudh-b/mynew-bench/apps/rental_platform/rental_platform/rental_platform/doctype/rental_settings/rental_settings.json"
with open(file_path, "r") as f:
    data = json.load(f)

new_fields = [
    {
        "fieldname": "late_fee_item",
        "fieldtype": "Link",
        "label": "Late Fee Item",
        "options": "Item"
    },
    {
        "fieldname": "damage_charge_item",
        "fieldtype": "Link",
        "label": "Damage Charge Item",
        "options": "Item"
    },
    {
        "fieldname": "grace_period_hours",
        "fieldtype": "Int",
        "label": "Grace Period (Hours)",
        "default": "0"
    }
]

existing_fieldnames = {f["fieldname"] for f in data["fields"]}
for field in new_fields:
    if field["fieldname"] not in existing_fieldnames:
        data["fields"].append(field)
        data["field_order"].append(field["fieldname"])

with open(file_path, "w") as f:
    json.dump(data, f, indent=1)
