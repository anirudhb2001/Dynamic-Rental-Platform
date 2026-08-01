import frappe
from frappe.model.document import Document
from frappe import _

class BookingEntry(Document):
    def validate(self):
        self.check_availability()
        
    def check_availability(self):
        if not self.venue or not self.event_date or not self.time_slot:
            return
            
        existing = frappe.db.get_value(
            "Booking Entry",
            {
                "venue": self.venue,
                "event_date": self.event_date,
                "time_slot": self.time_slot,
                "status": ["!=", "Cancelled"],
                "name": ["!=", self.name]
            },
            "name"
        )
        
        if existing:
            frappe.throw(_("Venue {0} is already booked on {1} for the selected time slot (Booking: {2}).").format(self.venue, self.event_date, existing))

    def on_cancel(self):
        self._cancel_linked_sales_order()
        self._cancel_linked_quotation()

    def _cancel_linked_sales_order(self):
        if self.sales_order and frappe.db.get_value("Sales Order", self.sales_order, "docstatus") == 1:
            self._safe_cancel("Sales Order", self.sales_order)

    def _cancel_linked_quotation(self):
        if self.quotation and frappe.db.get_value("Quotation", self.quotation, "docstatus") == 1:
            self._safe_cancel("Quotation", self.quotation)

    @staticmethod
    def _safe_cancel(doctype, name):
        try:
            doc = frappe.get_doc(doctype, name)
            doc.flags.ignore_permissions = True
            doc.cancel()
            frappe.msgprint(_("Cancelled linked {0}: {1}").format(doctype, name), alert=True)
        except Exception as e:
            frappe.log_error(frappe.get_traceback(), f"Cancel {doctype} {name}")
            frappe.throw(_("Could not cancel {0} {1}: {2}").format(doctype, name, e))

@frappe.whitelist()
def cancel_booking_entry(booking_id):
    """
    Cancel a booking entry and its associated Sales Order and Quotation.
    """
    result = {
        'booking_entry': booking_id,
        'success': False,
        'sales_order': None,
        'quotation': None
    }

    try:
        booking = frappe.get_doc('Booking Entry', booking_id)
        sales_order = booking.sales_order
        quotation = booking.quotation
        
        if sales_order:
            frappe.db.set_value('Booking Entry', booking_id, 'sales_order', None)
        if quotation:
            frappe.db.set_value('Booking Entry', booking_id, 'quotation', None)

        frappe.db.commit()  

        if sales_order:
            try:
                sales_order_doc = frappe.get_doc('Sales Order', sales_order)
                if sales_order_doc.docstatus == 1:  
                    sales_order_doc.cancel()
                    result['sales_order'] = {'name': sales_order, 'status': 'Cancelled'}
                else:
                    result['sales_order'] = {'name': sales_order, 'status': 'Not Submitted / Already Cancelled'}
            except Exception as e:
                frappe.log_error(frappe.get_traceback(), f"Error cancelling Sales Order {sales_order}")
                result['sales_order'] = {'name': sales_order, 'status': f'Error: {e}'}

        if quotation:
            try:
                quotation_doc = frappe.get_doc('Quotation', quotation)
                if quotation_doc.docstatus == 1: 
                    result['quotation'] = {'name': quotation, 'status': 'Open'}
                else:
                    result['quotation'] = {'name': quotation, 'status': 'Not Submitted / Already Cancelled'}
            except Exception as e:
                frappe.log_error(frappe.get_traceback(), f"Error cancelling Quotation {quotation}")
                result['quotation'] = {'name': quotation, 'status': f'Error: {e}'}

        booking.reload()
        booking.status = 'Cancelled'
        booking.docstatus = 2
        booking.save(ignore_permissions=True)

        frappe.db.commit()

        if sales_order:
            frappe.db.set_value('Booking Entry', booking_id, 'sales_order', sales_order)
        if quotation:
            frappe.db.set_value('Booking Entry', booking_id, 'quotation', quotation)
        result['success'] = True

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Error cancelling booking entry {booking_id}")
        result['error'] = str(e)

    return result
