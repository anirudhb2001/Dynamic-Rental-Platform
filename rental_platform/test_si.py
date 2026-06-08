import frappe

def run():
    doc = frappe.get_last_doc("Sales Invoice")
    if doc:
        print(f"Found Sales Invoice: {doc.name}")
        try:
            doc.run_method('validate')
            print("Validation successful")
        except Exception as e:
            print(f"Validation Error: {e}")
            
    else:
        print("No Sales Invoice found")
