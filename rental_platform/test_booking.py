import frappe
def run():
    print("Booking Details:", [f.fieldname for f in frappe.get_meta('Booking Details').fields])
    print("Booking Details Table:", [f.fieldname for f in frappe.get_meta('Booking Details Table').fields])
    print("Booking Details SAL:", [f.fieldname for f in frappe.get_meta('Booking Details SAL').fields])
