import frappe

# @frappe.whitelist(allow_guest=True)
# def search(name, price_list=None):
#     items = frappe.db.sql(
#         """
#         SELECT 
#             i.name AS item_id,
#             i.item_name,
#             i.description AS item_description,
#             i.image AS item_image,
#             i.brand AS brand_name,
#             b.barcode,
#             p.price_list_rate AS price,
#             p.price_list AS price_list_name
#         FROM tabItem i
#         LEFT JOIN `tabItem Barcode` b ON b.parent = i.name
#         INNER JOIN `tabItem Price` p ON p.item_code = i.item_code AND p.price_list = %s
#         WHERE i.item_name LIKE %s OR i.brand LIKE %s OR b.barcode LIKE %s
#         """,
#         (price_list, f"{name}%", f"{name}%", f"{name}%"),
#         as_dict=True
#     )

#     return items


@frappe.whitelist(allow_guest=True)
def search(name, price_list=None): 
    items = frappe.db.sql(
        """
        SELECT 
            i.name AS item_id,
            i.item_name,
            i.description AS item_description,
            i.image AS item_image,
            i.brand AS brand_name,
            i.custom_custom_barcode AS barcode,
            p.price_list_rate AS price,
            p.price_list AS price_list_name,
            id.default_warehouse AS warehouse_name
        FROM `tabItem` i
        INNER JOIN `tabItem Price` p 
            ON p.item_code = i.item_code AND p.price_list = %s
        LEFT JOIN `tabItem Default` id
            ON id.parent = i.name
        WHERE (i.item_name LIKE %s 
        OR i.brand LIKE %s 
        OR LOWER(i.custom_custom_barcode) = LOWER(%s))
        AND i.custom_show_in_rental_screen = 1
        AND i.disabled = 0        
        """,
        (price_list, f"{name}%", f"{name}%", name), 
        as_dict=True
    )

    return items

