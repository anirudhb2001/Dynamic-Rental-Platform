import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import getdate

def check_venue_availability_logic(venue, event_date, time_slot, exclude_booking_name=None):
    # Check original Booking Entries
    filters = {
        "venue": venue,
        "event_date": event_date,
        "time_slot": time_slot,
        "status": ["!=", "Cancelled"]
    }
    if exclude_booking_name:
        filters["name"] = ["!=", exclude_booking_name]
        
    existing = frappe.db.get_value("Booking Entry", filters, "name")
    if existing:
        return existing
        
    # Check Reservation Extensions
    ext_query = """
        SELECT parent 
        FROM `tabReservation Extension` 
        WHERE extension_date = %s 
          AND time_slot = %s 
          AND status != 'Cancelled' 
          AND parenttype = 'Booking Entry'
          AND parent IN (SELECT name FROM `tabBooking Entry` WHERE venue = %s AND status != 'Cancelled')
    """
    params = [event_date, time_slot, venue]
    if exclude_booking_name:
        ext_query += " AND parent != %s"
        params.append(exclude_booking_name)
        
    ext_existing = frappe.db.sql(ext_query, tuple(params))
    if ext_existing:
        return ext_existing[0][0]
        
    return None

class BookingEntry(Document):
    def validate(self):
        self.check_availability()
        
    def check_availability(self):
        if self.venue and self.seating_type and self.guest_count:
            capacity = frappe.db.get_value("Venue Seating Capacity", {"parent": self.venue, "seating_type": self.seating_type}, "capacity")
            if capacity and int(self.guest_count) > int(capacity):
                frappe.throw(_("Guest count {0} exceeds the {1} capacity of {2} for {3}.").format(self.guest_count, self.seating_type, capacity, self.venue))
        elif self.guest_count and self.venue_capacity and int(self.guest_count) > int(self.venue_capacity):
            frappe.throw(_("Guest count ({0}) exceeds venue capacity ({1}).").format(self.guest_count, self.venue_capacity))

        if not self.venue or not self.event_date or not self.time_slot:
            return
            
        existing = check_venue_availability_logic(self.venue, self.event_date, self.time_slot, self.name)
        if existing:
            frappe.throw(_("Venue {0} is already booked on {1} for the selected time slot (Booking: {2}).").format(self.venue, self.event_date, existing))

        # Check child table extensions to ensure they don't overlap with other bookings
        if self.get("reservation_extensions"):
            for ext in self.get("reservation_extensions"):
                if ext.status != 'Cancelled' and ext.extension_date and ext.time_slot:
                    ext_existing = check_venue_availability_logic(self.venue, ext.extension_date, ext.time_slot, self.name)
                    if ext_existing:
                        frappe.throw(_("Venue {0} is already booked on {1} for the selected time slot (Booking: {2}).").format(self.venue, ext.extension_date, ext_existing))

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
def check_venue_availability(venue, event_date, time_slot, exclude_booking_name=None):
    existing = check_venue_availability_logic(venue, event_date, time_slot, exclude_booking_name)
    if existing:
        return {"available": False, "conflicting_booking": existing}
    return {"available": True}

@frappe.whitelist()
def create_venue_reservation(customer, venue, event_type, event_date, time_slot, hotel_property=None, seating_type=None, guest_count=0, special_instructions=""):
    # 1. Validation
    if not customer or not venue or not event_date or not time_slot or not event_type:
        frappe.throw(_("Customer, Venue, Event Type, Event Date, and Time Slot are required."))
        
    # Check availability
    conflict = check_venue_availability_logic(venue, event_date, time_slot)
    if conflict:
        frappe.throw(_("Venue {0} is already booked on {1} for the selected time slot (Booking: {2}).").format(venue, event_date, conflict))
        
    try:
        # Create Sales Order
        default_company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company") or frappe.db.get_value("Company", {}, "name")
        item_price = frappe.db.get_value("Item Price", {"item_code": venue, "price_list": "Standard Selling"}, "price_list_rate") or 0.0

        so = frappe.new_doc("Sales Order")
        so.company = default_company
        so.customer = customer
        so.delivery_date = event_date
        so.append("items", {
            "item_code": venue,
            "qty": 1,
            "rate": item_price,
            "delivery_date": event_date
        })
        so.run_method("set_missing_values")
        so.run_method("calculate_taxes_and_totals")
        so.insert(ignore_permissions=True)
        so.submit()

        # Create Booking Entry
        be = frappe.new_doc("Booking Entry")
        be.customer = customer
        if hotel_property:
            be.hotel_property = hotel_property
        be.venue = venue
        be.event_type = event_type
        be.event_date = event_date
        be.time_slot = time_slot
        if seating_type:
            be.seating_type = seating_type
        be.guest_count = guest_count
        be.special_instructions = special_instructions
        be.status = "Reserved"
        be.sales_order = so.name
        
        be.insert(ignore_permissions=True)
        be.submit()

        return {
            "success": True,
            "booking_name": be.name,
            "sales_order_name": so.name
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Create Venue Reservation Error")
        frappe.throw(_("Failed to create reservation: {0}").format(str(e)))

@frappe.whitelist()
def extend_venue_reservation(booking_name, extension_date, time_slot, amount=None, notes=""):
    try:
        be = frappe.get_doc("Booking Entry", booking_name)
        
        conflict = check_venue_availability_logic(be.venue, extension_date, time_slot, booking_name)
        if conflict:
            frappe.throw(_("Venue {0} is already booked on {1} for the selected time slot (Booking: {2}).").format(be.venue, extension_date, conflict))
            
        default_company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company") or frappe.db.get_value("Company", {}, "name")
        item_price = amount if amount is not None else (frappe.db.get_value("Item Price", {"item_code": be.venue, "price_list": "Standard Selling"}, "price_list_rate") or 0.0)

        so = frappe.new_doc("Sales Order")
        so.company = default_company
        so.customer = be.customer
        so.delivery_date = extension_date
        so.append("items", {
            "item_code": be.venue,
            "qty": 1,
            "rate": item_price,
            "amount": item_price,
            "delivery_date": extension_date
        })
        so.run_method("set_missing_values")
        so.run_method("calculate_taxes_and_totals")
        so.insert(ignore_permissions=True)
        so.submit()

        be.append("reservation_extensions", {
            "extension_date": extension_date,
            "time_slot": time_slot,
            "sales_order": so.name,
            "amount": so.grand_total,
            "notes": notes,
            "status": "Reserved"
        })
        be.flags.ignore_validate = True
        be.save(ignore_permissions=True)
        
        return {
            "success": True,
            "sales_order_name": so.name
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Extend Venue Reservation Error")
        frappe.throw(_("Failed to extend reservation: {0}").format(str(e)))

@frappe.whitelist()
def get_venues(hotel_property=None):
    filters = {"is_venue": 1}
    if hotel_property:
        filters["hotel_property"] = hotel_property
        
    venues = frappe.get_all("Item", filters=filters, fields=["name", "item_name", "hotel_property", "venue_size", "venue_size_unit", "venue_description", "venue_image", "venue_status", "venue_capacity"])
    
    for v in venues:
        v["seating_capacities"] = frappe.get_all("Venue Seating Capacity", filters={"parent": v.name}, fields=["seating_type", "capacity"])
        
    return venues
def create_consolidated_sales_invoice(booking_name):
    try:
        be = frappe.get_doc("Booking Entry", booking_name)
        
        so_names = []
        if be.sales_order and frappe.db.get_value("Sales Order", be.sales_order, "docstatus") == 1:
            so_names.append(be.sales_order)
            
        if be.get("reservation_extensions"):
            for ext in be.reservation_extensions:
                if ext.sales_order and ext.status != 'Cancelled' and frappe.db.get_value("Sales Order", ext.sales_order, "docstatus") == 1:
                    so_names.append(ext.sales_order)
                    
        if not so_names:
            frappe.throw(_("No submitted Sales Orders found to invoice."))
            
        from erpnext.selling.doctype.sales_order.sales_order import make_sales_invoice
        
        # Create SI from first SO
        si = make_sales_invoice(so_names[0])
        si.custom_booking_entry = be.name
        
        # Append items from remaining SOs
        if len(so_names) > 1:
            for so_name in so_names[1:]:
                so = frappe.get_doc("Sales Order", so_name)
                for item in so.items:
                    if item.qty > item.billed_amt:
                        si.append("items", {
                            "item_code": item.item_code,
                            "item_name": item.item_name,
                            "description": item.description,
                            "qty": item.qty,
                            "rate": item.rate,
                            "amount": item.amount,
                            "sales_order": so.name,
                            "so_detail": item.name,
                            "uom": item.uom,
                            "conversion_factor": item.conversion_factor,
                            "stock_uom": item.stock_uom,
                            "cost_center": item.cost_center,
                            "income_account": item.income_account
                        })
        
        si.run_method("set_missing_values")
        si.run_method("calculate_taxes_and_totals")
        
        # Fetch advances
        si.get_advances()
        
        si.insert(ignore_permissions=True)
        return {
            "success": True,
            "sales_invoice_name": si.name
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Create Consolidated SI Error")
        frappe.throw(_("Failed to create final invoice: {0}").format(str(e)))

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
