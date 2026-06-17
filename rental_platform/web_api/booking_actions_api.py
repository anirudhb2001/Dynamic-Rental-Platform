import frappe

@frappe.whitelist(allow_guest=False)
def mark_as_picked_up(booking_id):
    if not frappe.has_permission("Rental Booking", "write"):
        return {"error": "You do not have permission to modify this booking."}
        
    try:
        booking = frappe.get_doc("Rental Booking", booking_id)
        if booking.docstatus != 1:
            return {"error": "Booking is not submitted."}
            
        if booking.booking_status != "Reserved":
            return {"error": f"Cannot pick up booking with status {booking.booking_status}."}
            
        frappe.db.set_value("Rental Booking", booking_id, "booking_status", "Picked Up")
        
        # Add a comment to the timeline
        booking.add_comment("Comment", text="Asset marked as Picked Up via Admin Action.")
        
        return {"message": "Booking marked as Picked Up."}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Mark Picked Up Error")
        return {"error": str(e)}

@frappe.whitelist(allow_guest=False)
def mark_as_completed(booking_id):
    if not frappe.has_permission("Rental Booking", "write"):
        return {"error": "You do not have permission to modify this booking."}
        
    try:
        booking = frappe.get_doc("Rental Booking", booking_id)
        if booking.docstatus != 1:
            return {"error": "Booking is not submitted."}
            
        if booking.booking_status not in ["Returned", "Picked Up", "Reserved"]:
            return {"error": f"Cannot complete booking with status {booking.booking_status}."}
            
        frappe.db.set_value("Rental Booking", booking_id, "booking_status", "Completed")
        
        # Add a comment to the timeline
        booking.add_comment("Comment", text="Rental marked as Completed via Admin Action.")
        
        return {"message": "Booking marked as Completed."}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Mark Completed Error")
        return {"error": str(e)}
