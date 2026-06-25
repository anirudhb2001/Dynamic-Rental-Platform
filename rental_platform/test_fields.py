import frappe
def run():
    print([f.fieldname for f in frappe.get_meta('Branding Settings').fields])
    print([f.fieldname for f in frappe.get_meta('Item').fields if f.fieldname.startswith('custom_')])
