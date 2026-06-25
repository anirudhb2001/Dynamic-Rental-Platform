import frappe

def run():
    print([(f.fieldname, f.fieldtype) for f in frappe.get_meta('Booking Details SAL').fields])
