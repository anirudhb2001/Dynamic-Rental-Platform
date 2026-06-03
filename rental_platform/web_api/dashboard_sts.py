import frappe
@frappe.whitelist()
def get_dashboard_stats():

    return {
        "available":
        frappe.db.count(
            "Rental Asset",
            {"status":"Available"}
        ),

        "reserved":
        frappe.db.count(
            "Rental Asset",
            {"status":"Reserved"}
        ),

        "out_on_rent":
        frappe.db.count(
            "Rental Asset",
            {"status":"Out on Rent"}
        ),

        "maintenance":
        frappe.db.count(
            "Rental Asset",
            {"status":"Maintenance"}
        )
    }