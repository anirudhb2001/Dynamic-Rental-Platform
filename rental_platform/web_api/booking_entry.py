

# import frappe
# from frappe import _

# @frappe.whitelist(allow_guest=True)
# def get_booking_entry_details(booking_entry_name):
#     """
#     Fetch all details of a specific Booking Entry doctype record along with customer details.
#     """
#     try:
#         # Validate the input
#         if not booking_entry_name:
#             return {"error": _("Booking Entry name is required.")}

#         # Fetch the Booking Entry record
#         booking_entry = frappe.get_doc("Booking Entry", booking_entry_name)

#         # Serialize the record into a dictionary
#         booking_entry_details = booking_entry.as_dict()

#         # Get customer details if customer field exists in the Booking Entry
#         customer_details = {}
#         if booking_entry.get("customer"):
#             customer = frappe.get_doc("Customer", booking_entry.customer)
#             customer_details = customer.as_dict()

#         # Combine the booking entry and customer details
#         return {
#             "status": "success",
#             "data": {
#                 "booking_entry": booking_entry_details,
#                 "customer_details": customer_details
#             }
#         }
#     except frappe.DoesNotExistError:
#         return {"error": _("Booking Entry '{0}' does not exist.").format(booking_entry_name)}
#     except Exception as e:
#         frappe.log_error(frappe.get_traceback(), "Fetch Booking Entry Details Error")
#         return {"error": f"An error occurred: {str(e)}"}




# import frappe
# from frappe import _

# @frappe.whitelist(allow_guest=True)
# def get_booking_entry_details(booking_entry_name=None, item_name=None):
#     """
#     Fetch all details of a specific Booking Entry record.
#     Optionally, filter based on item name.
#     """
#     try:
#         if not booking_entry_name and not item_name:
#             return {"status": "error", "message": _("Either Booking Entry name or Item name is required.")}

#         # Fetch Booking Entry by name or item
#         if booking_entry_name:
#             booking_entry = frappe.get_doc("Booking Entry", booking_entry_name)
#         elif item_name:
#             booking_entry_name = frappe.db.get_value("Booking Entry", {"item": item_name, "status": "Reserved"}, "name")
#             if not booking_entry_name:
#                 return {"status": "error", "message": _("No Booking Entry found for item '{0}'").format(item_name)}
#             booking_entry = frappe.get_doc("Booking Entry", booking_entry_name)

#         # Serialize the record into a dictionary
#         booking_entry_details = booking_entry.as_dict()

#         # Fetch customer details if available
#         customer_details = {}
#         if booking_entry.get("customer"):
#             customer = frappe.get_doc("Customer", booking_entry.customer)
#             customer_details = customer.as_dict()

#         # Combine and return data
#         return {
#             "status": "success",
#             "data": {
#                 "booking_entry": booking_entry_details,
#                 "customer_details": customer_details or None
#             }
#         }

#     except frappe.DoesNotExistError:
#         return {"status": "error", "message": _("Booking Entry '{0}' does not exist.").format(booking_entry_name)}
#     except Exception as e:
#         frappe.log_error(frappe.get_traceback(), "Fetch Booking Entry Details Error")
#         return {"status": "error", "message": f"An unexpected error occurred: {str(e)}"}


# import frappe
# from frappe import _

# @frappe.whitelist(allow_guest=True)
# def get_booking_entry_details(booking_entry_name=None, item_name=None):
#     """
#     Fetch Booking Entry details by booking entry name or item name.
#     """
#     try:
#         if not booking_entry_name and not item_name:
#             return {"status": "error", "message": _("Either Booking Entry name or Item name is required.")}

#         # Fetch Booking Entry using the item_name if provided
#         if item_name and not booking_entry_name:
#             booking_entry_name = frappe.db.get_value(
#                 "Booking Entry",
#                 {"item": item_name, "status": "Reserved"},  # Adjust filters as per your use case
#                 "name"
#             )

        
#             if not booking_entry_name:
#                 return {"status": "error", "message": _("No Booking Entry found for item '{0}'").format(item_name)}

#         # Fetch the Booking Entry details
#         booking_entry = frappe.get_doc("Booking Entry", booking_entry_name)
#         booking_entry_details = booking_entry.as_dict()

#         # Fetch associated customer details if available
#         customer_details = {}
#         if booking_entry.get("customer"):
#             customer = frappe.get_doc("Customer", booking_entry.customer)
#             customer_details = customer.as_dict()

#         return {
#             "status": "success",
#             "data": {
#                 "booking_entry": booking_entry_details,
#                 "customer_details": customer_details or None,
#             }
#         }

#     except frappe.DoesNotExistError:
#         return {"status": "error", "message": _("Booking Entry '{0}' does not exist.").format(booking_entry_name)}
#     except Exception as e:
#         frappe.log_error(frappe.get_traceback(), "Fetch Booking Entry Details Error")
#         return {"status": "error", "message": f"An unexpected error occurred: {str(e)}"}



import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_booking_entry_details(booking_entry_name=None, item_name=None):
    """
    Fetch Booking Entry details by booking entry name or item name.
    """
    try:
        if not booking_entry_name and not item_name:
            return {"status": "error", "message": _("Either Booking Entry name or Item name is required.")}

        # Fetch the Booking Entry using the item_name if provided
        if item_name and not booking_entry_name:
            # Fetch Booking Entry name using item_name from rental_item child table
            booking_entry_name = frappe.db.get_value(
                "Booking Entry",
                {"rental_items": ["item_name", "=", item_name], "status": "Reserved"},  # Filter using rental_items child table
                "name"
            )

            if not booking_entry_name:
                return {"status": "error", "message": _("No Booking Entry found for item '{0}'").format(item_name)}

        # Fetch the Booking Entry details
        booking_entry = frappe.get_doc("Booking Entry", booking_entry_name)
        booking_entry_details = booking_entry.as_dict()

        # Fetch associated customer details if available
        customer_details = {}
        if booking_entry.get("customer"):
            customer = frappe.get_doc("Customer", booking_entry.customer)
            customer_details = customer.as_dict()

        # Fetch rental items from the child table rental_item
        rental_items = []
        for item in booking_entry.rental_items:
            rental_items.append({
                "item_name": item.item_name,
                "price": item.price,
                "quantity": item.quantity,
                "amount": item.amount
            })

        return {
            "status": "success",
            "data": {
                "booking_entry": booking_entry_details,
                "customer_details": customer_details or None,
                "rental_items": rental_items
            }
        }

    except frappe.DoesNotExistError:
        return {"status": "error", "message": _("Booking Entry '{0}' does not exist.").format(booking_entry_name)}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Fetch Booking Entry Details Error")
        return {"status": "error", "message": f"An unexpected error occurred: {str(e)}"}
    

@frappe.whitelist(allow_guest=True)
def get_reserved_booking_entries_by_items(item_names, rental_from_date, actual_to_date):
    try:
        if isinstance(item_names, str):
            import json
            item_names = json.loads(item_names)

        if not isinstance(item_names, list):
            return {
                "status": "error",
                "message": "Invalid input format for item_names. It should be a list."
            }

        if len(item_names) == 0:
            return {
                "status": "success",
                "data": []
            }

        item_names_tuple = tuple(item_names)

        booking_entries = frappe.db.sql(
            """
            SELECT DISTINCT
                be.name AS name,
                be.customer AS customer,
                be.rental_from_date AS rental_from_date,
                be.actual_to_date AS actual_to_date,
                be.custom_mobile_number AS custom_mobile_number
            FROM `tabBooking Entry` AS be
            JOIN `tabBooking details Table` AS bdt
                ON bdt.parent = be.name
            WHERE be.status = %(status)s
                AND bdt.item_name IN %(item_names)s
                AND be.rental_from_date <= %(actual_to_date)s
                AND be.actual_to_date >= %(rental_from_date)s
            """,
            {
                "status": "Reserved",
                "item_names": item_names_tuple,
                "actual_to_date": actual_to_date,
                "rental_from_date": rental_from_date,
            },
            as_dict=True,
        )

        result = []
        for entry in booking_entries:
            booking_entry_name = entry.get("name")
            customer = entry.get("customer")
            booking_rental_from_date = entry.get("rental_from_date")
            booking_actual_to_date = entry.get("actual_to_date")
            custom_mobile_number = entry.get("custom_mobile_number")

            rental_items = frappe.get_all(
                "Booking details Table",  # Child table name
                filters={"parent": booking_entry_name, "item_name": ["in", item_names_tuple]},
                fields=["item_name"]
            )

            if rental_items:
                result.append({
                    "booking_entry": booking_entry_name,
                    "customer": customer,
                    "rental_from_date": booking_rental_from_date,
                    "actual_to_date": booking_actual_to_date,
                    "custom_mobile_number": custom_mobile_number,
                    "rental_items": rental_items,
                })

        return {
            "status": "success",
            "data": result
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Fetch Reserved Booking Entries by Multiple Items Error")
        return {
            "status": "error",
            "message": f"An unexpected error occurred: {str(e)}"
        }



#warehouse filter in return screen
@frappe.whitelist(allow_guest=True)
def warehouse_filtering():
    warehouses = frappe.get_all(
        "Warehouse",
        filters={"disabled": 0},
        fields=["name"]
    )

    warehouse_list = [{"warehouse_id": warehouse["name"],"warehouse": warehouse["name"]} for warehouse in warehouses]

    return {"status_code": 200, "warehouses": warehouse_list}



