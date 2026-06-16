import frappe
def run_test():
    user = frappe.new_doc("User")
    user.email = "testenabled@example.com"
    user.first_name = "Test Enabled"
    user.send_welcome_email = 0
    try:
        user.insert(ignore_permissions=True)
        print("User enabled:", user.enabled)
    except Exception as e:
        print("Error:", e)
