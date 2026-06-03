import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    create_custom_field("Rental Asset", dict(
        fieldname="custom_stock_qty",
        label="Stock Quantity",
        fieldtype="Int",
        insert_after="rental_rate",
        default="1",
        description="Available quantity of this asset type."
    ))
    frappe.db.commit()
    print("Custom field custom_stock_qty added to Rental Asset.")
