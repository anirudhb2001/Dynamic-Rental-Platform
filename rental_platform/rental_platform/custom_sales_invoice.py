import frappe
from frappe.model.document import Document

def _map_source_row(row):
    source_type = "Rental Asset"
    item = None
    serial_no = None
    rental_item_id = row.get("rental_item_id")
    true_item_name = row.get("item_name")
    
    if row.get("item"):
        item = row.get("item")
        source_type = "Item"
        true_item_name = frappe.db.get_value("Item", item, "item_name") or true_item_name
    elif frappe.db.exists("Item", rental_item_id):
        item = rental_item_id
        source_type = "Item"
        true_item_name = frappe.db.get_value("Item", item, "item_name") or true_item_name

    if row.get("serial_no"):
        serial_no = row.get("serial_no")
        source_type = "Serial No"
        item = frappe.db.get_value("Serial No", serial_no, "item_code")
        true_item_name = frappe.db.get_value("Item", item, "item_name") or true_item_name
    elif frappe.db.exists("Serial No", rental_item_id):
        serial_no = rental_item_id
        item = frappe.db.get_value("Serial No", serial_no, "item_code")
        source_type = "Serial No"
        true_item_name = frappe.db.get_value("Item", item, "item_name") or true_item_name

    quantity = row.get("quantity", 1)
    if row.get("stock_quantity", 1) > 1 or quantity > 1:
        display_name = f"{true_item_name} (Qty: {int(quantity)})"
    else:
        display_name = true_item_name

    return {
        "rental_item_id": rental_item_id if source_type == "Rental Asset" else None,
        "item_name": row.get("item_name") if source_type == "Rental Asset" else None,
        "item": item,
        "serial_no": serial_no,
        "source_type": source_type,
        "display_name": display_name,
        "pricelist_name": row.get("pricelist_name"),
        "price": row.get("price", 0),
        "stock_quantity": row.get("stock_quantity", 1),
        "quantity": row.get("quantity", 1),
        "amount": row.get("amount", 0)
    }

def fetch_booking_details(doc, method):
    source_items = []
    
    if doc.custom_booking_entry:
        booking_entry = frappe.get_doc("Booking Entry", doc.custom_booking_entry)
        source_items = booking_entry.get("rental_items", [])
    elif doc.items and doc.items[0].sales_order:
        sales_order = frappe.get_doc("Sales Order", doc.items[0].sales_order)
        source_items = sales_order.get("custom_rental_items", [])

    if not source_items:
        return

    existing_rows = []
    for existing in doc.get("custom_rental_items", []):
        identifier = existing.rental_item_id or existing.item or existing.serial_no
        existing_rows.append(f"{identifier}-{existing.quantity}")

    for row in source_items:
        mapped_data = _map_source_row(row)
        identifier = mapped_data.get("rental_item_id") or mapped_data.get("item") or mapped_data.get("serial_no")
        unique_key = f"{identifier}-{mapped_data['quantity']}"

        if unique_key not in existing_rows:
            doc.append("custom_rental_items", mapped_data)
            existing_rows.append(unique_key)

@frappe.whitelist()
def get_mapped_rental_items(sales_order=None, booking_entry=None):
    source_items = []
    if booking_entry and frappe.db.exists("Booking Entry", booking_entry):
        doc = frappe.get_doc("Booking Entry", booking_entry)
        source_items = doc.get("rental_items", [])
    elif sales_order and frappe.db.exists("Sales Order", sales_order):
        doc = frappe.get_doc("Sales Order", sales_order)
        source_items = doc.get("custom_rental_items", [])

    mapped_items = []
    for row in source_items:
        mapped_items.append(_map_source_row(row))
    return mapped_items
