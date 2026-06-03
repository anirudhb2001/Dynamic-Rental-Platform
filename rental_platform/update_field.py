import frappe

def execute():
    # Update Booking Details field
    frappe.db.set_value('DocField', {'parent': 'Booking Details', 'fieldname': 'pricelist_name'}, 'fieldtype', 'Data')
    frappe.db.set_value('DocField', {'parent': 'Booking Details', 'fieldname': 'pricelist_name'}, 'options', '')
    
    # Also update Booking details Table field just in case
    if frappe.db.exists('DocField', {'parent': 'Booking details Table', 'fieldname': 'pricelist_name'}):
        frappe.db.set_value('DocField', {'parent': 'Booking details Table', 'fieldname': 'pricelist_name'}, 'fieldtype', 'Data')
        frappe.db.set_value('DocField', {'parent': 'Booking details Table', 'fieldname': 'pricelist_name'}, 'options', '')
        
    frappe.clear_cache(doctype='Booking Details')
    frappe.clear_cache(doctype='Booking details Table')
    frappe.db.commit()
    print("Successfully updated pricelist_name field to Data.")
