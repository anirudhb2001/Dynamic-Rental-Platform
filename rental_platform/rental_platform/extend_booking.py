import frappe
from frappe.model.document import Document
from rental_platform.web_api.cart import create_quotation
from frappe.utils import get_datetime

@frappe.whitelist(allow_guest=True)
def customers(customer):
    cus=frappe.get_all("Booking Entry",filters={'customer':customer})
    frappe.local.response['customers']=cus
@frappe.whitelist(allow_guest=True)
def extend_bookings(booking_id,new_to_date):
    doc=frappe.get_doc("Rental Booking",booking_id)
    new_from_date=doc.end_date
    status=doc.booking_status
    item=[{'rental_item_id': doc.asset}]
    unavailable_items = []
    for i in item:
        bookings = frappe.db.sql("""
        SELECT
            name, booking_status AS status, asset AS rental_item_id
        FROM
            `tabRental Booking`
        WHERE
            asset = %(rental_item_id)s
            AND name != %(current_booking_id)s
            AND booking_status IN ('Reserved', 'Picked Up', 'On Ride')
            AND (
                start_date < %(new_to_date)s
                AND end_date > %(new_from_date)s
            )
    """, {
        "current_booking_id": booking_id,
        "rental_item_id": i['rental_item_id'],
        "new_from_date": new_from_date,
        "new_to_date": new_to_date
    }, as_dict=True)   
   # if not bookings: 
        if bookings:
            unavailable_items.append(i['rental_item_id'])
    frappe.local.response['availability']=unavailable_items   
    if unavailable_items:
        frappe.msgprint(
            f"The following items are unavailable for the selected period: {', '.join(unavailable_items)}",
            alert=True
        )
    else:



        create_quotation(
            customer=doc.customer,  # Use dynamic customer linked to the booking
            booking_details=[
                {
                    "rental_item_id": item.get('rental_item_id'),
                    "item_name": frappe.get_value("Item", item.get('rental_item_id'), "item_name"),
                    "quantity": 1,  # Fetch or calculate based on business logic
                    "price": frappe.get_value("Item Price", {"item_code": item.get('rental_item_id')}, "price_list_rate") or 0,
                    "amount": 1 * (frappe.get_value("Item Price", {"item_code": item.get('rental_item_id')}, "price_list_rate") or 0),
                    "selected_subitems": []  # Populate if applicable
                } for item in frappe.get_all("Booking details Table", filters={'parent': doc.name}, fields=['rental_item_id'])
            ],
            custom_rental_from_date=new_from_date,
            custom_rental_to_date=new_to_date,
            custom_actual_to_date=new_to_date
        )

        frappe.msgprint("Quotation created successfully.")

        # doc.db_set("rental_from_date", new_from_date)
        doc.db_set("rental_to_date", new_to_date)
        doc.db_set("actual_to_date", new_to_date)
        frappe.db.commit()


    # Save and submit the Quotation
    # quotation.insert(ignore_permissions=True)
    # frappe.db.commit()
@frappe.whitelist(allow_guest=True)   
def create_sales_order(quotation_name):
    quotation = frappe.get_doc("Quotation", quotation_name)
     # If the quotation is not submitted yet, submit it.
    # if quotation.docstatus == 0:
    #     quotation.submit()
    
        
    sales_order = frappe.new_doc("Sales Order")
    sales_order.customer = quotation.party_name
    sales_order.delivery_date = quotation.custom_rental_to_date or frappe.utils.nowdate()
    sales_order.custom_rental_from_date = quotation.custom_rental_from_date
    sales_order.custom_rental_to_date = quotation.custom_rental_to_date
    sales_order.custom_actual_to_date_ = quotation.custom_actual_to_date
    sales_order.custom_is_extension = 1
    tax_template = frappe.db.get_value(
                "Sales Taxes and Charges Template",
                {"company": sales_order.company},
                "name"
    )
    if tax_template:
                sales_order.taxes_and_charges = tax_template
                sales_order.run_method("set_missing_values")
                sales_order.run_method("calculate_taxes_and_totals")
    
    # Add items from Quotation to Sales Order
    for item in quotation.custom_rental_items:
            sales_order.append("custom_rental_items", {
                "rental_item_id": item.rental_item_id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "pricelist_name": item.pricelist_name,
                "price": item.price,
                "amount": item.amount
            })

    for item in quotation.items:
            sales_order.append("items", {
                "item_code": item.item_code,
                "qty": item.qty,
                "rate": item.rate,
                "amount": item.amount,
                "delivery_date": quotation.custom_rental_to_date
            })
    sales_order.insert(ignore_permissions=True)
    frappe.db.commit()
        




   
def update_booking_entry_from_quotation(booking_entry_id, quotation_id):
    # Fetch the Booking Entry document
    booking_entry = frappe.get_doc("Booking Entry", booking_entry_id)

    # Fetch the Booking details child table from the Quotation
    quotation_details = frappe.get_all(
        "Booking Details",  # Quotation child table
        filters={'parent': quotation_id},
        fields=['rental_item_id', 'quantity', 'price', 'amount']    
    )

    # Iterate over the Booking Entry's child table
    for booking_detail in booking_entry.rental_items:  # Booking Entry child table
        # Match the rental_item_id with Quotation child table
        matching_items = [
            q for q in quotation_details if q["rental_item_id"] == booking_detail.rental_item_id
        ]
        for item in matching_items:
            # Update the fields in the database directly
            frappe.db.set_value(
                "Booking details Table",  # Child table's name
                booking_detail.name,  # Unique identifier for the row
                "quantity",
                booking_detail.quantity + item["quantity"]
            )
            frappe.db.set_value(
                "Booking details Table",
                booking_detail.name,
                "price",
                booking_detail.price + item["price"]
            )
            frappe.db.set_value(
                "Booking details Table",
                booking_detail.name,
                "amount",
                booking_detail.amount + item["amount"]
            )



#     # Commit the changes
    frappe.db.commit()

    frappe.msgprint(f"Booking Entry {booking_entry_id} updated successfully with values from Quotation {quotation_id}.")

@frappe.whitelist(allow_guest=True)       
def extend_bookings_availability(booking_id, new_to_date):
    new_to_date = get_datetime(new_to_date)  # ✅ ensures datetime
    doc = frappe.get_doc("Rental Booking", booking_id)
    new_from_date = doc.end_date
    status = doc.booking_status
    items = [{'rental_item_id': doc.asset}]

    unavailable_items = []
    available_items = []

    for item in items:
        bookings = frappe.db.sql("""
            SELECT
                name, booking_status AS status, asset AS rental_item_id
            FROM
                `tabRental Booking`
            WHERE
                asset = %(rental_item_id)s
                AND name != %(current_booking_id)s
                AND booking_status IN ('Reserved', 'Picked Up', 'On Ride')
                AND (
                    start_date <= %(new_to_date)s
                    AND end_date >= %(new_from_date)s
                )
        """, {
            "current_booking_id": booking_id,
            "rental_item_id": item['rental_item_id'],
            "new_from_date": new_from_date,
            "new_to_date": new_to_date
        }, as_dict=True)

        if bookings:
            unavailable_items.append(item['rental_item_id'])
        else:
            available_items.append(item['rental_item_id'])

    # Add the lists to the response
    frappe.local.response['availability'] = {
        "available_items": available_items,
        "unavailable_items": unavailable_items
    }

    #is_gst = int(is_gst) if is_gst else 0

    # frappe.db.sql("""
    #         UPDATE `tabBooking Entry`
    #         SET custom_is_gst = %s
    #         WHERE name = %s
    # """, (is_gst, booking_id))

    # frappe.db.commit()

    if unavailable_items:
        frappe.msgprint(
            f"The following items are unavailable for the selected period: {', '.join(unavailable_items)}",
            alert=True
        )
    else:
        frappe.msgprint("All items are available for the selected period.", alert=True)

     
# @frappe.whitelist(allow_guest=True)
# def process_quotation(quotation_name, booking_entry_id):
#     try:
#         # Fetch the Quotation document
#         quotation = frappe.get_doc("Quotation", quotation_name)

#         # --- Create Sales Order ---
#         sales_order = frappe.new_doc("Sales Order")
#         sales_order.customer = quotation.party_name
#         sales_order.delivery_date = quotation.custom_rental_to_date or frappe.utils.nowdate()
#         sales_order.custom_rental_from_date = quotation.custom_rental_from_date
#         sales_order.custom_rental_to_date = quotation.custom_rental_to_date
#         sales_order.custom_actual_to_date_ = quotation.custom_actual_to_date
#         sales_order.custom_is_extension = 1        

#         # Add items from Quotation to Sales Order
#         for item in quotation.custom_rental_items:
#             sales_order.append("custom_rental_items", {
#                 "rental_item_id": item.rental_item_id,
#                 "item_name": item.item_name,
#                 "quantity": item.quantity,
#                 "pricelist_name": item.pricelist_name,
#                 "price": item.price,
#                 "amount": item.amount
#             })

#         for item in quotation.items:
#             sales_order.append("items", {
#                 "item_code": item.item_code,
#                 "qty": item.qty,
#                 "rate": item.rate,
#                 "amount": item.amount,
#                 "delivery_date": quotation.custom_rental_to_date
#             })

#         sales_order.insert(ignore_permissions=True)
#         sales_order.submit() 
#         frappe.db.commit()

#         # --- Create Sales Invoice ---
#         sales_invoice = frappe.new_doc("Sales Invoice")
#         sales_invoice.customer = quotation.party_name
#         sales_invoice.due_date = quotation.custom_rental_to_date or frappe.utils.nowdate()
#         sales_invoice.custom_rental_from_date = quotation.custom_rental_from_date
#         sales_invoice.custom_rental_to_date = quotation.custom_rental_to_date
#         sales_invoice.custom_actual_to_date_ = quotation.custom_actual_to_date
#         sales_invoice.custom_is_extended  =1  

#         # Add items from Quotation to Sales Invoice
#         for item in quotation.custom_rental_items:
#             sales_invoice.append("custom_rental_items", {
#                 "rental_item_id": item.rental_item_id,
#                 "item_name": item.item_name,
#                 "quantity": item.quantity,
#                 "pricelist_name": item.pricelist_name,
#                 "price": item.price,
#                 "amount": item.amount
#             })
            
#         for item in quotation.items:
#             sales_invoice.append("items", {
#                 "item_code": item.item_code,
#                 "qty": item.qty,
#                 "rate": item.rate,
#                 "amount": item.amount
#             })

#         sales_invoice.insert(ignore_permissions=True)

#         # --- Update Booking Entry ---
#         booking_entry = frappe.get_doc("Booking Entry", booking_entry_id)
        
#         # Update rental_from_date and actual_to_date
#         booking_entry.db_set("rental_from_date", quotation.custom_rental_from_date)
#         booking_entry.db_set("actual_to_date", quotation.custom_actual_to_date)

#         quotation_details = frappe.get_all(
#             "Booking Details",
#             filters={"parent": quotation_name},
#             fields=["rental_item_id", "quantity", "price", "amount"]
#         )

#         for booking_detail in booking_entry.rental_items:
#             matching_items = [
#                 q for q in quotation_details if q["rental_item_id"] == booking_detail.rental_item_id
#             ]
#             for item in matching_items:
#                 frappe.db.set_value(
#                     "Booking details Table",
#                     booking_detail.name,
#                     "quantity",
#                     booking_detail.quantity + item["quantity"]
#                 )
#                 frappe.db.set_value(
#                     "Booking details Table",
#                     booking_detail.name,
#                     "price",
#                     booking_detail.price + item["price"]
#                 )
#                 frappe.db.set_value(
#                     "Booking details Table",
#                     booking_detail.name,
#                     "amount",
#                     booking_detail.amount + item["amount"]
#                 )
          
#         # booking_entry.save(ignore_permissions=True)
#         frappe.db.commit()

#         frappe.msgprint(f"Sales Order {sales_order.name} and Sales Invoice {sales_invoice.name} created successfully.")
#         return {
#             "sales_order_name": sales_order.name,
#             "sales_invoice_name": sales_invoice.name
#         }

#     except Exception as e:
#         frappe.throw(f"Failed to process quotation: {str(e)}")


import frappe
from frappe.utils import nowdate, add_days, getdate

@frappe.whitelist(allow_guest=True)
def process_quotation(quotation_name, booking_entry_id):
    try:
        # -----------------------------
        # Fetch Quotation
        # -----------------------------
        quotation = frappe.get_doc("Quotation", quotation_name)

        # -----------------------------
        # Date Fix
        # -----------------------------
        transaction_date = nowdate()

        delivery_date = quotation.custom_rental_to_date
        if not delivery_date or getdate(delivery_date) <= getdate(transaction_date):
            delivery_date = add_days(transaction_date, 1)

        # -----------------------------
        # Create Sales Order
        # -----------------------------
        sales_order = frappe.new_doc("Sales Order")
        sales_order.customer = quotation.party_name
        sales_order.transaction_date = transaction_date
        sales_order.delivery_date = delivery_date

        sales_order.custom_rental_from_date = quotation.custom_rental_from_date
        sales_order.custom_rental_to_date = quotation.custom_rental_to_date
        sales_order.custom_actual_to_date_ = quotation.custom_actual_to_date
        sales_order.custom_is_extension = 1
        be = frappe.get_doc("Booking Entry", booking_entry_id)
        # Ensure taxes are loaded once (if template exists)
        # Load taxes only if not already present
        if not sales_order.taxes:
            tax_template = frappe.db.get_value(
                "Sales Taxes and Charges Template",
                {"company": sales_order.company},
                "name"
            )
            if tax_template:
                sales_order.taxes_and_charges = tax_template
                sales_order.run_method("set_taxes")  # ✅ correct method

        if sales_order.taxes:
            for tax in sales_order.taxes:
                if be.custom_is_gst:
                    tax.included_in_print_rate = 1  # ✅ CHECK
                else:
                    tax.included_in_print_rate = 0  # ❌ UNCHECK

        # Recalculate after change
        sales_order.run_method("calculate_taxes_and_totals")
        # if be.custom_is_gst:
        #     tax_template = frappe.db.get_value(
        #                 "Sales Taxes and Charges Template",
        #                 {"company": sales_order.company},
        #                 "name"
        #     )
        #     if tax_template:
        #                 sales_order.taxes_and_charges = tax_template
        #                 sales_order.run_method("set_missing_values")
        #                 sales_order.run_method("calculate_taxes_and_totals")
        # else:
        #     sales_order.taxes_and_charges = ""
        #     sales_order.set("taxes", [])
        #     sales_order.total_taxes_and_charges = 0
        #     sales_order.base_total_taxes_and_charges = 0
        #sales_order.taxes_and_charges = "Output GST In-state"  # Set taxes and charges

        # Custom Rental Items
        for item in quotation.custom_rental_items:
            sales_order.append("custom_rental_items", {
                "rental_item_id": item.rental_item_id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "pricelist_name": item.pricelist_name,
                "price": item.price,
                "amount": item.amount
            })

        # Standard Items
        for item in quotation.items:
            sales_order.append("items", {
                "item_code": item.item_code,
                "qty": item.qty,
                "rate": item.rate,
                "amount": item.amount,
                "delivery_date": delivery_date  
            })

        sales_order.insert(ignore_permissions=True)
        sales_order.submit()

        # -----------------------------
        # Create Sales Invoice
        # -----------------------------
        sales_invoice = frappe.new_doc("Sales Invoice")
        sales_invoice.customer = quotation.party_name
        sales_invoice.due_date = delivery_date

        sales_invoice.custom_rental_from_date = quotation.custom_rental_from_date
        sales_invoice.custom_rental_to_date = quotation.custom_rental_to_date
        sales_invoice.custom_actual_to_date_ = quotation.custom_actual_to_date
        sales_invoice.custom_is_extended = 1
        sales_invoice.custom_booking_entry = booking_entry_id
        #sales_invoice.taxes_and_charges = "Output GST In-state"
        # if be.custom_is_gst:
        #     tax_template = frappe.db.get_value(
        #         "Sales Taxes and Charges Template",
        #         {"company": sales_order.company},
        #         "name"
        #     )
        #     if tax_template:
        #         sales_invoice.taxes_and_charges = tax_template
        #         sales_invoice.run_method("set_missing_values")
        #         sales_invoice.run_method("calculate_taxes_and_totals")
        # else:
        #     sales_invoice.taxes_and_charges = ""
        #     sales_invoice.set("taxes", [])
        #     sales_invoice.total_taxes_and_charges = 0
        #     sales_invoice.base_total_taxes_and_charges = 0
        # Load taxes only if not already present
        if not sales_invoice.taxes:
            tax_template = frappe.db.get_value(
                "Sales Taxes and Charges Template",
                {"company": sales_invoice.company},
                "name"
            )
            if tax_template:
                sales_invoice.taxes_and_charges = tax_template
                sales_invoice.run_method("set_taxes")  # ✅ correct method

        # Toggle "Is this Tax included in Basic Rate?"
        if sales_invoice.taxes:
            for tax in sales_invoice.taxes:
                tax.included_in_print_rate = 1 if be.custom_is_gst else 0

        # Recalculate totals
        sales_invoice.run_method("calculate_taxes_and_totals")

        # Custom Rental Items
        for item in quotation.custom_rental_items:
            sales_invoice.append("custom_rental_items", {
                "rental_item_id": item.rental_item_id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "pricelist_name": item.pricelist_name,
                "price": item.price,
                "amount": item.amount
            })

        # Standard Items
        for item in quotation.items:
            sales_invoice.append("items", {
                "item_code": item.item_code,
                "qty": item.qty,
                "rate": item.rate,
                "amount": item.amount
            })

        sales_invoice.insert(ignore_permissions=True)
        sales_invoice.submit()

        # -----------------------------
        # Update Booking Entry
        # -----------------------------
        booking_entry = frappe.get_doc("Booking Entry", booking_entry_id)

        booking_entry.db_set("rental_from_date", quotation.custom_rental_from_date)
        booking_entry.db_set("rental_to_date", quotation.custom_rental_to_date)
        booking_entry.db_set("actual_to_date", quotation.custom_actual_to_date)

        quotation_details = frappe.get_all(
            "Booking Details",
            filters={"parent": quotation_name},
            fields=["rental_item_id", "quantity", "price", "amount"]
        )

        for booking_detail in booking_entry.rental_items:
            matching_items = [
                q for q in quotation_details if q["rental_item_id"] == booking_detail.rental_item_id
            ]

            for item in matching_items:
                frappe.db.set_value(
                    "Booking details Table",
                    booking_detail.name,
                    "quantity",
                    booking_detail.quantity + item["quantity"]
                )
                frappe.db.set_value(
                    "Booking details Table",
                    booking_detail.name,
                    "price",
                    booking_detail.price + item["price"]
                )
                frappe.db.set_value(
                    "Booking details Table",
                    booking_detail.name,
                    "amount",
                    booking_detail.amount + item["amount"]
                )

        frappe.db.commit()

        return {
            "message": f"Sales Order '{sales_order.name}' and Sales Invoice '{sales_invoice.name}' created successfully.",
            "sales_order_name": sales_order.name,
            "sales_invoice_name": sales_invoice.name
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Process Quotation Error")
        frappe.throw(f"Failed to process quotation: {str(e)}")
# @frappe.whitelist(allow_guest=True)
# def extend_bookings_availability(booking_id, new_to_date):
    new_to_date = get_datetime(new_to_date)  # ✅ ensures datetime
    doc = frappe.get_doc("Rental Booking", booking_id)
    new_from_date = doc.end_date
    status = doc.booking_status
    items = [{'rental_item_id': doc.asset}]

    unavailable_items = []
    available_items = []

    for item in items:
        bookings = frappe.db.sql("""
            SELECT
                name, booking_status AS status, asset AS rental_item_id
            FROM
                `tabRental Booking`
            WHERE
                asset = %(rental_item_id)s
                AND name != %(current_booking_id)s
                AND booking_status IN ('Reserved', 'Picked Up', 'On Ride')
                AND (
                    start_date <= %(new_to_date)s
                    AND end_date >= %(new_from_date)s
                )
        """, {
            "current_booking_id": booking_id,
            "rental_item_id": item['rental_item_id'],
            "new_from_date": new_from_date,
            "new_to_date": new_to_date
        }, as_dict=True)         if bookings:
#             item_statuses = [b['status'] for b in bookings]  # Get all statuses of the conflicting bookings
#             unavailable_items.append({"item_id": item['rental_item_id'], "statuses": item_statuses})
#         else:
#             available_items.append(item['rental_item_id'])

#     # Add the lists to the response
#     frappe.local.response['availability'] = {
#         "available_items": available_items,
#         "unavailable_items": unavailable_items
#     }

#     if unavailable_items:
#         unavailable_msg = ", ".join([f"{item['item_id']} ({', '.join(item['statuses'])})" for item in unavailable_items])
#         frappe.msgprint(
#             f"The following items are unavailable for the selected period: {unavailable_msg}",
#             alert=True
#         )
        
#         # Check if all unavailable items are either Reserved or Rented
#         all_statuses = {status for item in unavailable_items for status in item['statuses']}
#         if all_statuses.issubset({"Reserved", "Rented"}):
#             frappe.msgprint("All unavailable items are either Reserved or Rented.", alert=True)
        
#         # Check if all unavailable items are Reserved
#         if all_statuses == {"Reserved"}:
#             frappe.msgprint("All unavailable items are Reserved.", alert=True)
#     else:
#         frappe.msgprint("All items are available for the selected period.", alert=True)
