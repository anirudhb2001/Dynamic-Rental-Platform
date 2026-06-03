import frappe
import random
from frappe.utils import now_datetime

@frappe.whitelist()
def all_items_returned(self):
        rental_items = self.get("rental_items") or []  
        if not rental_items:  
            frappe.throw("No rental items found for this booking entry.")

        for item in rental_items:
            if item.returned_item != 1:  
                return False

        return True

@frappe.whitelist()
def send_otp(booking_entry_id):
    booking_entry = frappe.get_doc("Booking Entry", booking_entry_id)

    # Validate if all rental items are returned before sending OTP
    # if not booking_entry.all_items_returned():
    #     frappe.throw("Please return all rental items before verifying the security document.")

    customer = frappe.get_doc("Customer", booking_entry.customer)
    phone = customer.mobile_no or customer.phone

    if not phone:
        frappe.throw("Customer has no phone number.")

    otp = str(random.randint(1000, 9999))
    otp_doc = frappe.get_doc({
        "doctype": "OTP Verification",
        "user": frappe.session.user,
        "otp": otp,
        "phone": phone,
        "time": now_datetime(),
        "verified": 0
    })
    otp_doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "success", "message": f"OTP sent to {phone}", "phone": phone}


@frappe.whitelist()
def verify_otp(phone, otp, booking_entry_id):
    booking_entry = frappe.get_doc("Booking Entry", booking_entry_id)

    otp_entry = frappe.get_all("OTP Verification", filters={"phone": phone, "otp": otp, "verified": 0}, limit=1)

    if otp_entry:
        doc = frappe.get_doc("OTP Verification", otp_entry[0].name)
        doc.verified = 1
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return {"verified": True}
    
    return {"verified": False}


@frappe.whitelist()
def update_booking_security_status(sales_invoice):

    frappe.log_error(f"SI: {sales_invoice}", "DEBUG API")

    doc = frappe.get_doc("Sales Invoice", sales_invoice)

    if not doc.custom_booking_entry:
        frappe.log_error("No Booking Linked", "DEBUG")
        return {"status": "failed"}

    for row in doc.custom_rental_security_documents:

        frappe.log_error(f"Row Status: {row.status}", "DEBUG ROW")

        if row.status and "open" in row.status.lower():

            frappe.db.set_value(
                "Booking Entry",
                doc.custom_booking_entry,
                "security_document_status",
                "Document Pending To Return"
            )

            frappe.db.commit()

            frappe.log_error("UPDATED", "DEBUG SUCCESS")

            return {"status": "success"}

    return {"status": "no_change"}

# #############Get Security Document Status###################

@frappe.whitelist()
def get_security_document_status(customer=None, booking_entry=None):

    if not customer or not booking_entry:
        return {
            "status": "failed",
            "message": "Customer and Booking Entry are required"
        }

    booking = frappe.get_doc("Booking Entry", booking_entry)

    # Optional: validate customer matches
    if booking.customer != customer:
        return {
            "status": "failed",
            "message": "Customer mismatch"
        }

    return {
        "status": "success",
        "security_document_status": booking.security_document_status
    }