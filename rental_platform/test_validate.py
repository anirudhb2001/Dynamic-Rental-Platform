import frappe

def run():
    doc = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": "Test Customer",
        "items": [{
            "item_code": "Test Item",
            "item_name": "Rental Services",
            "qty": 1,
            "rate": 100
        }]
    })
    
    try:
        # Instead of calling run_method which requires a real doc, we just simulate the validate hooks
        hooks = frappe.get_hooks("doc_events", {}).get("Sales Invoice", {})
        if "validate" in hooks:
            validations = hooks["validate"]
            if isinstance(validations, str):
                validations = [validations]
            for validation in validations:
                print(f"Executing hook: {validation}")
                frappe.get_attr(validation)(doc)
                print(f"Successfully executed: {validation}")
        print("Validation succeeded")
    except Exception as e:
        print(f"Validation failed: {e}")
        
    logs = frappe.get_all("Error Log", fields=["method", "error"], order_by="creation desc", limit=5)
    for log in logs:
        if "RENTAL" in log.method:
            print(f"Log: {log.method} - {log.error}")

