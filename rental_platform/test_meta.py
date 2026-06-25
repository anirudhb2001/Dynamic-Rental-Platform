import frappe

def run():
    print(frappe.db.get_value('Custom Field', {'dt': 'Sales Order', 'fieldname': 'custom_rental_items'}, ['insert_after', 'hidden'], as_dict=True))
    print(frappe.db.get_value('Custom Field', {'dt': 'Sales Invoice', 'fieldname': 'custom_rental_items'}, ['insert_after', 'hidden'], as_dict=True))
