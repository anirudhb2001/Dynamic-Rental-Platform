import frappe

def set_hotel_property(doc, method):
    if doc.get("custom_booking_entry"):
        hotel_property = frappe.db.get_value("Booking Entry", doc.custom_booking_entry, "hotel_property")
        if hotel_property:
            doc.custom_hotel_property = hotel_property
