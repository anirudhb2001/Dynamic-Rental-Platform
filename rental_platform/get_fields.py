import frappe
def main():
    meta = frappe.get_meta("Rental Asset")
    for f in meta.fields:
        print(f.fieldname, f.fieldtype)
