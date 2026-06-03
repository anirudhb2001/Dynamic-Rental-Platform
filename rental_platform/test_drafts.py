import frappe
from rental_platform.web_api.cart_ import get_customer_draft_quotations

def execute():
    try:
        drafts = get_customer_draft_quotations("Anirudh B")
        print("Drafts:", drafts)
    except Exception as e:
        print("Exception:", e)
