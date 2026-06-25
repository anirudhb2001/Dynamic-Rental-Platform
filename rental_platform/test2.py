import frappe

def run():
    logs = frappe.get_all("Error Log", fields=["method", "error"], limit=3, order_by="creation desc")
    with open("error_logs.txt", "w") as f:
        for log in logs:
            f.write(f"[{log.method}]: {log.error}\n")
    print("DONE")
