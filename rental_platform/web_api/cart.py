import frappe
import json
import random
from frappe.model.document import Document
from frappe import _
from frappe.utils import getdate
from frappe.utils import now_datetime, get_datetime
from datetime import datetime

# def revert_stock(item_code, qty, stock_qty=1, warehouse="Stores - RAC"):
#     """
#     Revert stock based on stock_quantity multiplier
#     Only revert if Bin record exists (skip bundles)
#     """
#     actual_reversion = float(qty) * float(stock_qty)
    
#     # Check if item has stock tracking (Bin record exists)
#     bin_exists = frappe.db.exists("Bin", {
#         "item_code": item_code, 
#         "warehouse": warehouse
#     })
    
#     if not bin_exists:
#         # Item doesn't track stock (likely a bundle/service item)
#         frappe.logger().info(f"Skipping stock reversion for {item_code} - no Bin record")
#         return
    
#     current_stock = frappe.db.get_value(
#         "Bin",
#         {"item_code": item_code, "warehouse": warehouse},
#         "actual_qty"
#     ) or 0

#     new_qty = float(current_stock) + actual_reversion

#     frappe.db.set_value(
#         "Bin",
#         {"item_code": item_code, "warehouse": warehouse},
#         "actual_qty",
#         new_qty
#     )
    
#     frappe.logger().info(f"Reverted stock for {item_code}: {current_stock} + {actual_reversion} = {new_qty}")


@frappe.whitelist(allow_guest=True)
def create_quotation(customer=None, booking_details=None, quantity=0,
                     custom_rental_from_date=None, custom_rental_to_date=None, custom_actual_to_date=None):
    try:
        if not frappe.db.exists("Customer", customer):
            return {"error": f"Customer {customer} not found."}

        # Approval enforcement
        from rental_platform.web_api.validate import check_portal_approval_for_customer
        check_portal_approval_for_customer(customer)

        if isinstance(booking_details, str):
            try:
                booking_details = json.loads(booking_details)
            except json.JSONDecodeError:
                frappe.log_error(frappe.get_traceback(), "Invalid booking_details format")
                return {"error": "Invalid booking_details format."}

        if not isinstance(booking_details, list) or not all(isinstance(item, dict) for item in booking_details):
            return {"error": "Invalid booking_details format. Expected a list of dictionaries."}

        for item in booking_details:
            if item.get('quantity', 0) <= 0:
                return {"error": f"Item {item.get('item_name', 'unknown')} must have a quantity greater than zero."}

        existing_quotation = frappe.get_all(
            "Quotation",
            filters={"party_name": customer, "status": "Draft"},
            fields=["name"]
        )

        quotation = (
            frappe.get_doc("Quotation", existing_quotation[0]["name"])
            if existing_quotation else frappe.new_doc("Quotation")
        )
        default_company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
        if not default_company:
            default_company = frappe.db.get_value("Company", {}, "name")

        quotation.update({
            "company": default_company,
            "party_name": customer,
            "status": "Draft",
            "custom_rental_from_date": custom_rental_from_date,
            "custom_rental_to_date": custom_rental_to_date,
            "custom_actual_to_date": custom_actual_to_date
        })

        all_items = []

        for item in booking_details:
            item_found = False
            stock_quantity = item.get('stock_quantity', 1)
            for q_item in quotation.custom_rental_items:
                # Match by rental_item_id (item_code) AND serial_no to avoid merging distinct individual items
                item_match = q_item.rental_item_id == item.get('rental_item_id')
                serial_match = (q_item.get('serial_no') or "") == (item.get('serial_no') or "")
                
                if item_match and serial_match:
                    new_quantity = q_item.quantity + item.get('quantity')
                    if new_quantity < 0:
                        return {"error": f"Quantity for item {item.get('item_name')} cannot be negative."}
                    elif new_quantity == 0:
                        quotation.remove(q_item)
                    else:
                        q_item.quantity = new_quantity
                        q_item.amount = q_item.quantity * q_item.price
                        for sub_item in quotation.custom_rental_items:
                            if sub_item.get('parent_rental_item_id') == q_item.rental_item_id:
                                sub_item.quantity = sub_item.get('base_quantity', 1) * new_quantity
                                sub_item.amount = sub_item.quantity * sub_item.price
                    item_found = True
                    break

            if not item_found:
                sub_items = item.get("selected_subitems", [])
                main_item_entry = {
                    "rental_item_id": item.get('rental_item_id'),
                    "item": item.get('item') or item.get('rental_item_id'),
                    "serial_no": item.get('serial_no'),
                    "item_name": item.get('item_name'),
                    "pricelist_name": item.get('pricelist_name'),
                    "price": item.get('price'),
                    "quantity": item.get('quantity'),
                    "stock_quantity" : stock_quantity,
                    "amount": item.get('quantity') * item.get('price'),
                    "subitems": []
                }
                quotation.append("custom_rental_items", main_item_entry)

                for sub_item in sub_items:
                    sub_item_entry = next(
                        (sub for sub in quotation.custom_rental_items
                        if sub.get('rental_item_id') == sub_item["item_code"] 
                        and sub.get('parent_rental_item_id') == item.get('rental_item_id')),
                        None
                    )

                    if sub_item_entry:
                        sub_item_entry.quantity += sub_item["quantity"]
                        sub_item_entry.amount = sub_item_entry.quantity * sub_item_entry.price
                    else:
                        sub_item_entry = {
                            "rental_item_id": sub_item["item_code"],
                            "item_name": frappe.get_value("Item", sub_item["item_code"], "item_name"),
                            "pricelist_name": item.get('pricelist_name'),
                            "price": 0,
                            "quantity": sub_item["quantity"],
                            "stock_quantity" : sub_item.get('stock_quantity') if sub_item.get('stock_quantity') else 1,
                            "amount": 0,
                            "parent_rental_item_id": item.get('rental_item_id')
                        }
                        main_item_entry["subitems"].append(sub_item_entry)
                        quotation.append("custom_rental_items", sub_item_entry)

                all_items.append(main_item_entry)

        total_amount = sum(item.get('amount', 0) for item in quotation.custom_rental_items)

        # Find the Rental Services item code (item name may differ from item code)
        rental_item_code = frappe.db.get_value("Item", {"item_name": "Rental Services"}, "name")
        if not rental_item_code:
            rental_item_code = "Rental Services"  # fallback

        rental_service_item = next((i for i in quotation.items if i.item_code == rental_item_code), None)
        if rental_service_item:
            rental_service_item.rate = total_amount
        else:
            quotation.append("items", {
                "item_code": rental_item_code,
                "item_name": "Rental Services",
                "qty": 1,
                "rate": total_amount
            })
        
        total_tax_amount = sum(tax.get('tax_amount', 0) for tax in quotation.taxes)
        # -----------------------
        # STOCK DEDUCTION LOGIC
        # -----------------------
        # def deduct_stock(item_code, qty, stock_qty=1):
        #     """
        #     Deduct stock based on stock_quantity multiplier
        #     """
        #     actual_deduction = float(qty) * float(stock_qty)
            
        #     # Check if item has stock tracking (Bin record exists)
        #     bin_exists = frappe.db.exists("Bin", {
        #         "item_code": item_code, 
        #         "warehouse": "Stores - RAC"
        #     })
            
        #     if not bin_exists:
        #         # Item doesn't track stock (likely a bundle/service item)
        #         return
            
        #     current_stock = frappe.db.get_value(
        #         "Bin",
        #         {"item_code": item_code, "warehouse": "Stores - RAC"},
        #         "actual_qty"
        #     ) or 0

        #     if float(current_stock) < actual_deduction:
        #         frappe.throw(f"Insufficient stock for Item {item_code}. Available: {current_stock}, Required: {actual_deduction}")

        #     new_qty = float(current_stock) - actual_deduction

        #     frappe.db.set_value(
        #         "Bin",
        #         {"item_code": item_code, "warehouse": "Stores - RAC"},
        #         "actual_qty",
        #         new_qty
        #     )

        # # Deduct stock for ALL items (both main and sub-items)
        # # Stock will only be deducted for items that have Bin records
        # for it in quotation.custom_rental_items:
        #     stock_qty = it.get('stock_quantity', 1)
        #     deduct_stock(it.rental_item_id, it.quantity, stock_qty)

        try:
            quotation.save(ignore_permissions=True)
            frappe.db.commit()
            # return {
            #     "quotation_name": quotation.name,
            #     "custom_rental_items": all_items,
            #     "total": total_amount,
            #     "tax": total_tax_amount
            # }
            return {
                "quotation_name": quotation.name,
                "custom_rental_items": [
                    {
                        "rental_item_id": i.rental_item_id,
                        "item": i.get('item') or i.rental_item_id,
                        "serial_no": i.get('serial_no'),
                        "item_name": i.item_name,
                        "pricelist_name": i.pricelist_name,
                        "price": i.price,
                        "quantity": i.quantity,
                        "stock_quantity": i.stock_quantity,
                        "amount": i.amount,
                    }
                    for i in quotation.custom_rental_items
                ],
                "total": total_amount,
                "tax": total_tax_amount
            }
        except Exception as e:
            frappe.log_error(frappe.get_traceback(), "Save Quotation Error")
            return {"error": f"Failed to save Quotation: {str(e)}"}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Create Quotation Error")
        return {"error": f"An error occurred: {str(e)}"}


@frappe.whitelist(allow_guest=True)
def get_customer_draft_quotations(customer_name):
    if not customer_name:
        return {"error": "Customer name is required."}
    if not frappe.db.exists("Customer", customer_name):
        return {"error": f"Customer '{customer_name}' does not exist."}

    quotations = frappe.get_all(
        "Quotation",
        filters={"party_name": customer_name, "status": "Draft"},
        fields=["name", "transaction_date", "total", "status", "custom_rental_from_date", "custom_rental_to_date", "custom_actual_to_date"],
        order_by="transaction_date desc"
    )

    for quotation in quotations:
        # Fetch all rental items linked to this quotation
        custom_rental_items = frappe.get_all(
            "Booking Details",
            filters={"parent": quotation["name"]},
            fields=["rental_item_id", "item_name", "pricelist_name", "price", "quantity","stock_quantity", "amount"]
        )

        main_items = []
        processed_items = set()

        for item in custom_rental_items:
            # Check if the item is a subitem of a bundle
            subitem_of_bundle = frappe.get_all(
                "Product Bundle Item",
                filters={"item_code": item["rental_item_id"]},
                fields=["parent"]
            )

            if subitem_of_bundle:
                parent_bundle = subitem_of_bundle[0]["parent"]

                # If the parent bundle is not yet processed, add it
                if parent_bundle not in processed_items:
                    bundle_details = frappe.get_value(
                        "Item",
                        {"name": parent_bundle},
                        ["brand", "image"],
                        as_dict=True
                    )
                    
                    bundle_price = frappe.get_value(
                        "Item Price",
                        {"item_code": parent_bundle, "price_list": item["pricelist_name"]},  # Change 'pricelist' to 'price_list'
                        "price_list_rate"
                    )

                    main_items.append({
                        "rental_item_id": parent_bundle,
                        "item_name": parent_bundle,
                        "pricelist_name": item["pricelist_name"],
                        "price": bundle_price if bundle_price else 0,
                        "quantity": item["quantity"],
                        "stock_quantity": item["stock_quantity"],
                        "amount": (bundle_price if bundle_price else 0) * item["quantity"],
                        "brand": bundle_details.get("brand") if bundle_details else None,
                        "image": bundle_details.get("image") if bundle_details else None,
                        "subitems": []  # Initialize subitems here
                    })
                    processed_items.add(parent_bundle)

                # Add the sub-item to the parent bundle's subitems and update totals
                for main_item in main_items:
                    if main_item["rental_item_id"] == parent_bundle:
                        # Ensure the "subitems" key exists
                        if "subitems" not in main_item:
                            main_item["subitems"] = []

                        main_item["subitems"].append({
                            "rental_item_id": item["rental_item_id"],
                            "item_name": item["item_name"],
                            "pricelist_name": item["pricelist_name"],
                            "price": item["price"],
                            "amount": item["amount"],
                            "parent_rental_item_id": parent_bundle,
                            "parent_item_name": main_item["item_name"],
                            "doctype": "Booking Details"
                        })

                        # Update parent bundle's total price and amount
                        main_item["price"] += item["price"]
                        main_item["amount"] += item["amount"]
            else:
                # Handle individual items not part of a bundle
                if item["rental_item_id"] not in processed_items:
                    item_details = frappe.get_value(
                        "Item",
                        {"name": item["rental_item_id"]},
                        ["brand", "image"],
                        as_dict=True
                    )
                    item["brand"] = item_details.get("brand") if item_details else None
                    item["image"] = item_details.get("image") if item_details else None
                    main_items.append(item)
                    processed_items.add(item["rental_item_id"])

        # Add processed rental items to the quotation
        quotation["custom_rental_items"] = main_items

    # Return the processed quotations
    return {"quotations": quotations}



@frappe.whitelist(allow_guest=True)
def submit_quotation_without_booking(quotation_name):
    try:
        if not frappe.db.exists("Quotation", quotation_name):
            return {"error": f"Quotation '{quotation_name}' does not exist."}
        quotation = frappe.get_doc("Quotation", quotation_name)
        if quotation.docstatus != 0:
            return {"error": f"Quotation '{quotation_name}' is already submitted or in an invalid state."}
        quotation.submit()
        return {"message": f"Quotation '{quotation_name}' has been successfully submitted."}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Submit Quotation Error")
        return {"error": f"An error occurred: {str(e)}"}
        

@frappe.whitelist(allow_guest=True)
def create_sales_order_and_booking_entry(quotation_name, sales_person=None):
    try:
        if not frappe.db.exists("Quotation", quotation_name):
            return {"error": f"Quotation '{quotation_name}' does not exist."}
        
        # Fetch the Quotation
        quotation = frappe.get_doc("Quotation", quotation_name)
        
        if quotation.docstatus != 1:
            return {"error": f"Quotation '{quotation_name}' is not in a submitted state. Please submit the Quotation first."}
        
        # Fetch the Customer
        customer = frappe.db.get_value(
            "Customer",
            {"customer_name": quotation.party_name},
            ["mobile_no"],
            as_dict=True
        )
        if not customer:
            return {"error": f"No Customer found with the name '{quotation.party_name}'."}
        
        custom_mobile_number = customer.get("mobile_no") if customer else None
        
        # Create Rental Bookings
        rental_booking_names = []
        for item in quotation.custom_rental_items:
            rental_booking = frappe.new_doc("Rental Booking")
            rental_booking.customer = quotation.party_name
            #rental_booking.custom_mobile_number = custom_mobile_number  # Set mobile number if exists in Rental Booking
            if frappe.db.exists("Serial No", item.rental_item_id):
                rental_booking.serial_no = item.rental_item_id
                rental_booking.item = frappe.db.get_value("Serial No", item.rental_item_id, "item_code")
                rental_booking.item_group = frappe.db.get_value("Item", rental_booking.item, "item_group")
            elif frappe.db.exists("Item", item.rental_item_id):
                rental_booking.item = item.rental_item_id
                rental_booking.item_group = frappe.db.get_value("Item", rental_booking.item, "item_group")
            else:
                rental_booking.asset = item.rental_item_id
                asset_doc = frappe.db.get_value("Rental Asset", item.rental_item_id, "asset_category")
                if asset_doc:
                    rental_booking.rental_category = asset_doc
            rental_booking.start_date = quotation.custom_rental_from_date
            rental_booking.end_date = quotation.custom_rental_to_date
            rental_booking.booking_status = "Reserved"
            rental_booking.quotation = quotation_name
            rental_booking.rental_rate = item.price
            rental_booking.deposit_amount = 0
            rental_booking.pricelist_name = item.pricelist_name
            rental_booking.quantity = item.quantity
            rental_booking.stock_quantity = item.stock_quantity
            
            rental_booking.insert(ignore_permissions=True)
            rental_booking.submit()
            rental_booking_names.append(rental_booking.name)
        
        default_company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
        if not default_company:
            default_company = frappe.db.get_value("Company", {}, "name")
        sales_order = frappe.new_doc("Sales Order")
        sales_order.company = default_company
        sales_order.customer = quotation.party_name
        sales_order.delivery_date = quotation.custom_rental_to_date or frappe.utils.nowdate()
        sales_order.custom_rental_from_date = quotation.custom_rental_from_date
        sales_order.custom_rental_to_date_ = quotation.custom_rental_to_date
        sales_order.custom_actual_to_date_ = quotation.custom_actual_to_date
        # custom_booking_entry links to Booking Entry doctype (not Rental Booking) — skip to avoid LinkValidationError
        # sales_order.custom_booking_entry = ", ".join(rental_booking_names)
        
        # Update Sales Order link in Rental Bookings
        for rb_name in rental_booking_names:
            frappe.db.set_value("Rental Booking", rb_name, "sales_order", sales_order.name)
        tax_template = frappe.db.get_value(
            "Sales Taxes and Charges Template",
            {"company": sales_order.company},
            "name"
        )

        if tax_template:
            sales_order.taxes_and_charges = tax_template
            
        sales_order.run_method("set_missing_values")
        sales_order.run_method("calculate_taxes_and_totals")
        
        # Add items to Sales Order
        for item in quotation.custom_rental_items:
            sales_order.append("custom_rental_items", {
                "rental_item_id": item.rental_item_id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "stock_quantity": item.stock_quantity,
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
        
        # Add sales person to the Sales Team child table
        if sales_person:
            sales_order.append("sales_team", {
                "sales_person": sales_person,
                "allocated_percentage": 100  # Optional: Adjust percentage as required
            })
        
        sales_order.insert(ignore_permissions=True)
        sales_order.submit()
        
        return {
            "message": f"Quotation '{quotation_name}' and Sales Order '{sales_order.name}' created, and Rental Bookings '{', '.join(rental_booking_names)}' created successfully.",
            "quotation_name": quotation.name,
            "sales_order_name": sales_order.name,
            "rental_booking_names": rental_booking_names
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Create Sales Order and Booking Entry Error")
        return {"error": f"An error occurred: {str(e)}"}



@frappe.whitelist(allow_guest=True)
def delete_quotation(customer):
    if not customer:
        return {"error": "Customer is required to clear the cart and delete the quotation."}

    try:
        if not frappe.db.exists("Customer", customer):
            return {"error": f"Customer '{customer}' does not exist."}

        quotations = frappe.get_all(
            "Quotation",
            filters={"party_name": customer, "status": "Draft"},
            fields=["name"],
            order_by="creation desc"
        )

        if not quotations:
            return {"message": f"No draft quotations found for Customer '{customer}'."}

        for q in quotations:
            quotation = frappe.get_doc("Quotation", q["name"])

            # safety check – only re-add stock for draft docs
            # if quotation.docstatus == 0:
            #     for it in quotation.custom_rental_items:
            #         # add stock back
            #         revert_stock(it.rental_item_id, it.quantity)

            frappe.delete_doc("Quotation", quotation.name, ignore_permissions=True)

        frappe.db.commit()
        return {"success": f"All draft quotations for Customer '{customer}' have been deleted successfully."}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Clear Cart and Delete Quotation Error")
        return {"error": f"An error occurred: {str(e)}"}


@frappe.whitelist(allow_guest=True)
def submit_and_create_sales_order_booking(quotation_name, sales_person=None, is_inclusive_tax=False):
    try:
        if not frappe.db.exists("Quotation", quotation_name):
            return {"error": f"Quotation '{quotation_name}' does not exist."}
        quotation = frappe.get_doc("Quotation", quotation_name)

        # Approval enforcement
        from rental_platform.web_api.validate import check_portal_approval_for_customer
        check_portal_approval_for_customer(quotation.party_name)

        # If the quotation is not submitted yet, submit it.
        if quotation.docstatus == 0:
            quotation.flags.ignore_permissions = True
            quotation.submit()
        
        # Proceed with creating the sales order and booking entry
        default_company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
        if not default_company:
            default_company = frappe.db.get_value("Company", {}, "name")
        sales_order = frappe.new_doc("Sales Order")
        sales_order.company = default_company
        sales_order.customer = quotation.party_name
        sales_order.delivery_date = quotation.custom_rental_to_date or frappe.utils.nowdate()
        sales_order.custom_pickup_from_date = quotation.custom_rental_from_date
        sales_order.custom_rental_from_date = quotation.custom_rental_from_date
        sales_order.custom_rental_to_date = quotation.custom_rental_to_date
        sales_order.custom_actual_to_date = quotation.custom_actual_to_date
        #sales_order.taxes_and_charges = "Output GST In-state"
        tax_template = frappe.db.get_value(
            "Sales Taxes and Charges Template",
            {"company": sales_order.company},
            "name"
        )

        if tax_template:
            sales_order.taxes_and_charges = tax_template
            
        #sales_order.run_method("set_missing_values")
        sales_order.run_method("calculate_taxes_and_totals")
        
        if is_inclusive_tax:
            if sales_order.taxes:
                for tax in sales_order.taxes:
                    tax.included_in_print_rate = 1
        else:
            if sales_order.taxes:
                for tax in sales_order.taxes:
                    tax.included_in_print_rate = 0

        # Add items from Quotation to Sales Order
        for item in quotation.custom_rental_items:
            sales_order.append("custom_rental_items", {
                "rental_item_id": item.rental_item_id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "stock_quantity": item.stock_quantity,
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

        # Add sales_person and total_allocated_percentage to sales_team child table
        if sales_person:
            sales_order.append("sales_team", {
                "sales_person": sales_person,
                "allocated_percentage": 100  # Set to 100 directly
            })

        sales_order.insert(ignore_permissions=True)

        # Create Rental Bookings
        rental_booking_names = []
        for item in quotation.custom_rental_items:
            rental_booking = frappe.new_doc("Rental Booking")
            rental_booking.customer = quotation.party_name
            if frappe.db.exists("Serial No", item.rental_item_id):
                rental_booking.serial_no = item.rental_item_id
                rental_booking.item = frappe.db.get_value("Serial No", item.rental_item_id, "item_code")
                rental_booking.item_group = frappe.db.get_value("Item", rental_booking.item, "item_group")
            elif frappe.db.exists("Item", item.rental_item_id):
                rental_booking.item = item.rental_item_id
                rental_booking.item_group = frappe.db.get_value("Item", rental_booking.item, "item_group")
            else:
                rental_booking.asset = item.rental_item_id
                asset_doc = frappe.db.get_value("Rental Asset", item.rental_item_id, "asset_category")
                if asset_doc:
                    rental_booking.rental_category = asset_doc
            rental_booking.start_date = quotation.custom_rental_from_date
            rental_booking.end_date = quotation.custom_rental_to_date
            rental_booking.booking_status = "Reserved"
            rental_booking.quotation = quotation_name
            rental_booking.sales_order = sales_order.name
            rental_booking.rental_rate = item.price
            rental_booking.deposit_amount = 0
            rental_booking.pricelist_name = item.pricelist_name
            rental_booking.quantity = item.quantity
            rental_booking.stock_quantity = item.stock_quantity
            rental_booking.insert(ignore_permissions=True)
            rental_booking.submit()

            # --- Notification Trigger: Admin Booking ---
            try:
                from rental_platform.web_api.notification import create_admin_notification, create_notification
                create_admin_notification(
                    title="New Booking",
                    message=f"{quotation.party_name} booked {item.item_name}",
                    notification_type="Booking",
                    reference_doctype="Rental Booking",
                    reference_name=rental_booking.name,
                    priority="High",
                )
            except Exception:
                frappe.log_error(frappe.get_traceback(), "Admin Booking Notification Error")

            # --- Notification Trigger: Customer Booking Confirmation ---
            try:
                from rental_platform.web_api.notification import create_notification
                customer_mobile = frappe.db.get_value("Customer", quotation.party_name, "mobile_no")
                customer_user = frappe.db.get_value("User", {"mobile_no": customer_mobile}, "name") if customer_mobile else None
                create_notification(
                    title="Booking Confirmed",
                    message=f"Your booking for {item.item_name} has been confirmed",
                    notification_type="Booking Confirmation",
                    customer=quotation.party_name,
                    user=customer_user,
                    reference_doctype="Rental Booking",
                    reference_name=rental_booking.name,
                    priority="High",
                )
            except Exception:
                frappe.log_error(frappe.get_traceback(), "Customer Booking Notification Error")

            rental_booking_names.append(rental_booking.name)

        # custom_booking_entry links to Booking Entry doctype (not Rental Booking) — skip to avoid LinkValidationError
        # sales_order.custom_booking_entry = ", ".join(rental_booking_names)
        sales_order.flags.ignore_permissions = True
        sales_order.submit()

        return {
            "message": f"Quotation '{quotation_name}' submitted, and Sales Order '{sales_order.name}' & Rental Bookings '{', '.join(rental_booking_names)}' created successfully.",
            "quotation_name": quotation.name,
            "sales_order_name": sales_order.name,
            "rental_booking_names": rental_booking_names
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Submit and Create Sales Order and Booking Error")
        return {"error": f"An error occurred: {str(e)}"}


@frappe.whitelist(allow_guest=True)
def get_sales_persons():
    try:
        sales_persons = frappe.get_all("Sales Person", fields=["sales_person_name"])
        return {"sales_persons": sales_persons}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Error while fetching Sales Persons"))
        return {"error": str(e)}

def send_sms(mobile_no, message):
    print(f"Sending SMS to {mobile_no}: {message}")


@frappe.whitelist(allow_guest=True)
def generate_otp(customer):
    import random  # Ensure this is imported

    # Fetch Customer Document
    customer_doc = frappe.get_doc("Customer", customer)
    if not customer_doc.mobile_no:
        frappe.throw("Customer does not have a registered mobile number.")
    
    # Fetch Total Amount from the Latest Quotation (considering both Draft and Submitted)
    quotation = frappe.db.sql(
        """
        SELECT base_total 
        FROM `tabQuotation`
        WHERE party_name = %s
        ORDER BY creation DESC
        LIMIT 1
        """,
        customer,
        as_dict=True
    )
    
    if not quotation:
        frappe.throw(f"No Quotation found for customer: {customer}")
    
    latest_total = quotation[0].base_total

    # Generate 4-digit OTP
    otp = random.randint(1000, 9999)
    
    # Create OTP Verification Document
    otp_doc = frappe.new_doc("OTP Verification")
    otp_doc.custom_customer_name = customer_doc.name  # Set custom customer name
    otp_doc.phone = customer_doc.mobile_no  # Populate mandatory phone field
    otp_doc.otp = otp
    otp_doc.time = now_datetime()
    otp_doc.custom_total_amount = latest_total  # Add total amount to custom_total_amount field
    # otp_doc.custom_sms_type = "Order Confirmation"  # Set the custom_sms_type to "Order Confirmation"
    otp_doc.insert(ignore_permissions=True)

    # Log and Send OTP (SMS disabled for testing)
    # frappe.logger().info(f"Generated OTP: {otp} for customer {customer_doc.name}")
    # send_sms(customer_doc.mobile_no, f"Your OTP is {otp}. Quotation Amount: {latest_total}")

    # Return a consistent JSON response for the frontend
    return {
        "message": "OTP generated (SMS disabled)",
        "phone": customer_doc.mobile_no,
        "otp": str(otp),
    }




def time_diff_in_seconds(start_time, end_time):
    """Calculate the difference in seconds between two datetime objects."""
    if not start_time or not end_time:
        return 0
    time_difference = end_time - start_time
    return time_difference.total_seconds()

@frappe.whitelist(allow_guest=True)
def validate_otp(customer, entered_otp):
    # Fetch the customer document
    customer_doc = frappe.get_doc("Customer", customer)
    if not customer_doc.mobile_no:
        frappe.throw("Customer does not have a registered mobile number.")

    # Fetch the latest OTP Verification document for this customer
    otp_verification = frappe.get_all(
        "OTP Verification",
        filters={"phone": customer_doc.mobile_no},
        fields=["otp", "time"],
        order_by="time desc",
        limit=1,
    )

    if not otp_verification:
        frappe.throw("No OTP found for this customer.")

    # Validate the entered OTP
    stored_otp = otp_verification[0].get("otp")
    if str(entered_otp) != str(stored_otp):
        frappe.throw("Invalid OTP. Please try again.")
    
    otp_time_str = otp_verification[0].get("time")
    otp_time = get_datetime(otp_time_str)  

    if (now_datetime() - otp_time).total_seconds() > 300:  
        frappe.throw("OTP has expired. Please generate a new one.")

    # Return success message as JSON to match frontend expectations
    return {"message": "OTP validation successful!", "verified": True}


@frappe.whitelist()
def update_booking_entry_from_quotation(booking_entry_id, quotation_id):
    # Fetch the Booking Entry document
    booking_entry = frappe.get_doc("Booking Entry", booking_entry_id)

    # Fetch the Booking details child table from the Quotation
    quotation_details = frappe.get_all(
        "Booking Details",  # Quotation child table
        filters={'parent': quotation_id},
        fields=['rental_item_id', 'quantity', 'price', 'amount','stock_quantity']
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

    # Optionally update the parent document's modified timestamp
    # frappe.db.set_value(
    #     "Booking Entry",
    #     booking_entry_id,
    #     "modified",
    #     frappe.utils.now()
    # )

    # Commit the changes
    frappe.db.commit()

    frappe.msgprint(f"Booking Entry {booking_entry_id} updated successfully with values from Quotation {quotation_id}.")


@frappe.whitelist(allow_guest=True)
def update_cart_dates(customer, custom_rental_from_date, custom_rental_to_date, custom_actual_to_date):
    try:
        from rental_platform.rental_platform.qty_basedon_pricelist import qty_return
        
        existing_quotations = frappe.get_all(
            "Quotation",
            filters={"party_name": customer, "status": "Draft"},
            fields=["name"]
        )

        if not existing_quotations:
            return {"message": "No cart items found."}

        quotation = frappe.get_doc("Quotation", existing_quotations[0].name)
        
        quotation.custom_rental_from_date = custom_rental_from_date
        quotation.custom_rental_to_date = custom_rental_to_date
        quotation.custom_actual_to_date = custom_actual_to_date

        for item in quotation.custom_rental_items:
            # We need to fetch the rate using qty_return or similar logic
            qty_return(item.rental_item_id, item.pricelist_name, custom_rental_from_date, custom_actual_to_date)
            
            if 'the quantity' in frappe.local.response and 'the total rate' in frappe.local.response:
                item.quantity = frappe.local.response.get('the quantity')
                item.amount = frappe.local.response.get('the total rate')
                # Optional: clean up frappe.local.response so it doesn't return unnecessary data
                del frappe.local.response['the quantity']
                del frappe.local.response['the total rate']
                if 'rate' in frappe.local.response:
                    del frappe.local.response['rate']
                if 'actual_hours' in frappe.local.response:
                    del frappe.local.response['actual_hours']
                if 'valid_hour' in frappe.local.response:
                    del frappe.local.response['valid_hour']

        quotation.save(ignore_permissions=True)
        frappe.db.commit()

        return {"message": "Cart updated successfully"}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Update Cart Dates Error")
        return {"error": f"An error occurred: {str(e)}"}

@frappe.whitelist(allow_guest=True)
def debug_booking():
    bookings = frappe.db.sql("""
        SELECT name, asset, booking_status, start_date, end_date, quantity, docstatus 
        FROM `tabRental Booking`
        ORDER BY creation DESC LIMIT 5
    """, as_dict=True)
    return bookings

@frappe.whitelist(allow_guest=True)
def debug_assets():
    assets = frappe.db.sql("""
        SELECT name, asset_name, custom_stock_qty
        FROM `tabRental Asset`
        WHERE name IN ('Honda Activa', 'Steelbird Supra', 'ACTIVA-001', 'SUPRA-001') OR asset_name IN ('Honda Activa', 'Steelbird Supra')
    """, as_dict=True)
    return assets

@frappe.whitelist(allow_guest=True)
def debug_availability():
    from rental_platform.rental_platform.available_item import get_item_availability
    return get_item_availability("2026-06-06 10:00:00", "2026-06-07 10:00:00")

@frappe.whitelist(allow_guest=True)
def debug_availability_print():
    import json
    from rental_platform.rental_platform.available_item import get_item_availability
    res = get_item_availability("2026-06-06 10:00:00", "2026-06-07 10:00:00")
    print(json.dumps(res, indent=2))

@frappe.whitelist(allow_guest=True)
def debug_availability_print2():
    import json
    from rental_platform.rental_platform.available_item import get_item_availability
    get_item_availability("2026-06-06 10:00:00", "2026-06-07 10:00:00")
    print(json.dumps(frappe.response, indent=2))

@frappe.whitelist(allow_guest=True)
def debug_booking_flow():
    import json
    from rental_platform.rental_platform.available_item import get_item_availability

    frappe.response.clear()
    frappe.response["total items"] = []

    res1 = get_item_availability("2026-06-20 10:00:00", "2026-06-22 10:00:00")
    print("BEFORE BOOKING:")
    for x in frappe.response.get("total items", []):
        if x["item_id"] == "Honda Activa":
            print(json.dumps(x, indent=2))
            break

    # Simulate booking
    rb = frappe.new_doc("Rental Booking")
    rb.asset = "Honda Activa"
    rb.booking_status = "Reserved"
    rb.start_date = "2026-06-20 10:00:00"
    rb.end_date = "2026-06-21 10:00:00"
    rb.quantity = 1
    rb.insert(ignore_permissions=True)

    frappe.response.clear()
    frappe.response["total items"] = []

    res2 = get_item_availability("2026-06-20 10:00:00", "2026-06-22 10:00:00")
    print("AFTER BOOKING (same dates):")
    for x in frappe.response.get("total items", []):
        if x["item_id"] == "Honda Activa":
            print(json.dumps(x, indent=2))
            break

@frappe.whitelist(allow_guest=True)
def debug_no_dates():
    import json
    from rental_platform.rental_platform.available_item import get_item_availability

    frappe.response.clear()
    frappe.response["total items"] = []

    get_item_availability("", "")
    print("NO DATES PASSED:")
    for x in frappe.response.get("total items", []):
        if x["item_id"] == "Honda Activa":
            print(json.dumps(x, indent=2))
            break
