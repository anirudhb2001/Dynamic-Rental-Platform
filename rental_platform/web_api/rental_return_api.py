import frappe
from frappe import _
from frappe.utils import nowdate, getdate, now_datetime
import math
from frappe.model.mapper import get_mapped_doc

@frappe.whitelist(allow_guest=False)
def get_returnable_bookings(customer=None, from_date=None, to_date=None):
    filters = {"docstatus": ["<", 2], "status": ["in", ["Reserved", "Rented", "Partially Returned"]]}
    
    if customer:
        filters["customer"] = customer
    
    if from_date:
        filters["rental_from_date"] = [">=", from_date]
        
    if to_date:
        filters["rental_to_date"] = ["<=", to_date]

    bookings = frappe.get_all(
        "Booking Entry",
        filters=filters,
        fields=["name", "customer", "rental_from_date", "rental_to_date", "actual_to_date", "status"],
        order_by="rental_to_date asc"
    )
    
    for booking in bookings:
        # Fetch items from Booking Details Table
        items = frappe.get_all("Booking details Table", filters={"parent": booking["name"]}, fields=["item_name", "rental_item_id", "serial_no"])
        booking["items"] = items
            
    return bookings

@frappe.whitelist(allow_guest=False)
def process_rental_return(booking_id, return_date, remarks=None, damage_found=0, damage_cost=0):
    try:
        # Validate Booking
        if not frappe.db.exists("Booking Entry", booking_id):
            return {"error": f"Booking Entry '{booking_id}' does not exist."}
            
        booking = frappe.get_doc("Booking Entry", booking_id)
        
        if booking.docstatus != 1:
            return {"error": "Cannot process return. The Booking Entry is not in a submitted state."}
        
        # Approval enforcement
        from rental_platform.web_api.validate import check_portal_approval_for_customer
        check_portal_approval_for_customer(booking.customer)
        
        # Validate Duplicate Return
        existing_return = frappe.db.exists(
            "Rental Return",
            {
                "booking": booking_id,
                "docstatus": ["!=", 2]
            }
        )
        if existing_return:
            return {"error": "A Return has already been processed for this booking."}
            
        # Get Settings
        settings = frappe.get_doc("Rental Settings", "Rental Settings")
        grace_period_hours = settings.grace_period_hours or 0
        late_fee_item = settings.late_fee_item
        damage_charge_item = settings.damage_charge_item
        
        # Calculate Late Fee
        actual_return_datetime = frappe.utils.get_datetime(return_date)
        expected_return_datetime = frappe.utils.get_datetime(booking.rental_to_date)
        
        pricelist_name = booking.rental_items[0].pricelist_name if booking.rental_items else None
        
        late_days = 0
        late_fee = 0
        
        if actual_return_datetime > expected_return_datetime:
            delta = actual_return_datetime - expected_return_datetime
            delta_hours = delta.total_seconds() / 3600
            
            if delta_hours > grace_period_hours:
                # We bill in blocks of custom_valid_hour from Price List or default 24h
                valid_hour = frappe.db.get_value("Price List", {"name": pricelist_name}, "custom_valid_hour") if pricelist_name else 24
                try:
                    valid_hour = int(valid_hour) if valid_hour else 24
                except:
                    valid_hour = 24
                
                chargeable_hours = delta_hours - grace_period_hours
                late_days = math.ceil(chargeable_hours / valid_hour)
                
                if late_fee_item:
                    # Get rate for late_fee_item
                    late_fee_rate = frappe.db.get_value(
                        "Item Price", 
                        {"item_code": late_fee_item, "price_list": pricelist_name}, 
                        "price_list_rate"
                    ) if pricelist_name else 0
                    if not late_fee_rate:
                        late_fee_rate = frappe.db.get_value("Item", late_fee_item, "standard_rate") or 0
                    
                    late_fee = late_days * late_fee_rate
        
        damage_cost = float(damage_cost) if damage_cost else 0
        total_additional_charge = late_fee + damage_cost
        
        sales_invoice_name = None
        
        # Generate Sales Invoice if there are additional charges
        if total_additional_charge > 0:
            if not late_fee_item and late_fee > 0:
                return {"error": "Late Fee Item is not configured in Rental Settings."}
            if not damage_charge_item and damage_cost > 0:
                return {"error": "Damage Charge Item is not configured in Rental Settings."}
                
            si = frappe.new_doc("Sales Invoice")
            si.customer = booking.customer
            si.due_date = frappe.utils.nowdate()
            si.custom_rental_from_date = booking.rental_from_date
            si.custom_rental_to_date = booking.rental_to_date
            si.custom_actual_to_date = return_date
            
            if late_fee > 0:
                si.append("items", {
                    "item_code": late_fee_item,
                    "qty": late_days,
                    "rate": late_fee / late_days if late_days > 0 else late_fee,
                    "amount": late_fee
                })
                
            if damage_cost > 0:
                si.append("items", {
                    "item_code": damage_charge_item,
                    "qty": 1,
                    "rate": damage_cost,
                    "amount": damage_cost
                })
                
            si.flags.ignore_permissions = True
            si.insert()
            si.submit()
            sales_invoice_name = si.name
            
        # Create Rental Return
        if booking.rental_items:
            # We'll just take the first item for now to satisfy the Rental Return fields
            # since Rental Return was originally designed for single-item bookings.
            first_item = booking.rental_items[0]
            
            rental_return = frappe.new_doc("Rental Return")
            rental_return.booking = booking_id
            rental_return.customer = booking.customer
            rental_return.asset = first_item.asset if hasattr(first_item, 'asset') else None
            rental_return.item = first_item.item if hasattr(first_item, 'item') else first_item.rental_item_id
            rental_return.serial_no = first_item.serial_no if hasattr(first_item, 'serial_no') else None
            if hasattr(first_item, "asset_instance"):
                rental_return.asset_instance = first_item.asset_instance
            
            rental_return.expected_return_date = booking.rental_to_date
            rental_return.actual_return_date = return_date
            rental_return.remarks = remarks
            
            if sales_invoice_name:
                rental_return.sales_invoice = sales_invoice_name
                
            rental_return.flags.ignore_permissions = True
            rental_return.insert()
            rental_return.submit()
            
        # Update Booking Status
        frappe.db.set_value("Booking Entry", booking_id, "status", "Returned")
        
        return {
            "message": "Return processed successfully.",
            "rental_return": rental_return.name,
            "sales_invoice": sales_invoice_name
        }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Process Rental Return Error")
        return {"error": f"An error occurred: {str(e)}"}
