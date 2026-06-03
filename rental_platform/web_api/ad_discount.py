
import frappe
@frappe.whitelist(allow_guest=True)
def update_additional_discount(quotation_name, additional_discount_percentage=None, additional_discount_amount=None):
    quotation = frappe.get_doc("Quotation", quotation_name)

    if quotation.docstatus != 0:
        frappe.throw("Discounts can only be applied when the status is Draft.")

    # Always reset grand_total to original before applying any new discount
    original_total = quotation.total or quotation.base_total or quotation.net_total or quotation.base_net_total
    if not original_total:
        frappe.throw("Original total not found for this quotation.")

    # Reset grand total and discount fields
    quotation.grand_total = original_total
    quotation.discount_amount = 0
    quotation.additional_discount_percentage = 0

    additional_discount_percentage = float(additional_discount_percentage) if additional_discount_percentage else None
    additional_discount_amount = float(additional_discount_amount) if additional_discount_amount else None

    if additional_discount_percentage is not None:
        discount_amount = original_total * (additional_discount_percentage / 100)
        quotation.additional_discount_percentage = additional_discount_percentage
        quotation.discount_amount = discount_amount
        quotation.grand_total = original_total - discount_amount

    elif additional_discount_amount is not None:
        quotation.discount_amount = additional_discount_amount
        quotation.grand_total = original_total - additional_discount_amount

    else:
        frappe.throw("Please provide a valid discount value.")

    quotation.flags.ignore_permissions = True
    quotation.save()
    frappe.db.commit()

    return {
        "message": "Quotation updated successfully.",
        "grand_total": quotation.grand_total
    }



