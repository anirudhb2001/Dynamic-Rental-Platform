import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_item_brands(model_name=None, search_term=None):
    """Fetch item brands based on the selected model, with an optional search filter."""

    conditions = []
    values = []

    # If model is selected, filter items by that model
    if model_name:
        conditions.append("i.model = %s")
        values.append(model_name)

    # If a search term is provided, filter brands accordingly
    if search_term:
        conditions.append("ib.brand LIKE %s")
        values.append(f"%{search_term}%")

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    query = f"""
        SELECT 
            ib.name AS brand_id,
            ib.brand AS brand_name,
            COUNT(i.name) AS item_count
        FROM 
            `tabBrand` ib
        LEFT JOIN 
            `tabItem` i ON i.brand = ib.name
        {where_clause}
        GROUP BY 
            ib.name, ib.brand
        ORDER BY 
            ib.brand
    """

    item_brands = frappe.db.sql(query, values=values, as_dict=True)

    return item_brands
