import frappe

def execute():
    try:
        assets = frappe.db.get_list('Rental Asset', fields=['name', 'asset_name'])
        print("Real Assets:", assets)
    except Exception as e:
        print("Exception:", e)
