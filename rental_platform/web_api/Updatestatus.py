import frappe

def update_booking_entry_status(doc, method):
    # Status is now updated directly by create_stock_entry_on_return
    pass

def create_stock_entry_on_sales_invoice_submit(doc, method):
    try:
        # Only process if this invoice is linked to a booking entry and is not an extension
        if not doc.custom_booking_entry or doc.custom_is_extended:  
            return
            
        # Use the robust return function from return_booking.py
        from rental_platform.web_api.return_booking import create_stock_entry_on_return
        
        # Check if the booking is already returned
        be = frappe.get_doc("Booking Entry", doc.custom_booking_entry)
        if be.return_status != "Returned":
            create_stock_entry_on_return(doc.custom_booking_entry, item_warehouses=None)
            
    except Exception as e:
        frappe.log_error(title="Auto Return Failed", message=frappe.get_traceback())
        frappe.throw(f"Failed to process return Stock Entry: {str(e)}")
