# pyrefly: ignore [missing-import]
import frappe
from frappe import _ 
from frappe.model.document import Document
from datetime import datetime
import math

#==============================OLD CODE==================================
# @frappe.whitelist(allow_guest=True)
# def price_list_qty(item_code, price_list, pickup_date, return_date):
#     # Get the price rate
#     rate = frappe.get_value("Item Price", {'item_code': item_code, 'price_list': price_list}, 'price_list_rate')

#     # If no rate found, return early with a clear response
#     if rate is None:
#         frappe.local.response['rate'] = None
#         frappe.local.response['error'] = "Price rate not found for the given item and price list"
#         return

#     # Set the rate in response
#     frappe.local.response['rate'] = rate

#     # Get the custom valid hour from Price List
#     valid_time = frappe.get_value("Price List", {'name': price_list}, 'custom_valid_hour')

#     try:
#         valid_time = int(valid_time)
#     except (TypeError, ValueError):
#         frappe.local.response['error'] = "Invalid or missing 'custom_valid_hour' in Price List"
#         return

#     # Parse pickup and return dates
#     try:
#         from_date = datetime.strptime(pickup_date, '%Y-%m-%d %H:%M:%S')
#         to_date = datetime.strptime(return_date, '%Y-%m-%d %H:%M:%S')
#     except ValueError:
#         frappe.local.response['error'] = "Invalid date format. Expected format: YYYY-MM-DD HH:MM:SS"
#         return

#     # Calculate rental duration in hours
#     actual_time = (to_date - from_date).total_seconds() / 3600
#     quantity = actual_time / valid_time
#     rounded_qty = math.ceil(quantity)

#     # Calculate total price
#     tot_rate = rounded_qty * rate

#     # Return results
#     frappe.local.response['the total rate '] = tot_rate
#     frappe.local.response['the quantity'] = rounded_qty
    



@frappe.whitelist(allow_guest=True)
def price_list_qty(item_code, price_list, pickup_date, return_date):
    from datetime import datetime

    # Get rate
    rate = frappe.get_value(
        "Item Price",
        {"item_code": item_code, "price_list": price_list},
        "price_list_rate"
    )
    if rate is None:
        # Fallback to Rental Asset rate if not a standard item
        rate = frappe.get_value("Rental Asset", {"name": item_code}, "rental_rate")

    if rate is None:
        return {"error": "Price rate not found for this item & price list"}

    # Get valid hour
    valid_hour = frappe.get_value(
        "Price List",
        {"name": price_list},
        "custom_valid_hour"
    )

    # If not set → use default 24 hours
    try:
        valid_hour = int(valid_hour) if valid_hour else 24
    except:
        valid_hour = 24

    # Convert datetime
    try:
        from_date = datetime.strptime(pickup_date, "%Y-%m-%d %H:%M:%S")
        to_date = datetime.strptime(return_date, "%Y-%m-%d %H:%M:%S")
    except:
        return {"error": "Invalid datetime format. Use YYYY-MM-DD HH:MM:SS"}

    if to_date <= from_date:
        return {"error": "Return date must be after pickup date"}

    # Calculate hours
    actual_hours = (to_date - from_date).total_seconds() / 3600
    actual_hours = round(actual_hours, 2)

    full_blocks = int(actual_hours // valid_hour)
    remaining_hours = actual_hours % valid_hour

    quantity = full_blocks
    if remaining_hours > 0:
        quantity += 1

    # Total amount
    total_rate = quantity * rate

    return {
        "rate": rate,
        "valid_hour": valid_hour,
        "actual_hours": actual_hours,
        "quantity": quantity,
        "total_rate": total_rate
    }





#========================OLD CODE=================================

# #rate and quantity based on actual return date
# @frappe.whitelist(allow_guest=True)
# def qty_return(item_code, price_list, pickup_date, actual_return_date):
#     # Try to get the rate
#     rate = frappe.get_value("Item Price", {'item_code': item_code, 'price_list': price_list}, 'price_list_rate')
    
#     # If no rate found, return early with only 'rate': null and no exception
#     if rate is None:
#         frappe.local.response['rate'] = None
#         frappe.local.response['error'] = "Price rate not found for the given item and price list"
#         return

#     # Add the rate to the response
#     frappe.local.response['rate'] = rate

#     # Get valid time for calculation
#     valid_time = frappe.get_value("Price List", {'name': price_list}, 'custom_valid_hour')

#     try:
#         valid_time = int(valid_time)
#     except (TypeError, ValueError):
#         frappe.local.response['error'] = "Invalid or missing 'custom_valid_hour' in Price List"
#         return

#     # Parse dates
#     try:
#         from_date = datetime.strptime(pickup_date, '%Y-%m-%d %H:%M:%S')
#         to_date = datetime.strptime(actual_return_date, '%Y-%m-%d %H:%M:%S')
#     except ValueError:
#         frappe.local.response['error'] = "Invalid date format. Expected format: YYYY-MM-DD HH:MM:SS"
#         return

#     # Calculate actual time in hours and quantity
#     actual_time = (to_date - from_date).total_seconds() / 3600
#     quantity = actual_time / valid_time
#     rounded_qty = math.ceil(quantity)

#     # Calculate total rate
#     tot_rate = rounded_qty * rate

#     # Add to response
#     frappe.local.response['the total rate '] = tot_rate
#     frappe.local.response['the quantity'] = rounded_qty





@frappe.whitelist(allow_guest=True)
def qty_return(item_code, price_list, pickup_date, actual_return_date):
    import math
    from datetime import datetime

    # Get rate
    rate = frappe.get_value("Item Price", 
                            {'item_code': item_code, 'price_list': price_list}, 
                            'price_list_rate')
    if rate is None:
        # Fallback to Rental Asset rate if not a standard item
        rate = frappe.get_value("Rental Asset", {"name": item_code}, "rental_rate")

    if rate is None:
        frappe.local.response['rate'] = None
        frappe.local.response['error'] = "Price rate not found for the given item and price list"
        return

    frappe.local.response['rate'] = rate

    # Get valid hour (default 24)
    valid_hour = frappe.get_value("Price List", {'name': price_list}, 'custom_valid_hour')
    try:
        valid_hour = int(valid_hour) if valid_hour else 24
    except:
        valid_hour = 24

    # Parse pickup and return datetime
    try:
        from_date = datetime.strptime(pickup_date, '%Y-%m-%d %H:%M:%S')
        to_date = datetime.strptime(actual_return_date, '%Y-%m-%d %H:%M:%S')
    except ValueError:
        frappe.local.response['error'] = "Invalid date format. Expected format: YYYY-MM-DD HH:MM:SS"
        return

    if to_date <= from_date:
        frappe.local.response['error'] = "Return date must be after pickup date"
        return

    # Calculate actual hours
    actual_hours = (to_date - from_date).total_seconds() / 3600
    actual_hours = round(actual_hours, 2)

    # --------------------------
    #   Manual rounding logic
    # --------------------------
    full_blocks = int(actual_hours // valid_hour)
    remaining_hours = actual_hours % valid_hour

    quantity = full_blocks
    if remaining_hours > 0:
        quantity += 1

    # Calculate total rate
    total_rate = quantity * rate

    # Set in frappe.local.response
    frappe.local.response['actual_hours'] = actual_hours
    frappe.local.response['valid_hour'] = valid_hour
    frappe.local.response['the quantity'] = quantity
    frappe.local.response['the total rate'] = total_rate
