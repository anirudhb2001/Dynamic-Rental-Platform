import frappe

def execute():
    try:
        items = frappe.db.get_list('Item', fields=['name', 'item_name'])
        print(items)
    except Exception as e:
        print("Exception:", e)
