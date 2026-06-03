import frappe
from frappe.utils import nowdate
from frappe import _

def update_booking_entry_status(doc, method):
    try:
        # Check if 'Rental Services' is in the items
        rental_services_present = any(item.item_code == 'Rental Services' for item in doc.items)
        
        if rental_services_present and doc.custom_booking_entry:
            frappe.db.set_value(
                "Booking Entry",
                doc.custom_booking_entry,
                "status",
                "Rented"
            )
            frappe.db.commit()
            frappe.msgprint(
                msg=f'Booking Entry {doc.custom_booking_entry} status updated to "Rented".',
                title="Status Updated",
                indicator="green"
            )
    except Exception as e:
        frappe.throw(f"Failed to update Booking Entry status: {str(e)}")


def create_stock_entry_on_sales_invoice_submit(doc, method):
    try:

        if not doc.custom_rental_items or doc.custom_is_extended:  
            return
        if not frappe.db.exists('Warehouse',{'custom_is_customer_warehouse':1}):
            frappe.throw(
                _("Customer Warehouse must be set before proceeding."),
                title=_("Validation Error"),
                exc=frappe.ValidationError
            )
        else :
            customer_warehouse = frappe.db.get_value('Warehouse',{'custom_is_customer_warehouse':1},['name'])

        rental_item_wrh = frappe.db.get_all('Sales Invoice Item',
                        {'parent':doc.name,'item_code':'Rental Services'},['warehouse'],pluck='warehouse')
        
        
        if rental_item_wrh :
            item_warehouse = rental_item_wrh[0]
            stock_entry = frappe.new_doc('Stock Entry')
            stock_entry.stock_entry_type = 'Material Transfer'
            stock_entry.posting_date = nowdate()
            stock_entry.from_warehouse = item_warehouse
            stock_entry.to_warehouse = customer_warehouse
            stock_entry.custom_booking_entry = doc.custom_booking_entry
            
            for rental_item in doc.custom_rental_items:
                item=frappe.get_doc('Item',{'name':rental_item.get("rental_item_id")})
                if item.is_stock_item:
                    stock_entry.append('items', {
                        'item_code': rental_item.get("rental_item_id"),  
                        'qty': rental_item.get("stock_quantity"), 
                        'uom': 'Nos',  
                        'basic_rate': rental_item.get("price"),  
                        'amount': rental_item.get("amount") ,
                        's_warehouse': item_warehouse,
                        't_warehouse': customer_warehouse,
                        'allow_zero_valuation_rate': 1,
                    })

            stock_entry.insert()
            stock_entry.submit()
            frappe.db.commit()
            return {
                "message": {
                    "success": "Stock Entry created successfully."
                }
            }
    except frappe.DoesNotExistError as e:
        return {
            "message": {
                "error": f"Document not found: {str(e)}"
            }
        }
    except Exception as e:
        return {
            "message": {
                "error": f"An error occurred: {str(e)}"
            }
        }


