import frappe
from datetime import datetime


# def test():
#     items=frappe.get_all("Item",filters={'custom_show_in_rental_screen':1},fields=['name'])
#     frappe.local.response['item']=items

        
   
@frappe.whitelist(allow_guest=True)
def get_item_availability(start_datetime, end_datetime):
    items = frappe.get_all(
        "Item",
        filters={"custom_show_in_rental_screen": 1, "disabled": 0},
        fields=["item_code", "item_name"],
        order_by="item_name ASC"
    )
    item_availability = {item["item_code"] for item in items}

    rental_entries = frappe.db.sql(
        """
        SELECT
            rbe.name AS booking_entry_name,
            rbe.status,
            rbed.rental_item_id
        FROM
            `tabBooking Entry` AS rbe
        JOIN
            `tabBooking details Table` AS rbed
        ON
            rbe.name = rbed.parent
        WHERE
            rbe.status IN ('Reserved', 'Rented')
            AND (
                rbe.rental_from_date < %(end_datetime)s
                AND rbe.actual_to_date > %(start_datetime)s
            )
        """,
        {
            "start_datetime": start_datetime,
            "end_datetime": end_datetime,
        },
        as_dict=True
    )

    reserved = []
    rented = []
    for r in rental_entries:
        if r.status == "Reserved":
            reserved.append(r.rental_item_id)
        else:
            rented.append(r.rental_item_id)

    reserved_or_rented_items = [entry["rental_item_id"] for entry in rental_entries]
    available_items = list(set(item_availability) - set(reserved_or_rented_items))

    total_items_status = []

    # Add available items
    for item in available_items:
        total_items_status.append({"item_id": item, "status": "Available"})

    # Add reserved items
    for item in reserved:
        total_items_status.append({"item_id": item, "status": "Reserved"})

    # Add rented items
    for item in rented:
        total_items_status.append({"item_id": item, "status": "Rented"})

    # Return the updated format
    frappe.local.response['total items'] = total_items_status


    
    # # Step 3: Create a dictionary to track item statuses
    # item_status = {item["item_code"]: "Available" for item in items}

    # # Update the status for items in rental entries
    # for entry in rental_entries:
    #     item_code = entry["item_code"]
    #     status = entry["status"]
    #     item_status[item_code] = status  # Override 'Available' with 'Reserved' or 'Rented'

    # # Step 4: Create a final list of items with their status
    # final_list = []
    # for item in items:
    #     item_code = item["item_code"]
    #     final_list.append({
    #         "item_code": item_code,
    #         "item_name": item["item_name"],
    #         "status": item_status[item_code]
    #     })
    # frappe.local.response['result']=final_list

