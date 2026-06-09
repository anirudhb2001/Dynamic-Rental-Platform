import json

file_path = "/home/anirudh-b/mynew-bench/apps/rental_platform/rental_platform/rental_platform/doctype/rental_return/rental_return.json"
with open(file_path, "r") as f:
    data = json.load(f)

new_fields = [
    {
        "fieldname": "customer",
        "fieldtype": "Link",
        "label": "Customer",
        "options": "Customer",
        "in_list_view": 1
    },
    {
        "fieldname": "asset",
        "fieldtype": "Link",
        "label": "Asset",
        "options": "Rental Asset"
    },
    {
        "fieldname": "rental_from_date",
        "fieldtype": "Datetime",
        "label": "Rental From Date"
    },
    {
        "fieldname": "rental_to_date",
        "fieldtype": "Datetime",
        "label": "Rental To Date"
    },
    {
        "fieldname": "late_days",
        "fieldtype": "Int",
        "label": "Late Days",
        "default": "0"
    },
    {
        "fieldname": "late_fee",
        "fieldtype": "Currency",
        "label": "Late Fee",
        "default": "0"
    },
    {
        "fieldname": "total_additional_charge",
        "fieldtype": "Currency",
        "label": "Total Additional Charge",
        "default": "0"
    },
    {
        "fieldname": "sales_invoice",
        "fieldtype": "Link",
        "label": "Sales Invoice",
        "options": "Sales Invoice"
    },
    {
        "fieldname": "return_processed_by",
        "fieldtype": "Link",
        "label": "Return Processed By",
        "options": "User",
        "read_only": 1
    }
]

existing_fieldnames = {f["fieldname"] for f in data["fields"]}
for field in new_fields:
    if field["fieldname"] not in existing_fieldnames:
        data["fields"].append(field)
        data["field_order"].append(field["fieldname"])

with open(file_path, "w") as f:
    json.dump(data, f, indent=1)
