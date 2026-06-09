"""
Notification API for Rental Platform.

Provides helpers to create notifications and whitelisted endpoints
for the dashboard frontend to fetch, count, and mark notifications.
"""

import frappe
from frappe import _


# ---------------------------------------------------------------------------
# Internal Helpers (NOT whitelisted — called from triggers only)
# ---------------------------------------------------------------------------

def create_notification(
    title,
    message,
    notification_type,
    user=None,
    customer=None,
    reference_doctype=None,
    reference_name=None,
    priority="Medium",
):
    """Create a single Rental Notification record.

    Accepts both `user` and `customer` simultaneously to support
    dual mapping (a customer notification can be looked up by either field).
    """
    try:
        doc = frappe.new_doc("Rental Notification")
        doc.title = title
        doc.message = message
        doc.notification_type = notification_type
        doc.user = user
        doc.customer = customer
        doc.reference_doctype = reference_doctype
        doc.reference_name = reference_name
        doc.priority = priority
        doc.is_read = 0
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Notification Creation Error")
        return None


def create_admin_notification(
    title,
    message,
    notification_type,
    reference_doctype=None,
    reference_name=None,
    priority="Medium",
):
    """Create one Rental Notification per active System Manager user.

    Replaces all previous hardcoded `user='Administrator'` patterns.
    Skips disabled users and Guest.
    """
    admin_users = frappe.get_all(
        "Has Role",
        filters={"role": "System Manager", "parenttype": "User"},
        pluck="parent",
    )

    # Deduplicate and filter out Guest / disabled users
    seen = set()
    for user in admin_users:
        if user in seen or user == "Guest":
            continue
        seen.add(user)

        # Skip disabled users
        enabled = frappe.db.get_value("User", user, "enabled")
        if not enabled:
            continue

        create_notification(
            title=title,
            message=message,
            notification_type=notification_type,
            user=user,
            reference_doctype=reference_doctype,
            reference_name=reference_name,
            priority=priority,
        )


# ---------------------------------------------------------------------------
# Whitelisted API Endpoints (called from frontend)
# ---------------------------------------------------------------------------

def _get_notification_filters():
    """Resolve notification filters for the current session user.

    Returns a list of OR-filters suitable for frappe.get_all.
    1. Always try `user = frappe.session.user`.
    2. Also try `customer = <linked customer>` if one exists.
    """
    current_user = frappe.session.user
    or_filters = [{"user": current_user}]

    # Try to find a linked Customer record for this user
    mobile_no = frappe.db.get_value("User", current_user, "mobile_no")
    if mobile_no:
        customer_name = frappe.db.get_value(
            "Customer", {"mobile_no": mobile_no}, "name"
        )
        if customer_name:
            or_filters.append({"customer": customer_name})

    return or_filters


@frappe.whitelist()
def get_notifications():
    """Return up to 20 notifications for the current session user.

    Resolution order:
    1. Notifications where `user` matches the logged-in user.
    2. Notifications where `customer` matches the linked Customer record.
    """
    or_filters = _get_notification_filters()

    notifications = frappe.get_all(
        "Rental Notification",
        or_filters=or_filters,
        fields=[
            "name",
            "title",
            "message",
            "notification_type",
            "priority",
            "is_read",
            "creation",
            "reference_doctype",
            "reference_name",
        ],
        order_by="creation desc",
        limit_page_length=20,
    )

    return notifications


@frappe.whitelist()
def get_unread_count():
    """Return the count of unread notifications for the current user."""
    or_filters = _get_notification_filters()

    results = frappe.get_all(
        "Rental Notification",
        filters={"is_read": 0},
        or_filters=or_filters,
        fields=["name"],
        limit_page_length=100,
    )

    return {"count": len(results)}


@frappe.whitelist()
def mark_notification_read(notification_name):
    """Mark a specific notification as read."""
    if not notification_name:
        frappe.throw(_("Notification name is required."))

    if not frappe.db.exists("Rental Notification", notification_name):
        frappe.throw(_("Notification not found."))

    frappe.db.set_value(
        "Rental Notification",
        notification_name,
        "is_read",
        1,
    )
    frappe.db.commit()

    return {"success": True}
