# Copyright (c) 2026, Faircode Technologies Pvt Ltd and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class RentalBooking(Document):
	pass

def validate(self):
    for item in self.rental_items:

        status = frappe.db.get_value(
            "Rental Asset",
            item.rental_asset,
            "status"
        )

        if status != "Available":
            frappe.throw(
                f"{item.rental_asset} is already reserved."
            )

def validate(self):
    for item in self.rental_items:

        status = frappe.db.get_value(
            "Rental Asset",
            item.rental_asset,
            "status"
        )

        if status != "Available":
            frappe.throw(
                f"{item.rental_asset} is already reserved."
            )

def hand_over(booking):

    doc = frappe.get_doc(
        "Rental Booking",
        booking
    )

    for item in doc.rental_items:

        asset = frappe.get_doc(
            "Rental Asset",
            item.rental_asset
        )

        asset.status = "Out on Rent"

        asset.save(
            ignore_permissions=True
        )

    doc.status = "Out on Rent"

    doc.save()