import frappe
def run():
    sn = frappe.get_all("Serial No", fields=["name", "status", "maintenance_status"])
    print(sn)
