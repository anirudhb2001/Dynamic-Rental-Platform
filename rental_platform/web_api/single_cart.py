
import frappe
from frappe import _
#new api
@frappe.whitelist(allow_guest=True)
def single_cart(customer=None, itemsToDelete=None):
    if not customer or not itemsToDelete:
        frappe.throw(_("Missing required arguments"))

    try:
        itemsToDelete = frappe.parse_json(itemsToDelete)  # Convert JSON to Python list

        # Fetch the latest draft quotation for the customer
        quotation = frappe.get_all(
            "Quotation",
            filters={"party_name": customer, "docstatus": 0},
            fields=["name"],
            order_by="creation desc",
            limit_page_length=1
        )

        if not quotation:
            frappe.throw(f"No draft quotation found for customer '{customer}'.")

        quotation_name = quotation[0]["name"]
        quotation_doc = frappe.get_doc("Quotation", quotation_name)
        rental_items = quotation_doc.get("custom_rental_items", [])
        removed_item_amount = 0

        # Iterate over all items to delete
        for item in itemsToDelete:
            rental_item_id = item.get("rental_item_id")
            is_subitem = item.get("isSubitem", False)

            # Find and remove item
            # for rental_item in rental_items:
            #     if rental_item.rental_item_id == rental_item_id:
            #         removed_item_amount += rental_item.price  # Sum up removed item prices
            #         quotation_doc.custom_rental_items.remove(rental_item)
            #         break

            for rental_item in rental_items:
                if rental_item.rental_item_id == rental_item_id:
                    removed_item_amount += rental_item.price * rental_item.quantity  # Consider full quantity
                    quotation_doc.custom_rental_items.remove(rental_item)

        # Update grand total and other amounts
        # quotation_doc.grand_total = max(0, quotation_doc.grand_total - removed_item_amount)
        # quotation_doc.total = max(0, quotation_doc.total - removed_item_amount)

        quotation_doc.total = sum(item.amount for item in quotation_doc.items)  # Recalculate total
        quotation_doc.grand_total = max(0, quotation_doc.total)  # Avoid negative totals


        # Remove "Rental Services" if total is zero
        # for item in quotation_doc.items:
        #     if item.item_code == "Rental Services":
        #         item.amount -= removed_item_amount
        #         item.rate = item.amount
        #         if item.amount <= 0:
        #             quotation_doc.items.remove(item)
        #         break
        for item in quotation_doc.items:
            if item.item_code == "Rental Services":
                item.amount = sum(rental_item.price * rental_item.quantity for rental_item in quotation_doc.custom_rental_items)
                item.rate = item.amount
                if item.amount <= 0:
                    quotation_doc.items.remove(item)
                break

        if not quotation_doc.get("custom_rental_items"):
            quotation_doc.docstatus = 1 
         

        # Ensure at least one Rental Services entry remains
        if not quotation_doc.get("items"):
            quotation_doc.append("items", {
                "item_code": "Rental Services",
                "qty": 1,
                "rate": 0,
                "amount": 0,
                "description": "Rental Services"
            })

        quotation_doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status": "success",
            "message": f"Items removed successfully from Quotation '{quotation_name}'.",
            "grand_total": float(quotation_doc.grand_total),
            "total": float(quotation_doc.total),
            "removed_item_amount": float(removed_item_amount),
        }

    except frappe.DoesNotExistError:
        frappe.throw("Quotation not found.")
    except Exception as e:
        frappe.throw(f"An error occurred: {str(e)}")



