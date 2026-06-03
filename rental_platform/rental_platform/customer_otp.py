import random
import string
import frappe 
from frappe import _
from frappe.utils import get_datetime, add_to_date, now_datetime
from datetime import datetime
from frappe.desk.reportview import delete_bulk as core_delete_bulk

#function for otp generation and verification
@frappe.whitelist()
def handle_otp_and_customer(mobile_no=None, customer_name=None, otp_value=None, custom_alternate_number=None, alt_otp_value=None, action=None):
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
            otp_verification.custom_customer_name = customer_name
            otp_verification.save(ignore_permissions=True)
            
            return {"success": True, "message": "OTP sent successfully.", "otp_code": otp_code}  
        
        elif action == "verify_otp":
            if not otp_value:
                return {"success": False, "message": "OTP cannot be empty. Please enter the OTP."}
            
            otp_record = frappe.db.get_value("OTP Verification", {"phone": mobile_no, "otp": otp_value}, ["name", "creation"])
            if not otp_record:
                return {"success": False, "message": "Invalid OTP. Please enter the correct OTP."}
            
            current_time = get_datetime(now_datetime())
            otp_creation_time = get_datetime(otp_record[1])
            otp_expiry_time = add_to_date(otp_creation_time, seconds=120)

            if current_time > otp_expiry_time:
                return {"success": False, "message": "OTP has expired. Please request a new OTP."}
            
            frappe.db.set_value("OTP Verification", otp_record[0], "verified", 1)
            return {"success": True, "message": "OTP verified successfully."}

        elif action == "save_customer":
            if not otp_value:
                return {"success": False, "message": "OTP is required to verify the customer."}

            otp_verification = frappe.db.get_value(
                "OTP Verification", {"phone": mobile_no, "otp": otp_value}, ["verified"]
            )

            if otp_verification != 1:
                return {"success": False, "message": "Primary OTP is not verified."}

            if custom_alternate_number:
                if not alt_otp_value:
                    return {
                        "success": False,
                        "message": "Alternative OTP is required for the alternate mobile number.",
                    }

                alt_otp_verification = frappe.db.get_value(
                    "OTP Verification",
                    {"phone": custom_alternate_number, "otp": alt_otp_value},
                    ["verified"],
                )

                if alt_otp_verification != 1:
                    return {"success": False, "message": "Alternative OTP is not verified."}

            if frappe.db.exists("Customer", {"mobile_no": mobile_no}):
                return {"success": False, "message": "Customer already exists with this mobile number."}
            
            customer = frappe.new_doc("Customer")
            customer.customer_name = customer_name  
            customer.mobile_no = mobile_no
            customer.custom_alternate_number = custom_alternate_number
            customer.custom_customer_verified = 1
            customer.tax_category = "In-State" 
            customer.insert(ignore_permissions=True)
            
            if custom_alternate_number:
                create_alternate_contact(customer)

            # create_alternate_contact(customer.name)
            # Check if a contact already exists for the primary number
            # existing_contact = frappe.db.exists("Contact", {"mobile_no": mobile_no})
            # if not existing_contact:
            #     contact = frappe.new_doc("Contact")
            #     contact.first_name = customer_name
            #     contact.mobile_no = mobile_no
            #     contact.append("links", {
            #         "link_doctype": "Customer",
            #         "link_name": customer.name
            #     })
            #     contact.insert(ignore_permissions=True)
            return {"success": True, "message": "Customer and contacts saved successfully."}
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "OTP/Customer Handling Error")
        return {"success": False, "message": str(e)}
    

#function to create alternate contact
def create_alternate_contact(doc,method=None):
    if doc.custom_alternate_number:
        if frappe.db.exists("Contact", {"mobile_no": doc.custom_alternate_number}):
            alt_contact=frappe.get_doc("Contact",{"mobile_no": doc.custom_alternate_number})
            alt_contact.mobile_no = doc.custom_alternate_number
            alt_contact.append("phone_nos", {
                "phone": doc.custom_alternate_number,
                "is_primary_mobile_no": 0  
            })
            alt_contact.save(ignore_permissions=True)
        else:
            alt_contact=frappe.new_doc("Contact")
            alt_contact.first_name = doc.customer_name
            alt_contact.mobile_no = doc.custom_alternate_number
            alt_contact.append("links", {
                "link_doctype": "Customer",
                "link_name": doc.name
            })
            alt_contact.append("phone_nos", {
                "phone": doc.custom_alternate_number,
                "is_primary_mobile_no": 0  
            })
            alt_contact.save(ignore_permissions=True)


# function to customize delete message in customer list
@frappe.whitelist()
def custom_delete_items():
    """Custom delete function for selected items with a message for Customer doctype."""
    import json

    items = sorted(json.loads(frappe.form_dict.get("items")), reverse=True)
    doctype = frappe.form_dict.get("doctype")

    if doctype == "Customer":
        undeleted_items = []
        for name in items:
            try:
                frappe.delete_doc(doctype, name)
                frappe.msgprint(
                    _(f"Customer {name} deleted successfully"),
                    title=_("Success"),
                )
                frappe.db.commit()
            except Exception:
                undeleted_items.append(name)
                frappe.db.rollback()
        if undeleted_items:
            frappe.msgprint(
                _(f"Failed to delete {len(undeleted_items)} customers: {', '.join(undeleted_items)}"),
                title=_("Failed"),
            )
    else:
        if len(items) > 10:
            frappe.enqueue("frappe.desk.reportview.delete_bulk", doctype=doctype, items=items)
        else:
            core_delete_bulk(doctype, items)
