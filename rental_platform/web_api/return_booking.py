import frappe
from frappe import _
from frappe.utils import nowdate
from frappe.model.mapper import get_mapped_doc

@frappe.whitelist(allow_guest=True)
def rental_return_booking(
    booking_entry_id, additional_charges=None, item_warehouses=None, 
    black_list=None, yellow_list=None, remarks=None, item_remarks=None):
    try:
        if not frappe.db.exists("Booking Entry", booking_entry_id):
            return {"error": f"Booking Entry '{booking_entry_id}' does not exist."}
                                            
        booking_entry = frappe.get_doc("Booking Entry", booking_entry_id)
        if not booking_entry.sales_order:
            return {"error": f"No linked Sales Order found for Booking Entry '{booking_entry_id}'."}
        
        # If no item_warehouses, return only additional charges
        if additional_charges and not item_warehouses:
            additional_charge_invoice(booking_entry_id, additional_charges)
            return {"message": "Additional charges added successfully."}

        customer = update_customer_status(booking_entry_id, black_list, yellow_list, remarks)
        stock_response = create_stock_entry_on_return(booking_entry_id, item_warehouses)
        
        remark_responses = []
        if item_remarks:
            for item in item_remarks:
                if "item_name" in item and "remark" in item:
                    remark_responses.append(add_remark_to_item(item["item_name"], item["remark"]))
        
        # If no additional charges, return only stock and customer updates
        if not additional_charges:
            return {
                "stock_response": stock_response, 
                "customer": customer,
                "remark_responses": remark_responses
            }
        

        sales_order = frappe.get_doc("Sales Order", booking_entry.sales_order)
        sales_invoice = get_mapped_doc("Sales Order", sales_order.name, {
            "Sales Order": {
                "doctype": "Sales Invoice",
                "field_map": {
                    "name": "sales_order",
                    "customer": "customer",
                    "custom_rental_from_date": "custom_rental_from_date",
                    "custom_rental_to_date": "custom_rental_to_date",
                    "custom_actual_to_date": "custom_actual_to_date"
                }
            },
            "Booking Details": {
                "doctype": "Booking Details SAL",
                "field_map": {
                    "rental_item_id": "rental_item_id",
                    "item_name": "item_name",
                    "pricelist_name": "pricelist_name",
                    "price": "price",
                    "quantity": "quantity",
                    "amount": "amount",
                }
            }
        }, ignore_permissions=True)

        sales_invoice.custom_booking_entry = booking_entry_id
        sales_invoice.due_date = frappe.utils.nowdate()

        total_amount = sum(item.amount for item in sales_invoice.items)

        # Convert additional_charges from JSON string (if necessary)
        if isinstance(additional_charges, str):
            additional_charges = frappe.parse_json(additional_charges)

        # Validate and append additional charge items
        for charge in additional_charges:
            item_code = charge.get("item_code")
            rate = charge.get("rate", 0)

            if not item_code:
                return {"error": "Missing 'item_code' in additional_charges."}
            
            if not frappe.db.exists("Item", item_code):
                return {"error": f"Item '{item_code}' does not exist."}

            sales_invoice.append("items", {
                "item_code": item_code,
                "qty": 1,
                "rate": rate,
                "amount": rate
            })
            total_amount += float(rate)

        sales_invoice.flags.ignore_permissions = True
        sales_invoice.save()
        sales_invoice.submit()
        frappe.db.commit()

        return {
            "message": f"Sales Invoice '{sales_invoice.name}' created successfully for Booking Entry '{booking_entry_id}'.",
            "sales_invoice_name": sales_invoice.name,
            "total_amount": total_amount,
            "stock_response": stock_response,
            "customer": customer,
            "remark_responses": remark_responses
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Create Sales Invoice from Booking Entry Error")
        return {"error": f"An error occurred: {str(e)}"}
    
#function to update stock movement
@frappe.whitelist(allow_guest=True)
def create_stock_entry_on_return(booking_entry_id, item_warehouses=None):
    if not booking_entry_id or not frappe.db.exists('Booking Entry', booking_entry_id):  
        frappe.throw("Booking Entry not Found")
        
    if not frappe.db.exists('Warehouse', {'custom_is_customer_warehouse': 1}):
        frappe.throw(
            _("Customer Warehouse must be set before proceeding."),
            title=_("Validation Error"),
            exc=frappe.ValidationError
        )

    customer_warehouse = frappe.db.get_value('Warehouse', {'custom_is_customer_warehouse': 1}, 'name')
    doc = frappe.get_doc('Booking Entry', booking_entry_id)

    # Fetch warehouse associated with Rental Services item in Sales Order
    rental_item_wrh = frappe.db.get_all(
        'Sales Order Item',
        filters={'parent': doc.sales_order, 'item_code': 'Rental Services'},
        fields=['warehouse'],
        pluck='warehouse'
    )

    if not rental_item_wrh:
        frappe.throw(_("No rental item warehouse found. Stock Entry creation failed."))


    item_wrh = rental_item_wrh[0] if rental_item_wrh else None 
    
    stock_remaining = get_remaining_items(booking_entry_id)
    
    if stock_remaining:
        validate_item_stock(item_warehouses, stock_remaining)
        
        stock_entry = frappe.new_doc('Stock Entry')
        stock_entry.stock_entry_type = 'Material Transfer'
        stock_entry.posting_date = nowdate()
        stock_entry.from_warehouse = customer_warehouse
        stock_entry.to_warehouse = item_wrh
        stock_entry.custom_booking_entry = booking_entry_id
        stock_entry.custom_is_return = 1

        for rental_item in item_warehouses:
            stock_item = frappe.get_doc('Item',rental_item.get("rental_item_id"))
            if stock_item.is_stock_item:
                if rental_item.get("warehouse"):
                    item_warehouse = rental_item.get("warehouse")
                else:
                    item_warehouse = item_wrh

                stock_entry.append('items', {
                    'item_code': rental_item.get("rental_item_id"),
                    'qty': rental_item.get("quantity") if rental_item.get("quantity") else 1,
                    'uom': 'Nos',
                    's_warehouse': customer_warehouse,
                    't_warehouse': item_warehouse,
                    'allow_zero_valuation_rate': 1
                })

        stock_entry.flags.ignore_permissions = True                      
        stock_entry.insert()
        stock_entry.submit()
        frappe.db.commit()
        
        if stock_entry:
            status = update_status(booking_entry_id=booking_entry_id)
            if status :
                update_fully_returned_items(booking_entry_id)

        return {
            "message": f"Stock Entry '{stock_entry.name}' created successfully.",
            "stock_entry": stock_entry.name,
            "booking_entry" : f"Booking Entry status updated to {status}.",
        }
    else:
        return{
            "message": "No items to return."
        }
  
# function to filter warehouses
@frappe.whitelist(allow_guest=True)
def get_filtered_warehouses():
    warehouses = frappe.get_all(
        "Warehouse",
        filters={"custom_ecommerce_warehouse": 1, "disabled": 0},
        fields=["name"]
    )

    warehouse_list = [{"warehouse_id": warehouse["name"],"warehouse": warehouse["name"]} for warehouse in warehouses]

    return {"status_code": 200, "warehouses": warehouse_list}


# function to update customer blacklist or yellowlist
def update_customer_status(booking_entry_id, black_list=None, yellow_list=None, remarks=None):
    if black_list and yellow_list:
        frappe.throw(_("A customer cannot be both blacklisted and yellow-listed. Choose one."))
    if not frappe.db.exists("Booking Entry", booking_entry_id):
        return {"error": f"Booking Entry '{booking_entry_id}' does not exist."}

    customer_name = frappe.db.get_value("Booking Entry", booking_entry_id, "customer")

    if not customer_name:
        return {"error": f"Booking Entry '{booking_entry_id}' does not have a linked customer."}
    frappe.db.set_value("Customer", customer_name, {
        "custom_black_list": 1 if black_list else 0,
        "custom_yellow_list": 1 if yellow_list else 0,
        "custom_remarks": remarks or ""
    })
    frappe.db.commit() 

    return {
        "status": "success",
        "message": f"Customer '{customer_name}' updated successfully.",
        "data": {
            "black_list": black_list if black_list else 0,
            "yellow_list": yellow_list if yellow_list else 0,
            "remarks": remarks or "",
        }
    }

# function to show additional charges
@frappe.whitelist(allow_guest=True)
def get_items_by_group():
    try:
        items = frappe.get_all(
            'Item', 
            filters={
                'item_group': 'Services',
                'item_name': ['!=', 'Rental Services']
            }, 
            fields=['item_code', 'item_name']  
        )

        for item in items:
            item_price = frappe.db.get_value('Item Price', {'item_code': item['item_code']}, 'price_list_rate')
            item['item_price'] = item_price
            del item['item_name']  

        return {
            "status": "success",
            "data": items
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
    
# function to update item remarks
def add_remark_to_item(item_name, remark):
    if not item_name or not remark:
        return {"success": False, "message": "Item name and remark cannot be empty."}
    
    try:
        item_doc = frappe.get_doc("Item", item_name)
        item_doc.add_comment("Comment", remark)
        return {"success": True, "message": "Remark added to item comments successfully."}
    except frappe.DoesNotExistError:
        return {"success": False, "message": f"Item {item_name} does not exist."}
    except Exception as e:
        return {"success": False, "message": str(e)}

def update_status(booking_entry_id):
    remaining_items = get_remaining_items(booking_entry_id)
    # sales_invoice = frappe.db.get_value('Sales Invoice', {'custom_booking_entry': booking_entry_id}, 'name')
    # documents = frappe.db.get_all('Rental Security Document Type', {'parent': sales_invoice}, ['status'])
    # all_closed = all(doc['status'] == 'Closed' for doc in documents)
    
    status = None
    if remaining_items:
        status = 'Partially Returned'
    else :
        status = 'Returned'
    # elif not all_closed and not remaining_items:
    #     status = 'Document pending to return'

    if status:
        frappe.db.sql("""
            UPDATE `tabBooking Entry`
            SET status = %s
            WHERE name = %s
        """, (status, booking_entry_id))
        frappe.db.commit()

    return status

def get_remaining_items(booking_entry_id):
    
    issued_items = frappe.db.sql("""
        SELECT sei.item_code, SUM(sei.qty) AS issued_qty
        FROM `tabStock Entry Detail` sei
        JOIN `tabStock Entry` se ON sei.parent = se.name
        WHERE se.custom_booking_entry = %s AND se.stock_entry_type = 'Material Transfer' AND se.docstatus = 1 AND se.custom_is_return = 0
        GROUP BY sei.item_code
    """, (booking_entry_id,), as_dict=True)

    
    returned_items = frappe.db.sql("""
        SELECT sei.item_code, SUM(sei.qty) AS returned_qty
        FROM `tabStock Entry Detail` sei
        JOIN `tabStock Entry` se ON sei.parent = se.name
        WHERE se.custom_booking_entry = %s AND se.stock_entry_type = 'Material Transfer' AND se.docstatus = 1 AND se.custom_is_return = 1
        GROUP BY sei.item_code
    """, (booking_entry_id,), as_dict=True)

    
    issued_dict = {item["item_code"]: item["issued_qty"] for item in issued_items}
    returned_dict = {item["item_code"]: item["returned_qty"] for item in returned_items}

    
    remaining_items = []
    for item_code, issued_qty in issued_dict.items():
        returned_qty = returned_dict.get(item_code, 0)
        remaining_qty = issued_qty - returned_qty
        
        if returned_qty != issued_qty:
            remaining_items.append({
                "item_code": item_code,
                "remaining_qty": remaining_qty
            })
    return remaining_items


def validate_item_stock(item_warehouses, stock_remaining):
    stock_dict = {item["item_code"]: item["remaining_qty"] for item in stock_remaining}

    for item in item_warehouses:
        rental_item_id = item.get("rental_item_id")
        warehouse = item.get("warehouse")
        quantity = item.get("quantity")

        if rental_item_id not in stock_dict:
            frappe.throw(_("Item '{0}' is not available in stock.").format(rental_item_id))

        if quantity > stock_dict[rental_item_id]:
            frappe.throw(_("Item '{0}' has insufficient stock. Available: {1}, Requested: {2}")
                    .format(rental_item_id, stock_dict[rental_item_id], quantity))
            
            

def get_fully_returned_items(booking_entry_id):
    issued_items = frappe.db.sql("""
        SELECT sei.item_code, SUM(sei.qty) AS issued_qty
        FROM `tabStock Entry Detail` sei
        JOIN `tabStock Entry` se ON sei.parent = se.name
        WHERE se.custom_booking_entry = %s AND se.stock_entry_type = 'Material Transfer' AND se.docstatus = 1 AND se.custom_is_return = 0
        GROUP BY sei.item_code
    """, (booking_entry_id,), as_dict=True)

    returned_items = frappe.db.sql("""
        SELECT sei.item_code, SUM(sei.qty) AS returned_qty
        FROM `tabStock Entry Detail` sei
        JOIN `tabStock Entry` se ON sei.parent = se.name
        WHERE se.custom_booking_entry = %s AND se.stock_entry_type = 'Material Transfer' AND se.docstatus = 1 AND se.custom_is_return = 1
        GROUP BY sei.item_code
    """, (booking_entry_id,), as_dict=True)

    issued_dict = {item["item_code"]: item["issued_qty"] for item in issued_items}
    returned_dict = {item["item_code"]: item["returned_qty"] for item in returned_items}

    fully_returned_items = []
    for item_code, issued_qty in issued_dict.items():
        returned_qty = returned_dict.get(item_code, 0)
        if issued_qty == returned_qty:
            fully_returned_items.append({
                "item_code": item_code,
            })
    return fully_returned_items

def update_fully_returned_items(booking_entry_id):
    fully_returned_items = get_fully_returned_items(booking_entry_id)

    if not fully_returned_items:
        return 
    
    booking_entry = frappe.get_doc("Booking Entry", booking_entry_id)
    
    fully_returned_item_codes = {item["item_code"] for item in fully_returned_items}

    updated = False
    remaining_items = get_remaining_items(booking_entry_id)
    
    for rental_item in booking_entry.rental_items:
        if rental_item.rental_item_id in fully_returned_item_codes and not rental_item.returned_item:
            rental_item.returned_item = 1 
            updated = True
    if not remaining_items:
        for rental_item in booking_entry.rental_items:
            if not rental_item.returned_item:
                rental_item.returned_item = 1
                updated = True
        
    if updated:
        booking_entry.save()
        frappe.db.commit()  
        
        
def additional_charge_invoice(booking_entry_id, additional_charges):
    booking_entry = frappe.get_doc("Booking Entry", booking_entry_id)
    sales_order = frappe.get_doc("Sales Order", booking_entry.sales_order)
    sales_invoice = get_mapped_doc("Sales Order", sales_order.name, {
        "Sales Order": {
            "doctype": "Sales Invoice",
            "field_map": {
                "name": "sales_order",
                "customer": "customer",
                "custom_rental_from_date": "custom_rental_from_date",
                "custom_rental_to_date": "custom_rental_to_date",
                "custom_actual_to_date": "custom_actual_to_date"
            }
        },
        "Booking Details": {
            "doctype": "Booking Details SAL",
            "field_map": {
                "rental_item_id": "rental_item_id",
                "item_name": "item_name",
                "pricelist_name": "pricelist_name",
                "price": "price",
                "quantity": "quantity",
                "amount": "amount",
            }
        }
    }, ignore_permissions=True)

    sales_invoice.custom_booking_entry = booking_entry_id
    sales_invoice.due_date = frappe.utils.nowdate()

    total_amount = sum(item.amount for item in sales_invoice.items)

    # Convert additional_charges from JSON string (if necessary)
    if isinstance(additional_charges, str):
        additional_charges = frappe.parse_json(additional_charges)

    # Validate and append additional charge items
    for charge in additional_charges:
        item_code = charge.get("item_code")
        rate = charge.get("rate", 0)

        if not item_code:
            return {"error": "Missing 'item_code' in additional_charges."}
        
        if not frappe.db.exists("Item", item_code):
            return {"error": f"Item '{item_code}' does not exist."}

        sales_invoice.append("items", {
            "item_code": item_code,
            "qty": 1,
            "rate": rate,
            "amount": rate
        })
        total_amount += float(rate)

    sales_invoice.flags.ignore_permissions = True
    sales_invoice.save()
    sales_invoice.submit()
    frappe.db.commit()

    return {
        "message": f"Sales Invoice '{sales_invoice.name}' created successfully for Booking Entry Additional Charges '{booking_entry_id}'.",
        "sales_invoice_name": sales_invoice.name,
        "total_amount": total_amount,
    }
    
        