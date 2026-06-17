import frappe
import random
from frappe.utils import now_datetime, get_datetime


def _get_auth_policy():
    """Centralized policy engine — reads authentication config from Branding Settings."""
    branding = frappe.db.get_value(
        "Branding Settings", "Branding Settings",
        ["authentication_mode", "require_admin_approval", "enable_google_login", "google_client_id"],
        as_dict=True
    ) or {}
    auth_mode = branding.get("authentication_mode") or "OTP Login"
    is_admin_approval_required = bool(branding.get("require_admin_approval", 0))
    
    # Auto-enable Google Login if the mode requires it, even if the checkbox was missed
    enable_google_login = branding.get("enable_google_login", 0)
    if "Google" in auth_mode:
        enable_google_login = 1
        
    return {
        "authentication_mode": auth_mode,
        "is_admin_approval_required": is_admin_approval_required,
        "enable_google_login": enable_google_login,
        "google_client_id": branding.get("google_client_id", ""),
    }


def _determine_approval_status(policy):
    """Return the portal_approval_status for a new customer based on the current policy."""
    auth_mode = policy.get("authentication_mode")
    is_admin_approval_required = policy.get("is_admin_approval_required")
    
    if auth_mode == "OTP Login":
        return "Approved"
    elif auth_mode == "OTP + Approval":
        return "Pending"
    elif auth_mode == "Google Login":
        return "Approved"
    elif auth_mode == "Google + Approval":
        return "Pending"
    elif auth_mode == "Email + Password":
        return "Pending" if is_admin_approval_required else "Approved"
        
    return "Approved"

def _enforce_approval_policy(customer_name, policy, current_status):
    """Retroactively upgrade a customer to Approved if the current auth mode allows instant access."""
    auth_mode = policy.get("authentication_mode")
    is_admin_approval_required = policy.get("is_admin_approval_required")

    expected_status = current_status
    if auth_mode == "OTP Login":
        expected_status = "Approved"
    elif auth_mode == "Google Login":
        expected_status = "Approved"
    elif auth_mode == "Email + Password":
        if not is_admin_approval_required:
            expected_status = "Approved"

    if expected_status == "Approved" and current_status != "Approved":
        frappe.db.set_value("Customer", customer_name, "portal_approval_status", "Approved")
        return "Approved"
        
    return current_status


def _get_or_create_user(email, full_name, mobile_no=None, send_welcome=False):
    """Get existing user by email or mobile, or create a new one. Returns (user_name, is_new)."""
    user_name = None

    if email:
        user_name = frappe.db.get_value("User", {"email": email}, "name")
    if not user_name and mobile_no:
        user_name = frappe.db.get_value("User", {"mobile_no": mobile_no}, "name")

    if user_name:
        return user_name, False

    if not frappe.db.exists("Role", "Rental Customer"):
        frappe.throw("Configuration Error: 'Rental Customer' role is missing in the system.")

    user = frappe.new_doc("User")
    user.email = email
    user.first_name = full_name or "Customer"
    if mobile_no:
        user.mobile_no = mobile_no
    user.send_welcome_email = 1 if send_welcome else 0
    user.enabled = 1
    user.insert(ignore_permissions=True)
    user.add_roles("Rental Customer")
    return user.name, True


def _get_or_create_customer(full_name, mobile_no=None, email=None, policy=None, registration_method="OTP"):
    """Get existing customer or create a new one. Returns (customer_name, is_new)."""
    customer_name = None

    # Priority: mobile_no → custom_email → customer_name (risky fallback, only if email given)
    if mobile_no:
        customer_name = frappe.db.get_value("Customer", {"mobile_no": mobile_no}, "name")
    if not customer_name and email:
        customer_name = frappe.db.get_value("Customer", {"custom_email": email}, "name")

    if customer_name:
        return customer_name, False

    approval_status = _determine_approval_status(policy) if policy else "Approved"

    cust = frappe.new_doc("Customer")
    cust.customer_name = full_name or "Customer"
    cust.customer_type = "Individual"

    if mobile_no:
        cust.mobile_no = mobile_no
        cust.custom_alternate_number = mobile_no

    if email:
        cust.custom_email = email

    if registration_method:
        cust.custom_registration_method = registration_method

    cust.territory = "All Territories"
    # Set verification flags to 1 so that Google/Email users don't get trapped in OTP screens later
    cust.custom_customer_verified = 1
    cust.custom_verify_alternate_otp = 1
    cust.portal_approval_status = approval_status

    cust.insert(ignore_permissions=True)
    # Notification
    if registration_method:
        _notify_admin_registration(full_name or "Customer", registration_method, approval_status, cust.name)

    return cust.name, True


def _notify_admin_registration(full_name, method="OTP", status="Approved", customer_id=None):
    """Send admin notification for new customer registration."""
    if status != "Pending":
        return
        
    try:
        from rental_platform.web_api.notification import create_admin_notification
        create_admin_notification(
            title="New Customer Awaiting Approval",
            message=f"{full_name} registered via {method} and is awaiting your approval.",
            notification_type="Customer Registration",
            reference_doctype="Customer",
            reference_name=customer_id,
            priority="High"
        )
        
        # ERP Notification Log for Desk Users
        admin_users = frappe.get_all(
            "Has Role",
            filters={"role": "System Manager", "parenttype": "User"},
            pluck="parent",
        )
        for user in set(admin_users):
            if user == "Guest" or not frappe.db.get_value("User", user, "enabled"):
                continue
                
            doc = frappe.new_doc("Notification Log")
            doc.subject = "🔔 New Customer Registration Awaiting Approval"
            doc.for_user = user
            doc.type = "Alert"
            doc.email_content = f"Name: {full_name}<br>Method: {method}<br>Awaiting Approval"
            # Link to the Customer Approvals Report
            doc.link = "query-report/Customer Approvals"
            doc.insert(ignore_permissions=True)
            
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Customer Registration Notification Error")


def _login_user(user_name):
    """Create a session for the given user."""
    from frappe.auth import LoginManager
    login_manager = LoginManager()
    login_manager.login_as(user_name)


# ──────────────────────────────────────────────
# OTP LOGIN ENDPOINTS
# ──────────────────────────────────────────────

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

    policy = _get_auth_policy()

    # Get or Create User
    user_email = f"{mobile_no}@customer.dynamicrental.local"
    user_name, _ = _get_or_create_user(user_email, full_name, mobile_no=mobile_no)

    # Force enable user (Rule 4)
    frappe.db.set_value("User", user_name, "enabled", 1)

    # Get or Create Customer
    customer_name, is_new_customer = _get_or_create_customer(full_name, mobile_no=mobile_no, policy=policy)

    # Read and enforce approval status
    approval_status = frappe.db.get_value("Customer", customer_name, "portal_approval_status") or "Approved"
    approval_status = _enforce_approval_policy(customer_name, policy, approval_status)
    
    auth_mode = policy.get("authentication_mode")

    if auth_mode == "OTP + Approval" and approval_status != "Approved":
        return {
            "success": True,
            "message": "Your account is awaiting administrator approval.",
            "is_new_user": is_new_customer,
            "portal_approval_status": approval_status,
        }

    # Login
    _login_user(user_name)

    return {
        "success": True,
        "message": "Logged in successfully.",
        "is_new_user": is_new_customer,
        "portal_approval_status": approval_status,
    }


# ──────────────────────────────────────────────
# CUSTOMER CONTEXT
# ──────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def get_customer_context():
    user = frappe.session.user
    if user == "Guest":
        return {"success": False, "message": "Not logged in."}

    user_doc = frappe.get_doc("User", user)
    mobile_no = user_doc.mobile_no
    email = user_doc.email

    # Try matching customer by mobile first, then by email
    customer_name = None
    if mobile_no:
        customer_name = frappe.db.get_value("Customer", {"mobile_no": mobile_no}, "name")
    if not customer_name and email:
        customer_name = frappe.db.get_value("Customer", {"custom_email": email}, "name")

    if not customer_name:
        return {"success": False, "message": "No customer profile found for this user."}

    customer_details = frappe.get_doc("Customer", customer_name).as_dict()

    return {
        "success": True,
        "user": user_doc.as_dict(),
        "customer_id": customer_name,
        "customer": customer_details
    }


# ──────────────────────────────────────────────
# APPROVAL MANAGEMENT
# ──────────────────────────────────────────────

@frappe.whitelist()
def update_approval_status(customer_id, status):
    if "System Manager" not in frappe.get_roles(frappe.session.user):
        return {"success": False, "message": "Not authorized."}

    if status not in ["Approved", "Rejected"]:
        return {"success": False, "message": "Invalid status."}

    frappe.db.set_value("Customer", customer_id, "portal_approval_status", status)

    # Trigger notifications
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


# ──────────────────────────────────────────────
# EMAIL + PASSWORD ENDPOINTS
# ──────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def register_with_email(full_name, email, password, mobile_no=None):
    if not all([full_name, email, password]):
        return {"success": False, "message": "Name, Email, and Password are required."}

    if frappe.db.exists("User", {"email": email}):
        return {"success": False, "message": "An account with this email already exists."}

    if mobile_no and frappe.db.exists("Customer", {"mobile_no": mobile_no}):
        return {"success": False, "message": "A customer with this mobile number already exists."}

    policy = _get_auth_policy()
    approval_status = _determine_approval_status(policy)

    try:
        # Create Customer
        cust = frappe.new_doc("Customer")
        cust.customer_name = full_name
        cust.customer_type = "Individual"
        if mobile_no:
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
        if mobile_no:
            user.mobile_no = mobile_no
        user.new_password = password
        user.send_welcome_email = 0
        user.enabled = 1  # Enable immediately

        # Use reset_password_key for email verification
        token = frappe.generate_hash(length=32)
        user.reset_password_key = token

        user.insert(ignore_permissions=True)
        user.add_roles("Rental Customer")

        # Send Verification Email
        verify_link = frappe.utils.get_url(f"/api/method/rental_platform.web_api.customer_portal_auth.verify_email?token={token}")

        # frappe.sendmail(
        #     recipients=[email],
        #     subject="Verify your email address",
        #     message=f"<p>Hi {full_name},</p><p>Please verify your email address by clicking the link below:</p><p><a href='{verify_link}'>{verify_link}</a></p>"
        # )

        # _notify_admin_registration(full_name, "Email")

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

    # Verify approval status
    policy = _get_auth_policy()
    customer_name = frappe.db.get_value("Customer", {"custom_email": email}, "name")
    if customer_name:
        approval_status = frappe.db.get_value("Customer", customer_name, "portal_approval_status") or "Approved"
        approval_status = _enforce_approval_policy(customer_name, policy, approval_status)
        auth_mode = policy.get("authentication_mode")

        if auth_mode == "Email + Password" and approval_status != "Approved":
            return {
                "success": False,
                "message": "Your account is awaiting administrator approval."
            }

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
        return {"success": True, "message": "If this email is registered, you will receive a password reset link."}

    try:
        from frappe.core.doctype.user.user import reset_password
        reset_password(user)
        return {"success": True, "message": "If this email is registered, you will receive a password reset link."}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Forgot Password Error")
        return {"success": False, "message": "Failed to send reset link."}


# ──────────────────────────────────────────────
# GOOGLE LOGIN ENDPOINT
# ──────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def google_login(id_token):
    """
    Complete Google OAuth 2.0 authentication.
    Verifies the Google ID token, creates or matches User/Customer,
    and logs the user in.
    """
    if not id_token:
        return {"success": False, "message": "Google token is required."}

    policy = _get_auth_policy()

    if not policy.get("enable_google_login") or not policy.get("google_client_id"):
        return {"success": False, "message": "Google Login is not enabled or not configured."}

    try:
        import requests as http_requests
        # Verify token with Google's tokeninfo endpoint
        response = http_requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}",
            timeout=10
        )
        if response.status_code != 200:
            return {"success": False, "message": "Invalid Google token."}

        user_info = response.json()

        # Verify audience matches our client ID
        if user_info.get("aud") != policy.get("google_client_id"):
            return {"success": False, "message": "Invalid token audience."}

        email = user_info.get("email")
        if not email:
            return {"success": False, "message": "Google account must have an email address."}

        full_name = user_info.get("name") or "Google User"
        picture = user_info.get("picture") or ""
        
        # Get or Create User
        user_name, is_new_user = _get_or_create_user(email, full_name)

        # Force enable the user (Rule 1 & Rule 4: never use user.enabled = 0 for approval)
        frappe.db.set_value("User", user_name, "enabled", 1)

        # Update user image if available and user is new
        if is_new_user and picture:
            try:
                frappe.db.set_value("User", user_name, "user_image", picture)
            except Exception:
                pass

        # Get or Create Customer
        customer_name, is_new_customer = _get_or_create_customer(
            full_name, email=email, policy=policy, registration_method="Google" if is_new_user else None
        )

        approval_status = frappe.db.get_value("Customer", customer_name, "portal_approval_status") or "Approved"
        approval_status = _enforce_approval_policy(customer_name, policy, approval_status)
        auth_mode = policy.get("authentication_mode")

        # Apply Rule 2: If "Google + Approval" and pending, do not login
        if auth_mode == "Google + Approval" and approval_status != "Approved":
            return {
                "success": True,
                "message": "Your account is awaiting administrator approval.",
                "is_new_user": is_new_customer,
                "portal_approval_status": approval_status,
            }

        # Login
        _login_user(user_name)

        return {
            "success": True,
            "message": "Logged in successfully.",
            "is_new_user": is_new_customer,
            "portal_approval_status": approval_status,
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Google Login Error")
        return {"success": False, "message": "An error occurred during Google Login."}
