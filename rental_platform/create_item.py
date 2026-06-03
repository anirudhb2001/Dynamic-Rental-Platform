import frappe

def execute():
    try:
        # Check if Item Group Services exists
        if not frappe.db.exists('Item Group', 'Services'):
            ig = frappe.new_doc('Item Group')
            ig.item_group_name = 'Services'
            ig.parent_item_group = 'All Item Groups'
            ig.is_group = 0
            ig.insert(ignore_permissions=True)
            print("Created Item Group Services")
            
        # Create Item Rental Services
        if not frappe.db.exists('Item', 'Rental Services'):
            item = frappe.new_doc('Item')
            item.item_code = 'Rental Services'
            item.item_name = 'Rental Services'
            item.item_group = 'Services'
            item.stock_uom = 'Nos'
            item.is_stock_item = 0
            item.include_item_in_manufacturing = 0
            item.has_variants = 0
            item.insert(ignore_permissions=True)
            print("Created Item Rental Services")
        else:
            print("Item Rental Services already exists")
    except Exception as e:
        print("Exception:", e)
