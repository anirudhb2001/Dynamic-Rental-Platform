import frappe
import random
from frappe.utils import now_datetime, get_datetime

@frappe.whitelist(allow_guest=True)
def send_login_otp(mobile_no):
    if not mobile_no or len(mobile_no) != 10 or not mobile_no.isdigit():
        return {"success": False, "message": "Please enter a valid 10-digit mobile number."}
    
    otp_code = random.randint(1000, 9999)
    
    otp_verification = frappe.new_doc("OTP Verification")
    otp_verification.phone = mobile_no
    otp_verification.otp = otp_code
    otp_verification.custom_sms_type = "Login"
    otp_verification.time = now_datetime()
    otp_verification.insert(ignore_permissions=True)
    
    # SMS logic mocked
    frappe.msgprint("OTP generated (SMS disabled)")
    
    return {"success": True, "message": "OTP sent successfully.", "otp_code": otp_code}

@frappe.whitelist(allow_guest=True)
def verify_login_otp(mobile_no, otp_value):
    if not mobile_no or not otp_value:
        return {"success": False, "message": "Mobile number and OTP are required."}
        
    otp_record = frappe.get_all(
        "OTP Verification",
        filters={"phone": mobile_no},
        fields=["name", "otp", "time"],
        order_by="time desc",
        limit=1
    )
    
    if not otp_record:
        return {"success": False, "message": "No OTP found for this mobile number."}
        
    stored_otp = otp_record[0].get("otp")
    if str(otp_value) != str(stored_otp):
        return {"success": False, "message": "Invalid OTP. Please try again."}
        
    otp_time = get_datetime(otp_record[0].get("time"))
    if (now_datetime() - otp_time).total_seconds() > 300:
        return {"success": False, "message": "OTP has expired. Please generate a new one."}
        
    # Mark as verified
    frappe.db.set_value("OTP Verification", otp_record[0]["name"], "verified", 1)
    
    # Check if role exists
    if not frappe.db.exists("Role", "Rental Customer"):
        return {"success": False, "message": "Configuration Error: 'Rental Customer' role is missing in the system."}
        
    # Get or Create User
    user_email = f"{mobile_no}@customer.dynamicrental.local"
    user_name = frappe.db.get_value("User", {"mobile_no": mobile_no}, "name")
    
    if not user_name:
        user = frappe.new_doc("User")
        user.email = user_email
        user.first_name = "Customer"
        user.mobile_no = mobile_no
        user.send_welcome_email = 0
        user.insert(ignore_permissions=True)
        user.add_roles("Rental Customer")
        user_name = user.name
    
    # Get or Create Customer
    customer_name = frappe.db.get_value("Customer", {"mobile_no": mobile_no}, "name")
    if not customer_name:
        cust = frappe.new_doc("Customer")
        cust.customer_name = "Customer"
        cust.mobile_no = mobile_no
        cust.customer_group = "All Customer Groups"
        cust.territory = "All Territories"
        cust.insert(ignore_permissions=True)
        
    # Create Session
    from frappe.auth import LoginManager
    login_manager = LoginManager()
    login_manager.login_as(user_name)
    
    return {"success": True, "message": "Logged in successfully."}

@frappe.whitelist(allow_guest=True)
def get_customer_context():
    user = frappe.session.user
    if user == "Guest":
        return {"success": False, "message": "Not logged in."}
        
    user_doc = frappe.get_doc("User", user)
    mobile_no = user_doc.mobile_no
    
    if not mobile_no:
        return {"success": False, "message": "User has no mobile number."}
        
    customer_name = frappe.db.get_value("Customer", {"mobile_no": mobile_no}, "name")
    
    customer_details = None
    if customer_name:
        customer_details = frappe.get_doc("Customer", customer_name).as_dict()
        
    return {
        "success": True,
        "user": user_doc.as_dict(),
        "customer_id": customer_name,
        "customer": customer_details
    }
