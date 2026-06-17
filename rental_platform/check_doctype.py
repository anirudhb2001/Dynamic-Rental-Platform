import frappe
def run():
    print("Rental Inspection exists:", frappe.db.exists("DocType", "Rental Inspection"))
