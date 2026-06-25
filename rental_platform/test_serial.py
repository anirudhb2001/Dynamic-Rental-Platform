import frappe
def run():
    print([f.fieldname for f in frappe.get_meta('Serial No').fields])
