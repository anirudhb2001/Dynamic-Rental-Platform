import frappe
def execute():
    res = frappe.get_all("Rental Booking", filters={"docstatus": 1, "booking_status": ["in", ["Reserved", "Picked Up", "On Ride"]]}, fields=["name", "customer", "asset", "booking_status"])
    print("Found {} bookings".format(len(res)))
    for r in res:
        print(r)
    return res
