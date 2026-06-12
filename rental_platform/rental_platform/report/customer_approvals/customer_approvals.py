import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {
            "fieldname": "customer",
            "label": _("Customer ID"),
            "fieldtype": "Link",
            "options": "Customer",
            "width": 120
        },
        {
            "fieldname": "customer_name",
            "label": _("Customer Name"),
            "fieldtype": "Data",
            "width": 150
        },
        {
            "fieldname": "email",
            "label": _("Email"),
            "fieldtype": "Data",
            "width": 150
        },
        {
            "fieldname": "mobile_no",
            "label": _("Mobile Number"),
            "fieldtype": "Data",
            "width": 120
        },
        {
            "fieldname": "creation",
            "label": _("Registration Date"),
            "fieldtype": "Datetime",
            "width": 150
        },
        {
            "fieldname": "portal_approval_status",
            "label": _("Approval Status"),
            "fieldtype": "Data",
            "width": 120
        },
        {
            "fieldname": "actions",
            "label": _("Actions"),
            "fieldtype": "Data",
            "width": 200
        }
    ]

def get_data(filters):
    conditions = []
    if filters and filters.get("status"):
        conditions.append(f"portal_approval_status = '{filters.get('status')}'")
        
    where_clause = " AND ".join(conditions) if conditions else "1=1"
        
    customers = frappe.db.sql(f"""
        SELECT
            name as customer,
            customer_name,
            custom_email as email,
            mobile_no,
            creation,
            portal_approval_status
        FROM `tabCustomer`
        WHERE {where_clause}
        ORDER BY creation DESC
    """, as_dict=1)
    
    for c in customers:
        if not c.portal_approval_status:
            c.portal_approval_status = "Approved"
        # We inject buttons in JS using a formatter, so we just return the row
        c.actions = ""
        
    return customers
