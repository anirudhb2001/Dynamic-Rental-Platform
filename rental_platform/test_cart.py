import frappe
from rental_platform.web_api.cart_ import create_quotation, get_customer_draft_quotations

def execute():
    try:
        booking_details = [
            {
                "id": "RA-001",
                "price_list": "Standard",
                "price": 2000,
                "custom_is_bulk_item": 0,
                "rental_item_id": "RA-001",
                "item_name": "RA-001",
                "pricelist_name": "Standard",
                "quantity": 1,
                "stock_quantity": 2
            }
        ]
        
        res = create_quotation(
            customer="Anirudh B",
            booking_details=booking_details,
            quantity=1,
            custom_rental_from_date="2026-05-30",
            custom_rental_to_date="2026-05-31",
            custom_actual_to_date="2026-05-31"
        )
        print("Create quotation response:", res)
        
    except Exception as e:
        print("Exception:", e)
