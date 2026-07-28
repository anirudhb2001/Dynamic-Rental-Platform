import frappe
def execute():
    be = frappe.get_doc("Booking Entry", "BE00003")
    so = frappe.get_doc("Sales Order", be.sales_order)
    company = frappe.get_doc("Company", so.company) if so.company else None
    if company:
        print("Company Abbr:", company.abbr)
        print("Default Inventory Warehouse:", company.get('default_inventory_warehouse') or company.get('default_warehouse') or company.get('default_store'))
