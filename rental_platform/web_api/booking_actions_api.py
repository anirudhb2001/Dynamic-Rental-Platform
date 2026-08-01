import frappe

@frappe.whitelist(allow_guest=False)
def mark_as_picked_up(booking_id):
    if not frappe.has_permission("Booking Entry", "write"):
        return {"error": "You do not have permission to modify this booking."}
        
    try:
        booking = frappe.get_doc("Booking Entry", booking_id)
        if booking.docstatus != 1:
            return {"error": "Booking is not submitted."}
            
        if booking.status != "Reserved":
            return {"error": f"Cannot pick up booking with status {booking.status}."}
            
        frappe.db.set_value("Booking Entry", booking_id, "status", "Rented")
        
        # Add a comment to the timeline
        booking.add_comment("Comment", text="Asset marked as Rented via Admin Action.")
        
        return {"message": "Booking marked as Rented."}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Mark Picked Up Error")
        return {"error": str(e)}

@frappe.whitelist(allow_guest=False)
def mark_as_completed(booking_id):
    if not frappe.has_permission("Booking Entry", "write"):
        return {"error": "You do not have permission to modify this booking."}
        
    try:
        booking = frappe.get_doc("Booking Entry", booking_id)
        if booking.docstatus != 1:
            return {"error": "Booking is not submitted."}
            
        if booking.status not in ["Returned", "Rented", "Reserved"]:
            return {"error": f"Cannot complete booking with status {booking.status}."}
            
        frappe.db.set_value("Booking Entry", booking_id, "status", "Completed")
        
        # Add a comment to the timeline
        booking.add_comment("Comment", text="Rental marked as Completed via Admin Action.")
        
        return {"message": "Booking marked as Completed."}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Mark Completed Error")
        return {"error": str(e)}

@frappe.whitelist(allow_guest=True)
def process_return(booking_entry_id, additional_charges=None, item_warehouses=None, black_list=False, yellow_list=False, remarks=None, item_remarks=None):
    from rental_platform.web_api.return_booking import update_customer_status, add_remark_to_item
    from frappe.model.mapper import get_mapped_doc

    if not frappe.db.exists("Booking Entry", booking_entry_id):
        return {"error": f"Booking Entry '{booking_entry_id}' does not exist."}
                                        
    booking_entry = frappe.get_doc("Booking Entry", booking_entry_id)
    if not booking_entry.sales_order:
        return {"error": f"No linked Sales Order found for Booking Entry '{booking_entry_id}'."}

    # Update Customer
    update_customer_status(booking_entry_id, black_list, yellow_list, remarks)
    
    # Process Item Remarks
    if item_remarks:
        if isinstance(item_remarks, str):
            item_remarks = frappe.parse_json(item_remarks)
        for item in item_remarks:
            if "item_name" in item and "remark" in item:
                add_remark_to_item(item["item_name"], item["remark"])
                
    # Create Stock Entry
    from rental_platform.web_api.return_booking import create_stock_entry_on_return
    if item_warehouses:
        if isinstance(item_warehouses, str):
            item_warehouses = frappe.parse_json(item_warehouses)
        create_stock_entry_on_return(booking_entry_id, item_warehouses)
    else:
        create_stock_entry_on_return(booking_entry_id)

    # Create Draft Sales Invoice
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

    if isinstance(additional_charges, str):
        additional_charges = frappe.parse_json(additional_charges)

    if additional_charges:
        for charge in additional_charges:
            item_code = charge.get("item_code")
            rate = charge.get("rate", 0)
            if item_code:
                sales_invoice.append("items", {
                    "item_code": item_code,
                    "qty": 1,
                    "rate": rate,
                    "amount": rate
                })

    sales_invoice.flags.ignore_permissions = True
    sales_invoice.save()
    frappe.db.commit()

    return {
        "message": "Draft Sales Invoice created successfully.",
        "sales_invoice_name": sales_invoice.name
    }

@frappe.whitelist(allow_guest=True)
def get_booking_entry_items(booking_entry_id):
    if not frappe.db.exists("Booking Entry", booking_entry_id):
        return {"error": "Booking Entry not found."}
    
    items = frappe.get_all(
        "Booking details Table",
        filters={"parent": booking_entry_id},
        fields=["item_name", "rental_item_id", "serial_no", "asset_instance", "quantity", "returned_item"]
    )
    
    # Calculate stock_quantity (amount left to return)
    result = []
    for item in items:
        qty = float(item.quantity or 1)
        returned = int(item.returned_item or 0)
        # If not returned, they need to return the full quantity
        left = qty if not returned else 0
        if left > 0:
            item["stock_quantity"] = left
            # Prefer serial_no, fallback to asset_instance
            item["serial_no"] = item.serial_no or item.asset_instance
            result.append(item)
            
    return {"message": "Success", "items": result}
