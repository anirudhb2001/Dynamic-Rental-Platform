import frappe

@frappe.whitelist(allow_guest=True)
def create_payment_entry():
    
    booking_id = frappe.form_dict.get("booking_id")
    

    if not booking_id:
        frappe.throw("Missing required parameter: booking_id")

    booking_entry = frappe.get_doc("Booking Entry", booking_id)

    sales_invoices = frappe.get_list(
        "Sales Invoice",
        filters={"custom_booking_entry": booking_id},
        fields=["name", "outstanding_amount", "grand_total", "due_date", "customer"]
    )

    if not sales_invoices:
        frappe.throw(f"No Sales Invoices found for booking id: {booking_id}")

    total_outstanding = sum(inv["outstanding_amount"] for inv in sales_invoices)
    if total_outstanding <= 0:
        frappe.throw(f"Payment Already Done for booking id: {booking_id}")

    payment_entry = frappe.new_doc("Payment Entry")
    payment_entry.payment_type = "Receive"
    payment_entry.party_type = "Customer"
    payment_entry.party = booking_entry.customer
    payment_entry.paid_amount = total_outstanding
    payment_entry.received_amount = total_outstanding
    payment_entry.paid_to = "Cash - RAC"
    payment_entry.reference_date = frappe.utils.nowdate()

    for inv in sales_invoices:
        payment_entry.append("references", {
            "reference_doctype": "Sales Invoice",
            "reference_name": inv["name"],
            "total_amount": inv["grand_total"],
            "outstanding_amount": inv["outstanding_amount"],
            "allocated_amount": inv["outstanding_amount"]
        })

    payment_entry.flags.ignore_permissions = True
    payment_entry.flags.ignore_mandatory = True
    payment_entry.insert(ignore_permissions=True)
    frappe.db.commit()

    return payment_entry.name