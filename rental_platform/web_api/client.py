
import frappe


@frappe.whitelist()
def get_logged_client():

    user = frappe.session.user

    client = frappe.get_value(

        "Client Configuration",

        {"custom_user": user},

        ["name", "business_type"],

        as_dict=True

    )

    return client