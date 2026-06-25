# Copyright (c) 2026, Faircode Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from rental_platform.rental_platform.asset_status import update_asset_instance_status


class RentalReturn(Document):
    def validate(self):
        # Prevent duplicate returns
        existing_return = frappe.db.exists(
            "Rental Return",
            {
                "booking": self.booking,
                "docstatus": ["!=", 2],
                "name": ["!=", self.name] if self.name else ["!=", ""]
            }
        )
        if existing_return:
            frappe.throw("A Return has already been processed for this booking.")
            
        # Audit Trail
        if not self.return_processed_by:
            self.return_processed_by = frappe.session.user

    def on_submit(self):
        # Update Rental Booking Status
        frappe.db.set_value("Rental Booking", self.booking, "booking_status", "Returned")
        # Asset status transition logic intentionally removed to avoid duplicate state issues
        # available_item.py automatically restores stock when the booking is marked as Returned
        
        # Update Asset Instance Status to Available
        if self.item and self.asset_instance:
            update_asset_instance_status(self.item, self.asset_instance, "Available")