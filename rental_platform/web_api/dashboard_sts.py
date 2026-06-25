import frappe
@frappe.whitelist()
def get_dashboard_stats():

    return {
        "available":
        frappe.db.count("Serial No", {"status": "Active"}) +
        frappe.db.count(
            "Rental Asset",
            {"asset_status":"Available"}
        ),

        "reserved":
        frappe.db.count("Rental Booking", {"booking_status": "Reserved"}),

        "out_on_rent":
        frappe.db.count("Rental Booking", {"booking_status": "Picked Up"}),

        "maintenance":
        frappe.db.count(
            "Rental Asset",
            {"asset_status":"Maintenance"}
        )
    }