# Copyright (c) 2026, Faircode Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class RentalBooking(Document):
    def validate(self):
        # New Item workflow validation
        if self.item:
            tracking_mode = frappe.db.get_value("Item", self.item, "custom_asset_tracking_mode")
            if tracking_mode == "Individual":
                # Serial No is optional at booking creation, but if provided, it must be Active
                if self.serial_no:
                    serial_status = frappe.db.get_value("Serial No", self.serial_no, "status")
                    if serial_status != "Active":
                        frappe.throw(f"Serial No {self.serial_no} is not available (Status: {serial_status}).")
            
        # Backward compatibility for legacy Rental Asset
        elif self.asset:
            status = frappe.db.get_value("Rental Asset", self.asset, "asset_status")
            if status not in ["Available", ""]:
                frappe.throw(f"Asset {self.asset} is already reserved or unavailable.")

    def on_submit(self):
        if self.booking_status == "Draft":
            self.db_set("booking_status", "Reserved")

@frappe.whitelist()
def hand_over(booking):
    doc = frappe.get_doc("Rental Booking", booking)
    
    if doc.item:
        if doc.serial_no:
            pass # Usually standard delivery note handles this
    elif doc.asset:
        asset = frappe.get_doc("Rental Asset", doc.asset)
        asset.asset_status = "Rented"
        asset.save(ignore_permissions=True)

    doc.booking_status = "Picked Up"
    doc.save()