import frappe

def before_insert(doc, method):
    apply_gst_logic(doc)

def apply_gst_logic(doc):
    if not doc.items:
        return

    booking_entry = doc.custom_booking_entry
    if not booking_entry:
        return

    is_gst = frappe.db.get_value(
        "Booking Entry",
        booking_entry,
        "custom_is_gst"
    )

    # If taxes table is empty, load from template once
    if not doc.taxes and doc.taxes_and_charges:
        doc.set_taxes()

    if doc.taxes:
        for tax in doc.taxes:
            if is_gst:
                tax.included_in_print_rate = 1  # ✅ CHECK
            else:
                tax.included_in_print_rate = 0  # ❌ UNCHECK
# def apply_gst_logic(doc):
#     if not doc.items:
#         return

#     # Get Booking Entry directly from SI
#     booking_entry = doc.custom_booking_entry

#     if not booking_entry:
#         return

#     # Check GST flag
#     is_gst = frappe.db.get_value(
#         "Booking Entry",
#         booking_entry,
#         "custom_is_gst"
#     )

#     if is_gst:
#         tax_template = frappe.db.get_value(
#             "Sales Taxes and Charges Template",
#             {"company": doc.company},
#             "name"
#         )

#         if tax_template:
#             doc.taxes_and_charges = tax_template
#             doc.set_taxes()
#     else:
#         # Clear taxes
#         doc.taxes_and_charges = None
#         doc.taxes = []