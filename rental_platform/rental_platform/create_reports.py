import frappe
from frappe.custom.doctype.property_setter.property_setter import make_property_setter

def create_reports():
    reports = [
        {
            "report_name": "Upcoming Events",
            "ref_doctype": "Booking Entry",
            "report_type": "Report Builder",
            "is_standard": "Yes",
            "module": "Rental Platform"
        },
        {
            "report_name": "Venue Utilization",
            "ref_doctype": "Booking Entry",
            "report_type": "Report Builder",
            "is_standard": "Yes",
            "module": "Rental Platform"
        },
        {
            "report_name": "Financial Summary by Venue",
            "ref_doctype": "Sales Invoice",
            "report_type": "Report Builder",
            "is_standard": "Yes",
            "module": "Rental Platform"
        }
    ]

    for r in reports:
        if not frappe.db.exists("Report", r["report_name"]):
            doc = frappe.new_doc("Report")
            doc.update(r)
            doc.insert(ignore_permissions=True)
            print(f"Created Report: {r['report_name']}")

def configure_calendar_view():
    # Attempting to make Booking Entry show up as Calendar view in Frappe
    # Currently frappe lets user create calendar views, we can also set sort_field to event_date
    make_property_setter("Booking Entry", None, "sort_field", "event_date", "Data")
    print("Configured calendar sorting for Booking Entry")

def execute():
    create_reports()
    configure_calendar_view()
    frappe.db.commit()

