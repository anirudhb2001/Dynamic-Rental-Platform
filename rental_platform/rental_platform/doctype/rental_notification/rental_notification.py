# Copyright (c) 2026, Faircode Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class RentalNotification(Document):
    """Rental Notification DocType controller.

    No custom hooks needed — Frappe's built-in `creation`, `modified`,
    and `owner` fields handle all timestamp and audit requirements.
    """
    pass
