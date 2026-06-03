import frappe
import random
from frappe.model.document import Document
from frappe.utils import now_datetime
from frappe.utils import get_datetime
from frappe import _

class BookingEntry(Document):
    def all_items_returned(self):
        rental_items = self.get("rental_items") or []  
        if not rental_items:  
            frappe.throw("No rental items found for this booking entry.")

        for item in rental_items:
            if item.returned_item != 1:  
                return False
        
        return True

    # def before_insert(self):
    #     # On amendment, pre-amend cancelled Q/SO so this doc can link to fresh ones.
    #     if self.amended_from:
    #         self._pre_amend_links()

    def before_save(self):
        # Skip the freeze when an early-return amendment is in flight
        if self.flags.get("from_mark_early_return"):
            return
        if self.amended_from:
            original_actual = frappe.db.get_value(
                "Booking Entry", self.amended_from, "actual_to_date"
            )
            if original_actual:
                self.actual_to_date = original_actual

    def before_cancel(self):
        # SI links to BE, so it must cancel first or Frappe blocks BE cancel.
        self._cancel_linked_sales_invoices()

    def on_cancel(self):
        #frappe.throw(_("Could not cancel"))
        self._cancel_linked_sales_order()
        self._cancel_linked_quotation()
        
        self._manage_rental_stock(decrement=False)

    # def on_submit(self):
    #     if not self.amended_from:
    #         return
    #     old_rental_to = frappe.db.get_value(
    #         "Booking Entry", self.amended_from, "rental_to_date"
    #     )
    #     if old_rental_to == self.rental_to_date:
    #         return
    #     self._propagate_rental_to_date()

    def on_submit(self):
        if self.flags.get("from_mark_early_return"):
            return
        if self.amended_from:
            self._reamend_sales_invoices()
        
        self._manage_rental_stock(decrement=True)

    def _manage_rental_stock(self, decrement=True):
        """Decrease or increase custom_stock_qty on Rental Asset doctype."""
        for row in self.get("rental_items") or []:
            item_code = row.item
            if not item_code:
                continue
                
            # Check if this item is a Rental Asset
            if frappe.db.exists("Rental Asset", item_code):
                current_stock = frappe.db.get_value("Rental Asset", item_code, "custom_stock_qty") or 0
                qty_change = row.quantity or 1
                
                if decrement:
                    new_stock = current_stock - qty_change
                    if new_stock < 0:
                        frappe.throw(_("Not enough stock for Rental Asset {0}. Available: {1}, Requested: {2}").format(item_code, current_stock, qty_change))
                else:
                    new_stock = current_stock + qty_change
                    
                frappe.db.set_value("Rental Asset", item_code, "custom_stock_qty", new_stock)


    def _pre_amend_links(self):
        original = frappe.db.get_value(
            "Booking Entry",
            self.amended_from,
            ["quotation", "sales_order", "actual_to_date"],
            as_dict=True,
        )
        if not original:
            return

        updates = {
            "custom_rental_to_date": self.rental_to_date,
            "custom_actual_to_date": original.actual_to_date,
        }

        # Quotation
        if original.quotation and frappe.db.exists("Quotation", original.quotation):
            q_status = frappe.db.get_value("Quotation", original.quotation, "docstatus")
            if q_status == 2:  # cancelled
                new_q = self._amend_with_updates("Quotation", original.quotation, updates)
                if new_q:
                    self.quotation = new_q
            elif q_status == 1:
                # Still submitted somehow — keep linking to it, no amend needed
                self.quotation = original.quotation

        # Sales Order
        if original.sales_order and frappe.db.exists("Sales Order", original.sales_order):
            so_status = frappe.db.get_value("Sales Order", original.sales_order, "docstatus")
            if so_status == 2:
                new_so = self._amend_with_updates("Sales Order", original.sales_order, updates)
                if new_so:
                    self.sales_order = new_so
            elif so_status == 1:
                self.sales_order = original.sales_order

    # ── Re-amend SI (runs after submit of amended BE) ─────────────────────

    def _reamend_sales_invoices(self):
        if not frappe.get_meta("Sales Invoice").has_field("custom_booking_entry"):
            return

        old_invoices = frappe.get_all(
            "Sales Invoice",
            filters={"custom_booking_entry": self.amended_from, "docstatus": 2},
            pluck="name",
        )
        if not old_invoices:
            return

        updates = {
            "custom_rental_to_date": self.rental_to_date,
            "custom_actual_to_date": self.actual_to_date,
            "custom_booking_entry": self.name,
        }
        for old_si in old_invoices:
            self._amend_with_updates("Sales Invoice", old_si, updates)

    def _cancel_linked_sales_invoices(self):
            # Guard: only proceed if the link field exists on Sales Invoice
            if not frappe.get_meta("Sales Invoice").has_field("custom_booking_entry"):
                return

            invoices = frappe.get_all(
                "Sales Invoice",
                filters={"custom_booking_entry": self.name, "docstatus": 1},
                pluck="name",
            )
            if not invoices:
                return

            for name in invoices:
                self._safe_cancel("Sales Invoice", name)

    def _cancel_linked_sales_order(self):
            if self.sales_order and frappe.db.get_value(
                "Sales Order", self.sales_order, "docstatus"
            ) == 1:
                self._safe_cancel("Sales Order", self.sales_order)

    def _cancel_linked_quotation(self):
            if self.quotation and frappe.db.get_value(
                "Quotation", self.quotation, "docstatus"
            ) == 1:
                self._safe_cancel("Quotation", self.quotation)

    @staticmethod
    def _safe_cancel(doctype, name):
            try:
                doc = frappe.get_doc(doctype, name)
                doc.flags.ignore_permissions = True
                doc.cancel()
                frappe.msgprint(
                    _("Cancelled linked {0}: {1}").format(doctype, name), alert=True
                )
            except Exception as e:
                frappe.log_error(frappe.get_traceback(), f"Cancel {doctype} {name}")
                frappe.throw(_("Could not cancel {0} {1}: {2}").format(doctype, name, e))

    # ── Amend-and-propagate ───────────────────────────────────────────────

    def _propagate_rental_to_date(self):
            # Linked docs use custom_ prefix
            updates = {
                "custom_rental_to_date": self.rental_to_date,
                "custom_actual_to_date": self.actual_to_date,
            }

            if self.quotation:
                new_qt = self._amend_with_updates("Quotation", self.quotation, updates)
                if new_qt:
                    self.db_set("quotation", new_qt, update_modified=False)

            if self.sales_order:
                new_so = self._amend_with_updates("Sales Order", self.sales_order, updates)
                if new_so:
                    self.db_set("sales_order", new_so, update_modified=False)

            # Sales Invoice — find cancelled ones that pointed at the old BE
            if frappe.get_meta("Sales Invoice").has_field("custom_booking_entry"):
                old_invoices = frappe.get_all(
                    "Sales Invoice",
                    filters={"custom_booking_entry": self.amended_from, "docstatus": 2},
                    pluck="name",
                )
                si_updates = {**updates, "custom_booking_entry": self.name}
                for old_si in old_invoices:
                    self._amend_with_updates("Sales Invoice", old_si, si_updates)

    @staticmethod
    def _amend_with_updates(doctype, old_name, updates):
            old_doc = frappe.get_doc(doctype, old_name)
            if old_doc.docstatus != 2:
                frappe.msgprint(
                    _("Skipping {0} {1} (not cancelled).").format(doctype, old_name),
                    alert=True,
                )
                return None

            new_doc = frappe.copy_doc(old_doc)
            new_doc.amended_from = old_name
            for field, value in updates.items():
                new_doc.set(field, value)

            new_doc.flags.ignore_permissions = True
            new_doc.insert()
            new_doc.submit()

            frappe.msgprint(
                _("Amended {0}: {1} → {2}").format(doctype, old_name, new_doc.name),
                alert=True,
            )
            return new_doc.name
# @frappe.whitelist()
# def cancel_booking_entry(booking_id):
#     """
#     Cancel a single booking entry and unlink all its related records:
#     - Unlink all connected Payment Entries
#     - Cancel connected Sales Order
#     - Update Booking Entry status to 'Cancelled'
#     """

#     result = {
#         'booking_entry': booking_id,
#         'success': False,
#         'payment_entries': [],
#         'sales_order': None
#     }

#     try:
#         booking = frappe.get_doc('Booking Entry', booking_id)
#         sales_order = booking.sales_order

#         payment_entries = frappe.get_all(
#             'Payment Entry',
#             filters={'custom_booking_entry': booking_id},
#             fields=['name', 'docstatus']
#         )

#         if payment_entries:
#             for entry in payment_entries:

#                 frappe.db.set_value('Payment Entry', entry['name'], 'custom_booking_entry', None)
#                 result['payment_entries'].append({
#                     'name': entry['name'],
#                     'status': 'Unlinked'
#                 })
#         else:
#             result['payment_entries'].append({
#                 'name': None,
#                 'status': 'No Payment Entries Found'
#             })

#         if sales_order:
#             try:
#                 sales_order_doc = frappe.get_doc('Sales Order', sales_order)
#                 if sales_order_doc.docstatus == 1:  
#                     sales_order_doc.cancel()
#                     result['sales_order'] = {
#                         'name': sales_order,
#                         'status': 'Cancelled'
#                     }
#                 else:
#                     result['sales_order'] = {
#                         'name': sales_order,
#                         'status': 'Not Submitted / Already Cancelled'
#                     }
#             except Exception as e:
#                 frappe.log_error(frappe.get_traceback(), f"Error cancelling Sales Order {sales_order}")
#                 result['sales_order'] = {
#                     'name': sales_order,
#                     'status': f'Error: {e}'
#                 }

#             frappe.db.set_value('Booking Entry', booking_id, 'sales_order', None)

#         booking.reload()
#         booking.status = 'Cancelled'
#         if booking.docstatus == 1:  
#             booking.cancel()
#         else:
#             booking.docstatus = 2
#             booking.save(ignore_permissions=True)

#         frappe.db.commit()
#         result['success'] = True

#     except Exception as e:
#         frappe.log_error(frappe.get_traceback(), f"Error cancelling booking entry {booking_id}")
#         result['error'] = str(e)

#     return result

@frappe.whitelist()
def cancel_booking_entry(booking_id):
    """
    Cancel a booking entry and its associated Sales Order and Quotation.
    Steps:
    1. Unlink Sales Order and Quotation from Booking Entry.
    2. Cancel Sales Order and Quotation.
    3. Update Booking Entry status to 'Cancelled'.
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

        #Cancel Sales Order
        if sales_order:
            try:
                sales_order_doc = frappe.get_doc('Sales Order', sales_order)
                if sales_order_doc.docstatus == 1:  
                    sales_order_doc.cancel()
                    result['sales_order'] = {
                        'name': sales_order,
                        'status': 'Cancelled'
                    }
                else:
                    result['sales_order'] = {
                        'name': sales_order,
                        'status': 'Not Submitted / Already Cancelled'
                    }
            except Exception as e:
                frappe.log_error(frappe.get_traceback(), f"Error cancelling Sales Order {sales_order}")
                result['sales_order'] = {
                    'name': sales_order,
                    'status': f'Error: {e}'
                }

        #cancel quotation
        if quotation:
            try:
                quotation_doc = frappe.get_doc('Quotation', quotation)
                if quotation_doc.docstatus == 1: 
                    #quotation_doc.cancel()
                    result['quotation'] = {
                        'name': quotation,
                        'status': 'Open'
                    }
                else:
                    result['quotation'] = {
                        'name': quotation,
                        'status': 'Not Submitted / Already Cancelled'
                    }
            except Exception as e:
                frappe.log_error(frappe.get_traceback(), f"Error cancelling Quotation {quotation}")
                result['quotation'] = {
                    'name': quotation,
                    'status': f'Error: {e}'
                }

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


@frappe.whitelist()
def mark_early_return(booking_entry, early_return_date):
    """
    Cancel the BE (cascading to SI/SO/Q via on_cancel),
    amend it with rental_to_date = early_return_date and custom_returned_early = 1,
    and submit (cascading the new date via on_submit).
    """
    be = frappe.get_doc("Booking Entry", booking_entry)

    if be.docstatus != 1:
        frappe.throw(_("Early return can only be marked on a submitted Booking Entry."))

    new_to = get_datetime(early_return_date)
    if new_to >= get_datetime(be.rental_to_date):
        frappe.throw(_("Early return date must be earlier than the current Rental To date ({0}).")
                     .format(be.rental_to_date))
    if new_to < get_datetime(be.rental_from_date):
        frappe.throw(_("Early return date cannot be before Rental From date."))

    be.flags.ignore_permissions = True
    #be.cancel()

    #if hasattr(be, "status"):
        #frappe.db.set_value("Booking Entry", be.name, "status", "Cancelled")
    cancel_booking_entry(be.name)

    amended = frappe.copy_doc(be)
    amended.amended_from         = be.name
    amended.rental_to_date       = new_to
    amended.actual_to_date       = new_to
    amended.custom_returned_early = 1
    # actual_to_date is preserved by before_save.

    amended.flags.ignore_permissions = True
    amended.insert()
    amended.submit()

    frappe.msgprint(
        _("Early return recorded. New Booking Entry: {0}").format(amended.name),
        alert=True,
    )
    return amended.name


def _amend_doc(doctype, old_name, parent_updates, child_updates=None):
    """Amend a cancelled doc. child_updates: {table_field: {child_field: value}}."""
    if not old_name or not frappe.db.exists(doctype, old_name):
        return None
    if frappe.db.get_value(doctype, old_name, "docstatus") != 2:
        return None

    old_doc = frappe.get_doc(doctype, old_name)
    new_doc = frappe.copy_doc(old_doc)
    new_doc.amended_from = old_name

    for field, value in parent_updates.items():
        new_doc.set(field, value)

    if child_updates:
        for table_field, fields_to_update in child_updates.items():
            for row in (new_doc.get(table_field) or []):
                for cf, cv in fields_to_update.items():
                    if hasattr(row, cf):
                        row.set(cf, cv)

    new_doc.flags.ignore_permissions = True
    new_doc.insert()
    new_doc.submit()

    frappe.msgprint(_("Amended {0}: {1} → {2}").format(doctype, old_name, new_doc.name), alert=True)
    return new_doc.name


# ── Whitelisted entrypoint ────────────────────────────────────────────────

@frappe.whitelist()
def mark_early_return2(booking_entry, early_return_date):
    be = frappe.get_doc("Booking Entry", booking_entry)

    if be.docstatus != 1:
        frappe.throw(_("Early return can only be marked on a submitted Booking Entry."))

    new_to = get_datetime(early_return_date)
    if new_to >= get_datetime(be.rental_to_date):
        frappe.throw(_("Early return date must be earlier than the current Rental To date ({0}).")
                     .format(be.rental_to_date))
    if new_to < get_datetime(be.rental_from_date):
        frappe.throw(_("Early return date cannot be before Rental From date."))

    # Snapshot
    original_quotation   = be.quotation
    original_sales_order = be.sales_order

    parent_updates = {
        "custom_rental_to_date": new_to,
        "custom_actual_to_date": new_to,   # actual_to_date follows the early return date
    }

    # 1. Cancel BE → before_cancel cancels SI; on_cancel cancels SO + Quotation
    be.flags.ignore_permissions = True
    be.cancel()

    # 2. Amend Quotation (no back-link to BE — safe to do first)
    new_quotation = _amend_doc("Quotation", original_quotation, parent_updates)

    # 3. Insert amended BE as Draft. ignore_links lets us bypass the cancelled-SO link
    #    temporarily; we'll repair it in step 5.
    amended = frappe.copy_doc(be)
    amended.amended_from              = be.name
    amended.rental_to_date            = new_to
    amended.actual_to_date            = new_to
    amended.custom_returned_early     = 1
    if new_quotation:
        amended.quotation = new_quotation

    amended.flags.ignore_permissions       = True
    amended.flags.ignore_links             = True
    amended.flags.from_mark_early_return   = True
    amended.insert()

    # 4. Amend Sales Order — point custom_booking_entry to the NEW (Draft) BE
    so_parent_updates = dict(parent_updates)
    if frappe.get_meta("Sales Order").has_field("custom_booking_entry"):
        so_parent_updates["custom_booking_entry"] = amended.name   # ← FIX: correct field name

    so_child_updates = {}
    if new_quotation:
        so_child_updates = {"items": {"prevdoc_docname": new_quotation}}

    new_sales_order = _amend_doc(
        "Sales Order", original_sales_order, so_parent_updates, so_child_updates
    )

    # 5. Repair amended BE's sales_order link, then save (still Draft)
    if new_sales_order:
        amended.sales_order = new_sales_order
        amended.flags.ignore_permissions     = True
        amended.flags.from_mark_early_return = True
        amended.save()

    # 6. Amend Sales Invoice(s) — booking_entry → new BE, items.sales_order → new SO
    if frappe.get_meta("Sales Invoice").has_field("custom_booking_entry"):
        old_invoices = frappe.get_all(
            "Sales Invoice",
            filters={"custom_booking_entry": be.name, "docstatus": 2},
            pluck="name",
        )
        si_parent_updates = {**parent_updates, "custom_booking_entry": amended.name}
        si_child_updates = {}
        if new_sales_order:
            si_child_updates = {
                "items": {
                    "sales_order":     new_sales_order,
                    "prevdoc_docname": new_sales_order,
                }
            }
        for old_si in old_invoices:
            _amend_doc("Sales Invoice", old_si, si_parent_updates, si_child_updates)

    # 7. Submit amended BE — skip on_submit's auto SI re-amend (we did it manually)
    amended.flags.ignore_permissions     = True
    amended.flags.from_mark_early_return = True
    amended.submit()

    frappe.db.commit()

    frappe.msgprint(
        _("Early return recorded. New Booking Entry: {0}").format(amended.name),
        alert=True,
    )
    return amended.name