import frappe
from frappe import _


@frappe.whitelist()
def warehouse_validate(doc, method=None):
    if doc.custom_is_customer_warehouse:
        if frappe.db.exists('Warehouse', {'custom_is_customer_warehouse': 1}):
            frappe.throw('Customer Warehouse Already Exists')

def sales_invoice_validate(doc, method=None):
    has_rental_services = any(
    item.item_name == "Rental Services"
    for item in (doc.items or [])
)

    if has_rental_services:
        return

    if not frappe.db.exists('Warehouse', {'custom_is_customer_warehouse': 1}):
        frappe.throw('Customer Warehouse must be set before proceeding')
        
@frappe.whitelist(allow_guest=True)
def item_qty_in_warehouse(item_code=None, warehouse=None):
    data = validate_item_warehouse(item_code, warehouse)
    if not data:
        frappe.local.response['status_code'] = 500
        frappe.local.response['error'] = "No data found"
    else:
        frappe.local.response['status_code'] = 200
        frappe.local.response['data'] = data
 
def validate_item_warehouse(item_code=None, warehouse=None):
    try:
        # Sample data
        if item_code or warehouse:
            filters = {}
            if item_code:
                filters["item_code"] = item_code
            if warehouse:
                filters["warehouse"] = warehouse
            filters["actual_qty"] = [">", 0]
            results = frappe.get_all("Bin", filters=filters, fields=["item_code", "warehouse", "actual_qty"])
        else:
            results = frappe.get_all("Bin",filters={"actual_qty":[">",0]}, fields=["item_code", "warehouse", "actual_qty"])

 
        combined_results = {}

        # Process each result
        for result in results:
            item_code = result["item_code"]
            warehouse_info = {"warehouse": result["warehouse"], "actual_qty": result["actual_qty"]}

            if item_code not in combined_results:
                combined_results[item_code] = {
                    "item_code": item_code,
                    "qty_in_warehouse": []
                }

            combined_results[item_code]["qty_in_warehouse"].append(warehouse_info)

        # Convert combined results to a list
        combined_results_list = list(combined_results.values())

        return combined_results_list


    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Validate Item Warehouse Error")
        return {"error": f"An error occurred: {str(e)}"}


def validate_customer_verification(doc, method=None):
    if not doc.custom_customer_verified:
        frappe.throw("Customer must be verified before proceeding")

def validate_portal_approval_status(doc, method=None):
    if not doc.get("customer"):
        return
        
    # Do not block if user is system manager
    if "System Manager" in frappe.get_roles(frappe.session.user):
        return
        
    approval_status = frappe.db.get_value("Customer", doc.customer, "portal_approval_status")
    
    if approval_status in ["Pending", "Rejected"]:
        frappe.throw(_("Action blocked: Your account status is {0}. Please wait for admin approval.").format(approval_status))



@frappe.whitelist()
def get_user_default_warehouse():
    try:
        user = frappe.session.user

        # Customer logout ചെയ്താൽ user = Guest
        if not user or user == "Guest":
            return {"warehouse_name": None}

        default_warehouse = frappe.db.get_value(
            "User Permission",
            {
                "user": user,
                "allow": "Warehouse",
                "is_default": 1
            },
            "for_value"
        )

        if default_warehouse:
            return {"warehouse_name": default_warehouse}

        permitted_warehouses = frappe.get_all(
            "User Permission",
            filters={
                "user": user,
                "allow": "Warehouse"
            },
            pluck="for_value"
        )

        if permitted_warehouses:
            return [
                {"warehouse_name": warehouse}
                for warehouse in permitted_warehouses
            ]

        return {"warehouse_name": None}

    except Exception as e:
        frappe.log_error(
            frappe.get_traceback(),
            "Get User Warehouse Error"
        )
        return {
            "warehouse_name": None,
            "error": str(e)
        }