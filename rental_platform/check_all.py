import frappe
def execute():
    res = frappe.get_all("Rental Booking", fields=["name", "customer", "asset", "booking_status", "docstatus"])
    print("Found {} total bookings".format(len(res)))
    for r in res:
        print(r)
    return res
