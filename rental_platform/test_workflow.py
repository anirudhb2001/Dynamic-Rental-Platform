import frappe
from rental_platform.web_api.cart_ import create_sales_order_and_booking_entry
from rental_platform.web_api.booking_actions_api import mark_as_picked_up, mark_as_completed
from rental_platform.web_api.rental_return_api import process_rental_return

def run():
    frappe.session.user = "Administrator"
    
    # Let's find an existing draft quotation to checkout, or just use an existing draft booking and submit it manually.
    draft_booking = frappe.db.get_value("Rental Booking", {"docstatus": 0}, "name")
    if draft_booking:
        print(f"Submitting Draft Booking: {draft_booking}")
        doc = frappe.get_doc("Rental Booking", draft_booking)
        doc.submit()
        
        # Check status
        print(f"Status after submit: {doc.booking_status} (docstatus: {doc.docstatus})")
        
        # Pick it up
        res = mark_as_picked_up(doc.name)
        print(f"Picked up result: {res}")
        
        # Check status
        doc.reload()
        print(f"Status after pick up: {doc.booking_status}")
        
        # Complete it
        res = mark_as_completed(doc.name)
        print(f"Completed result: {res}")
        
        doc.reload()
        print(f"Status after completed: {doc.booking_status}")
    else:
        print("No draft booking found to test.")
