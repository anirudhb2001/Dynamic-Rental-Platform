import frappe

def run():
    print(frappe.db.get_value('Custom Field', {'dt': 'Sales Order', 'fieldname': 'custom_rental_items'}, 'options'))
    print(frappe.db.get_value('Custom Field', {'dt': 'Quotation', 'fieldname': 'custom_rental_items'}, 'options'))
