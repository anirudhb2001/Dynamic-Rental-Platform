import frappe
import random
from frappe.utils import now_datetime
from frappe.model.document import Document

#function to fetch rental_items data from sales order to slaes invoice   
def fetch_booking_details(doc, method):
    if not doc.custom_booking_entry:
        return
    booking_entry = frappe.get_doc("Booking Entry", doc.custom_booking_entry)
    if not booking_entry:
        frappe.throw(f"Booking Entry {doc.custom_booking_entry} not found.")
    doc.booking_details_sal = []

    if not doc.custom_rental_items:
        for row in booking_entry.rental_items:
            doc.append("custom_rental_items", {  
                "rental_item_id": row.rental_item_id,
                "item_name": row.item_name,
                "pricelist_name": row.pricelist_name,
                "price": row.price,
                "stock_quantity": row.stock_quantity,
                "quantity": row.quantity,
                "amount": row.amount
            })






