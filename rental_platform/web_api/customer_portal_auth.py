import frappe
import random
from frappe.utils import now_datetime, get_datetime

@frappe.whitelist(allow_guest=True)
def send_login_otp(mobile_no):
    if not mobile_no:
        return {"success": False, "message": "Please enter a valid mobile number."}
        
    mobile_no = mobile_no.strip().replace(" ", "").replace("+", "").replace("-", "")
    if len(mobile_no) < 10 or not mobile_no.isdigit():
        return {"success": False, "message": "Please enter a valid 10-digit mobile number."}
    
    # Check if user is new
    is_new_user = not frappe.db.exists("User", {"mobile_no": mobile_no})
    
    otp_code = random.randint(1000, 9999)
    
    otp_verification = frappe.new_doc("OTP Verification")
    otp_verification.phone = mobile_no
    otp_verification.otp = otp_code
    otp_verification.custom_sms_type = "Login"
    otp_verification.time = now_datetime()
    otp_verification.insert(ignore_permissions=True)
    
    # SMS logic mocked
    frappe.msgprint("OTP generated (SMS disabled)")
    
    return {"success": True, "message": "OTP sent successfully.", "otp_code": otp_code, "is_new_user": is_new_user}

@frappe.whitelist(allow_guest=True)
def verify_login_otp(mobile_no, otp_value, full_name=None):
    if not mobile_no or not otp_value:
        return {"success": False, "message": "Mobile number and OTP are required."}
        
    mobile_no = mobile_no.strip().replace(" ", "").replace("+", "").replace("-", "")
        
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
        user_full_name = full_name or "Customer"
        user = frappe.new_doc("User")
        user.email = user_email
        user.first_name = user_full_name
        user.mobile_no = mobile_no
        user.send_welcome_email = 0
        user.insert(ignore_permissions=True)
        user.add_roles("Rental Customer")
        user_name = user.name
    
    # Get or Create Customer
    customer_name = frappe.db.get_value("Customer", {"mobile_no": mobile_no}, "name")
    if not customer_name:
        customer_full_name = full_name or "Customer"
        cust = frappe.new_doc("Customer")
        cust.customer_name = customer_full_name
        cust.customer_type = "Individual"
        cust.mobile_no = mobile_no
        cust.custom_alternate_number = mobile_no
        #cust.customer_group = "All Customer Groups"
        cust.territory = "All Territories"
        cust.custom_customer_verified = 1
        cust.custom_verify_alternate_otp = 1
        
        branding = frappe.db.get_value("Branding Settings", "Branding Settings", ["authentication_mode", "require_admin_approval"], as_dict=True) or {}
        auth_mode = branding.get("authentication_mode") or ""
        # The user explicitly asked to check "is_admin_approval_required" but the field is actually "require_admin_approval"
        # We will check both just in case it was aliased or if they just meant the checkbox.
        req_approval = branding.get("require_admin_approval", 0) or branding.get("is_admin_approval_required", 0)
        
        if req_approval or "Approval" in auth_mode:
            cust.portal_approval_status = "Pending"
        else:
            cust.portal_approval_status = "Approved"

        cust.insert(ignore_permissions=True)

        # --- Notification Trigger: New Customer Registration ---
        try:
            from rental_platform.web_api.notification import create_admin_notification
            create_admin_notification(
                title="New Customer Registered",
                message=f"{customer_full_name} registered successfully",
                notification_type="Customer Registration",
                priority="Medium",
            )
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Customer Registration Notification Error")
        
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

@frappe.whitelist()
def update_approval_status(customer_id, status):
    if "System Manager" not in frappe.get_roles(frappe.session.user):
        return {"success": False, "message": "Not authorized."}
        
    if status not in ["Approved", "Rejected"]:
        return {"success": False, "message": "Invalid status."}
        
    frappe.db.set_value("Customer", customer_id, "portal_approval_status", status)
    
    # Trigger notifications
    cust = frappe.get_doc("Customer", customer_id)
    try:
        from rental_platform.web_api.notification import create_admin_notification
        create_admin_notification(
            title=f"Account {status}",
            message=f"Your account registration has been {status.lower()}.",
            notification_type="Customer Registration",
            priority="High" if status == "Rejected" else "Medium",
            customer=customer_id
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Customer Approval Notification Error")
        
    return {"success": True, "message": f"Customer {status} successfully."}

@frappe.whitelist(allow_guest=True)
def register_with_email(full_name, email, mobile_no, password):
    if not all([full_name, email, mobile_no, password]):
        return {"success": False, "message": "All fields are required."}
        
    if frappe.db.exists("User", {"email": email}):
        return {"success": False, "message": "An account with this email already exists."}
        
    if frappe.db.exists("Customer", {"mobile_no": mobile_no}):
        return {"success": False, "message": "A customer with this mobile number already exists."}

    # Policy Check
    branding = frappe.db.get_value("Branding Settings", "Branding Settings", ["authentication_mode", "require_admin_approval"], as_dict=True) or {}
    auth_mode = branding.get("authentication_mode") or ""
    req_approval = branding.get("require_admin_approval", 0) or branding.get("is_admin_approval_required", 0)
    
    approval_status = "Pending" if (req_approval or "Approval" in auth_mode) else "Approved"

    try:
        # Create Customer
        cust = frappe.new_doc("Customer")
        cust.customer_name = full_name
        cust.customer_type = "Individual"
        cust.mobile_no = mobile_no
        cust.custom_alternate_number = mobile_no
        cust.territory = "All Territories"
        cust.custom_customer_verified = 1
        cust.custom_verify_alternate_otp = 1
        cust.custom_email = email
        cust.portal_approval_status = approval_status
        cust.insert(ignore_permissions=True)

        # Create User
        user = frappe.new_doc("User")
        user.email = email
        user.first_name = full_name
        user.mobile_no = mobile_no
        user.new_password = password
        user.send_welcome_email = 0
        user.enabled = 0 # Disable until email verified
        
        # Use reset_password_key for email verification
        token = frappe.generate_hash(length=32)
        user.reset_password_key = token
        
        user.insert(ignore_permissions=True)
        user.add_roles("Rental Customer")

        # Send Verification Email
        verify_link = frappe.utils.get_url(f"/api/method/rental_platform.web_api.customer_portal_auth.verify_email?token={token}")
        
        frappe.sendmail(
            recipients=[email],
            subject="Verify your email address",
            message=f"<p>Hi {full_name},</p><p>Please verify your email address by clicking the link below:</p><p><a href='{verify_link}'>{verify_link}</a></p>"
        )

        # Trigger notification
        try:
            from rental_platform.web_api.notification import create_admin_notification
            create_admin_notification(
                title="New Customer Registered",
                message=f"{full_name} registered via Email successfully.",
                notification_type="Customer Registration",
                priority="Medium",
            )
        except Exception:
            pass

        return {
            "success": True, 
            "message": "Registration successful. Please check your email to verify your account."
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Email Registration Error")
        return {"success": False, "message": "An error occurred during registration."}

@frappe.whitelist(allow_guest=True)
def verify_email(token):
    user = frappe.db.get_value("User", {"reset_password_key": token}, "name")
    if not user:
        frappe.respond_as_web_page("Invalid Token", "This verification link is invalid or has expired.", success=False)
        return
        
    frappe.db.set_value("User", user, {
        "enabled": 1,
        "reset_password_key": ""
    })
    
    frappe.db.commit()
    frappe.local.response.type = "redirect"
    frappe.local.response.location = "/dashboard"

@frappe.whitelist(allow_guest=True)
def login_with_email(email, password):
    if not email or not password:
        return {"success": False, "message": "Email and password are required."}
        
    user = frappe.db.get_value("User", {"email": email}, ["name", "enabled"], as_dict=True)
    if not user:
        return {"success": False, "message": "Invalid email or password."}
        
    if not user.enabled:
        return {"success": False, "message": "Please verify your email address first."}
        
    try:
        from frappe.auth import LoginManager
        login_manager = LoginManager()
        login_manager.authenticate(user.name, password)
        login_manager.post_login()
        return {"success": True, "message": "Logged in successfully."}
    except frappe.AuthenticationError:
        return {"success": False, "message": "Invalid email or password."}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Email Login Error")
        return {"success": False, "message": str(e)}

@frappe.whitelist(allow_guest=True)
def forgot_password(email):
    if not email:
        return {"success": False, "message": "Email is required."}
        
    user = frappe.db.get_value("User", {"email": email}, "name")
    if not user:
        # Standard security practice: Don't reveal if user exists
        return {"success": True, "message": "If this email is registered, you will receive a password reset link."}
        
    try:
        from frappe.core.doctype.user.user import reset_password
        reset_password(user)
        return {"success": True, "message": "If this email is registered, you will receive a password reset link."}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Forgot Password Error")
        return {"success": False, "message": "Failed to send reset link."}

@frappe.whitelist(allow_guest=True)
def google_login(id_token):
    if not id_token:
        return {"success": False, "message": "Google token is required."}
        
    branding = frappe.db.get_value("Branding Settings", "Branding Settings", 
        ["enable_google_login", "google_client_id", "authentication_mode", "require_admin_approval"], as_dict=True) or {}
        
    if not branding.get("enable_google_login") or not branding.get("google_client_id"):
        return {"success": False, "message": "Google Login is not enabled or not configured."}
        
    import requests
    try:
        response = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}")
        if response.status_code != 200:
            return {"success": False, "message": "Invalid Google token."}
            
        user_info = response.json()
        
        if user_info.get("aud") != branding.get("google_client_id"):
            return {"success": False, "message": "Invalid token audience."}
            
        email = user_info.get("email")
        full_name = user_info.get("name") or "Google User"
        
        if not email:
            return {"success": False, "message": "Google account must have an email address."}
            
        auth_mode = branding.get("authentication_mode") or ""
        req_approval = branding.get("require_admin_approval", 0) or branding.get("is_admin_approval_required", 0)
        approval_status = "Pending" if (req_approval or "Approval" in auth_mode) else "Approved"

        user = frappe.db.get_value("User", {"email": email}, "name")
        if not user:
            # Create User
            user_doc = frappe.new_doc("User")
            user_doc.email = email
            user_doc.first_name = full_name
            user_doc.send_welcome_email = 0
            user_doc.insert(ignore_permissions=True)
            user_doc.add_roles("Rental Customer")
            user = user_doc.name
            
        # Check existing customer
        # Priority: Google Email -> Customer Email -> User Email
        customer_name = frappe.db.get_value("Customer", {"custom_email": email}, "name")
        if not customer_name:
            customer_name = frappe.db.get_value("Customer", {"customer_name": full_name}, "name") # Fallback, risky if common name, but mostly relying on email
            
        if not customer_name:
            cust = frappe.new_doc("Customer")
            cust.customer_name = full_name
            cust.customer_type = "Individual"
            cust.territory = "All Territories"
            cust.custom_customer_verified = 1
            cust.custom_email = email
            cust.portal_approval_status = approval_status
            cust.insert(ignore_permissions=True)
            
            # Notification Trigger
            try:
                from rental_platform.web_api.notification import create_admin_notification
                create_admin_notification(
                    title="New Customer Registered",
                    message=f"{full_name} registered via Google successfully.",
                    notification_type="Customer Registration",
                    priority="Medium",
                )
            except Exception:
                pass
                
        # Login
        from frappe.auth import LoginManager
        login_manager = LoginManager()
        login_manager.login_as(user)
        
        return {"success": True, "message": "Logged in successfully."}
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Google Login Error")
        return {"success": False, "message": "An error occurred during Google Login."}


