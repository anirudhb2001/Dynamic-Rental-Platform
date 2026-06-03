import frappe

def execute():
    try:
        logs = frappe.db.get_list('Error Log', fields=['method', 'error'], order_by='creation desc', limit=1)
        for log in logs:
            print("Method:", log.method)
            print("Error:\n", log.error)
    except Exception as e:
        print("Exception:", e)
