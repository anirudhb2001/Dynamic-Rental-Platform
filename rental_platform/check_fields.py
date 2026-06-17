import frappe
def run():
    meta = frappe.get_meta("Customer")
    fields = [f.fieldname for f in meta.fields if "method" in f.fieldname or "auth" in f.fieldname or "reg" in f.fieldname]
    print("Found fields:", fields)
