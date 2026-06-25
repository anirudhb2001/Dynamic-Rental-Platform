import json

with open('/home/anirudh-b/mynew-bench/apps/rental_platform/rental_platform/rental_platform/doctype/rental_booking/rental_booking.json', 'r') as f:
    data = json.load(f)

for field in data['fields']:
    if field['fieldname'] == 'asset':
        field['read_only'] = 1
        if 'reqd' in field:
            del field['reqd']
    if field['fieldname'] == 'rental_category':
        field['read_only'] = 1
        if 'reqd' in field:
            del field['reqd']

data['fields'].extend([
    {
        "fieldname": "item",
        "fieldtype": "Link",
        "in_list_view": 1,
        "label": "Item",
        "options": "Item"
    },
    {
        "fieldname": "serial_no",
        "fieldtype": "Link",
        "label": "Serial No",
        "options": "Serial No"
    },
    {
        "fieldname": "item_group",
        "fieldtype": "Link",
        "label": "Item Group",
        "options": "Item Group"
    }
])

data['field_order'].insert(1, "item")
data['field_order'].insert(2, "serial_no")
data['field_order'].insert(3, "item_group")

with open('/home/anirudh-b/mynew-bench/apps/rental_platform/rental_platform/rental_platform/doctype/rental_booking/rental_booking.json', 'w') as f:
    json.dump(data, f, indent=1)
