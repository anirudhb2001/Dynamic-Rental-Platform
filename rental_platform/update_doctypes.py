import frappe

def create_report():
    if not frappe.db.exists("Report", "Customer Approvals"):
        report = frappe.get_doc({
            "doctype": "Report",
            "report_name": "Customer Approvals",
            "ref_doctype": "Customer",
            "report_type": "Script Report",
            "is_standard": "Yes",
            "module": "Rental Platform"
        })
        report.insert(ignore_permissions=True)
    frappe.db.commit()

