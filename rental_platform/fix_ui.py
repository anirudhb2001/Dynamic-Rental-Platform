import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def update_sales_order_ui():
    custom_fields = {
        "Sales Order": [
            {
                "fieldname": "custom_rental_information",
                "label": "Rental Information",
                "fieldtype": "Section Break",
                "insert_after": "reserve_stock",
                "module": "Rental Platform"
            },
            {
                "fieldname": "custom_pickup_from_date",
                "label": "Pickup From date",
                "fieldtype": "Datetime",
                "insert_after": "custom_rental_information",
                "module": "Rental Platform"
            },
            {
                "fieldname": "custom_rental_from_date",
                "label": "Rental From date",
                "fieldtype": "Datetime",
                "insert_after": "custom_pickup_from_date",
                "module": "Rental Platform"
            },
            {
                "fieldname": "custom_rental_to_date",
                "label": "Rental To date",
                "fieldtype": "Datetime",
                "insert_after": "custom_rental_from_date",
                "module": "Rental Platform"
            },
            {
                "fieldname": "custom_returned_early",
                "label": "Returned Early",
                "fieldtype": "Check",
                "insert_after": "custom_rental_to_date",
                "module": "Rental Platform"
            },
            {
                "fieldname": "custom_actual_to_date",
                "label": "Actual To Date",
                "fieldtype": "Datetime",
                "insert_after": "custom_returned_early",
                "module": "Rental Platform"
            },
            {
                "fieldname": "custom_booking_entry",
                "label": "Booking Entry",
                "fieldtype": "Link",
                "options": "Booking Entry",
                "insert_after": "custom_actual_to_date",
                "module": "Rental Platform"
            },
            {
                "fieldname": "custom_rental_items",
                "label": "Rental Items",
                "fieldtype": "Table",
                "options": "Booking details Table",
                "insert_after": "custom_booking_entry",
                "module": "Rental Platform"
            }
        ]
    }
    
    # create_custom_fields handles both creation and updating of existing fields
    create_custom_fields(custom_fields, ignore_validate=True)
    
    # We also need to fix any stray fields that might have weird insert_afters or were previously placed somewhere else.
    # We explicitly update the db to be absolutely sure the order is correct.
    for idx, field in enumerate(custom_fields["Sales Order"]):
        frappe.db.set_value("Custom Field", {"dt": "Sales Order", "fieldname": field["fieldname"]}, "insert_after", field.get("insert_after"))
        
    frappe.db.commit()
    print("Sales Order UI alignment complete.")

if __name__ == "__main__":
    frappe.init(site="rentcam.erp")
    frappe.connect()
    update_sales_order_ui()
    frappe.destroy()
