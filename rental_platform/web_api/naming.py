import frappe
from datetime import datetime

def sales_invoice_naming(doc, method):

    # ✅ Use posting_date instead of system date
    posting_date = doc.posting_date

    # convert to datetime
    today = datetime.strptime(str(posting_date), "%Y-%m-%d")

    # Financial Year (April–March)
    if today.month >= 4:
        year = today.year
        next_year = year + 1
    else:
        year = today.year - 1
        next_year = today.year

    yy1 = str(year)[-2:]
    yy2 = str(next_year)[-2:]

    series = f"RCK/{yy1}-{yy2}/"

    # count existing
    count = frappe.db.count("Sales Invoice", {
        "name": ["like", f"{series}%"]
    }) + 1

    doc.name = f"{series}{count}"