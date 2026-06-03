import frappe
@frappe.whitelist(allow_guest=True)
def cancel_single_booking_entry(booking_entry_name):
    """
    Cancel a single booking entry and its associated records.
    """
    result = {
        'booking_entry': booking_entry_name,
        'success': False,
        'payment_entries': []
    }
    try:
        booking_entry = frappe.get_doc('Booking Entry', booking_entry_name)
        sales_order_booking = booking_entry.sales_order

        # Check for associated payment entries
        payment_entries = frappe.get_list(
            'Payment Entry',
            filters={'custom_booking_entry': booking_entry_name},
            fields=['name', 'docstatus']
        )

        # Cancel payment entries if they exist
        # for payment_entry in payment_entries:
        #     payment_entry_doc = frappe.get_doc('Payment Entry', payment_entry['name'])
        #     if payment_entry_doc.docstatus == 1:  # Ensure it's submitted before canceling
        #         payment_entry_doc.cancel()
        #         frappe.db.set_value('Payment Entry', payment_entry['name'], 'docstatus', 2)
        #     result['payment_entries'].append({
        #         'name': payment_entry['name'],
        #         'status': 'Canceled'
        #     })

        for payment_entry in payment_entries:
            frappe.db.set_value('Payment Entry', payment_entry['name'], 'custom_booking_entry', None)
            result['payment_entries'].append({
                'name': payment_entry['name'],
                'status': 'Unlinked'
            })

        if not payment_entries:
            result['payment_entries'].append({
                'name': None,
                'status': 'No Payment Entries'
            })

        # Cancel the associated Sales Order if it exists
        if sales_order_booking:
            frappe.db.set_value('Booking Entry', booking_entry_name, 'sales_order', None)
            sales_order_doc = frappe.get_doc('Sales Order', sales_order_booking)
            sales_order_doc.cancel()
            frappe.db.set_value('Sales Order', sales_order_booking, 'docstatus', 2)

        # Reload and update booking entry status
        booking_entry = frappe.get_doc('Booking Entry', booking_entry_name)
        booking_entry.status = 'Cancelled'
        booking_entry.docstatus = 2
        booking_entry.save()
        frappe.db.commit()

        result['success'] = True
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Error canceling booking entry {booking_entry_name}")
        result['error'] = str(e)

    return result


@frappe.whitelist(allow_guest=True)
def cancel_multiple_booking_entries(booking_entry_names):
    """
    Cancel multiple booking entries by calling the single booking entry cancel function.
    """
    results = []
    for booking_entry_name in booking_entry_names:
        results.append(cancel_single_booking_entry(booking_entry_name))
    return results





# import frappe

# @frappe.whitelist(allow_guest=True)
# def cancel_booking_entry(booking_entry_name):
#     booking_entry = frappe.get_doc('Booking Entry', booking_entry_name)
#     sales_order_booking = booking_entry.sales_order
    
#     if sales_order_booking:
#         frappe.db.set_value('Booking Entry', booking_entry_name, 'sales_order', None)
#         sales_order_doc = frappe.get_doc('Sales Order', sales_order_booking)
#         sales_order_doc.cancel()
#         frappe.db.set_value('Sales Order', sales_order_booking, 'docstatus', 2)
#     booking_entry = frappe.get_doc('Booking Entry', booking_entry_name)
#     booking_entry.status = 'Returned' 
#     booking_entry.docstatus = 2  
#     booking_entry.save()
#     frappe.db.commit()

#     return True