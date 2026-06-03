import frappe
import random
import string
from datetime import datetime
from frappe.utils import get_datetime, now_datetime, add_to_date

@frappe.whitelist()
def otp_for_new_phoneno(mobile_no=None, action=None):
    try:
        if action == "send_otp":
            if not mobile_no or len(mobile_no) != 10 or not mobile_no.isdigit():
                return {"success": False, "message": "Please enter a valid 10-digit mobile number."}
            if frappe.db.exists("Customer", {"mobile_no": mobile_no}):
                return {"success": False, "message": "Customer already exists with this mobile number."}

            otp_code = ''.join(random.choices(string.digits, k=4))  
            
            otp_verification = frappe.new_doc("OTP Verification")
            otp_verification.phone = mobile_no
            otp_verification.otp = otp_code
            otp_verification.custom_sms_type = "Onboarding"
            otp_verification.time = datetime.now()
            otp_verification.save(ignore_permissions=True)
            
            return {"success": True, "message": "OTP sent successfully.", "otp_code": otp_code}  
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "OTP Sending Error")   
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def otp_verify_new_phoneno(mobile_no=None, otp_value=None):   
    try:
        if not otp_value:
            return {"success": False, "message": "OTP cannot be empty. Please enter the OTP."}
            
        otp_record = frappe.db.get_value("OTP Verification", {"phone": mobile_no, "otp": otp_value}, ["name", "creation"])
        if not otp_record:
            return {"success": False, "message": "Invalid OTP. Please enter the correct OTP."}
        
        current_time = get_datetime(now_datetime())
        otp_creation_time = get_datetime(otp_record[1])
        otp_expiry_time = add_to_date(otp_creation_time, seconds=60)

        if current_time > otp_expiry_time:
            return {"success": False, "message": "OTP has expired. Please request a new OTP."}

        return {"success": True, "message": "OTP verified successfully."}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "OTP Verification Error")
        return {"success": False, "message": str(e)}


@frappe.whitelist()
def update_customer_contact(contact_name, new_mobile_no):
    try:
        contact = frappe.get_doc("Contact", contact_name)
        customer_link = frappe.db.get_value(
            "Dynamic Link",
            {"parenttype": "Contact", "link_doctype": "Customer", "parent": contact.name},
            "link_name"
        )

        if not customer_link:
            return {"success": False, "message": "No linked Customer found for this Contact."}

        if contact.is_primary_contact:
            customer = frappe.get_doc('Customer', customer_link)
            customer.mobile_no = new_mobile_no
            customer.save(ignore_permissions=True)

            # Update phone_nos child table in Contact doctype
            updated = False
            for phone_entry in contact.phone_nos:
                if phone_entry.is_primary_mobile_no:
                    phone_entry.phone = new_mobile_no
                    updated = True
                    break

            # If no primary phone entry was found, add a new one
            if not updated:
                contact.append("phone_nos", {
                    "phone": new_mobile_no,
                    "is_primary_mobile_no": 1
                })

            contact.save(ignore_permissions=True)
            frappe.db.commit()
            return {"success": True, "message": "Customer primary contact updated successfully."}

        else:
            customer = frappe.get_doc("Customer", customer_link)
            customer.custom_alternate_number = new_mobile_no
            customer.save(ignore_permissions=True)

            # Update phone_nos child table in Contact doctype
            # Update phone_nos child table in Contact doctype
                        # Update phone_nos child table in Contact doctype
            updated = False
            for phone_entry in contact.phone_nos:
                if not phone_entry.is_primary_mobile_no:  # Find the existing alternate number
                    phone_entry.phone = new_mobile_no
                    updated = True
                    break

            # If no alternate phone entry was found, return an error (instead of adding a new row)
            if not updated:
                return {"success": False, "message": "No alternate contact found to update."}

            contact.save(ignore_permissions=True)
            frappe.db.commit()
            return {"success": True, "message": "Customer alternate contact updated successfully."}

    except Exception as e:
        frappe.log_error(f"Error in update_customer_primary_contact: {str(e)}")
        return {"success": False, "message": f"An error occurred: {str(e)}"}



