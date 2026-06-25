
import frappe
# from rental_platform.rental_platform.available_item import get_item_availability 


@frappe.whitelist(allow_guest=True)
def get_item_groups():
    item_groups = frappe.db.sql("""
        SELECT 
            ig.name AS category_id,
            ig.item_group_name AS category_name,
            COUNT(i.name) AS item_count
        FROM 
            `tabItem Group` ig
        JOIN 
            `tabItem` i ON i.item_group = ig.name
        WHERE
            i.custom_is_rental_asset = 1
        GROUP BY 
            ig.name, ig.item_group_name
        ORDER BY 
            ig.item_group_name
    """, as_dict=True)
    return item_groups
    
@frappe.whitelist()
def get_rental_items():

    items = frappe.get_all(
        "Rental Item",
        fields=[
            "name",
            "item_name",
            "price"
        ]
    )

    return items

@frappe.whitelist(allow_guest=True)
def get_item_brands(search_term=None):
    """Fetch item brands and item counts, with optional search filter."""
    if search_term:
        search_term = f"%{search_term}%"
        query = """
            SELECT 
                ib.name AS brand_id,
                ib.brand AS brand_name,  -- Corrected this field name to 'brand'
                COUNT(i.name) AS item_count
            FROM 
                `tabBrand` ib
            LEFT JOIN 
                `tabItem` i ON i.brand = ib.name
            WHERE 
                 ib.brand LIKE %s  -- Adjusted this field name to 'brand'
            GROUP BY 
                ib.name, ib.brand
            ORDER BY 
                ib.brand
        """
        item_brands = frappe.db.sql(query, values=(search_term,), as_dict=True)
    else:
        query = """
            SELECT 
                ib.name AS brand_id,
                ib.brand AS brand_name,  -- Corrected this field name to 'brand'
                COUNT(i.name) AS item_count
            FROM 
                `tabBrand` ib
            LEFT JOIN 
                `tabItem` i ON i.brand = ib.name
            
            GROUP BY 
                ib.name, ib.brand
            ORDER BY 
                ib.brand
        """
        item_brands = frappe.db.sql(query, as_dict=True)

    return item_brands





@frappe.whitelist(allow_guest=True)
def get_price_lists():
    
    price_lists = frappe.get_all('Price List', fields=['name', 'currency', 'enabled', 'custom_counter', 'custom_valid_hour'])

    response = []
    for price_list in price_lists:
        
        if price_list['name'] in ["Standard Selling", "Standard Buying"]:
            continue

        response.append({
            'price_list_id': price_list['name'],
            'price_list_name': frappe.get_value('Price List', price_list['name'], 'price_list_name'),
            'currency': price_list['currency'],
            'validity': None,
            'custom_counter': price_list['custom_counter'],
            'custom_valid_hour': price_list['custom_valid_hour'],
            'enabled': price_list['enabled']
        })
    return response


# @frappe.whitelist(allow_guest=True)
# def get_item_list(category_id=None, brand_id=None, price_list_id=None, warehouse=None, page=1, page_size=12):
#     filters = ["i.custom_show_in_rental_screen = 1", "ip.price_list_rate IS NOT NULL"]

#     child_groups = []
#     if category_id:
#         child_groups = frappe.db.sql("""
#             WITH RECURSIVE item_group_hierarchy AS (
#                 SELECT name FROM `tabItem Group` WHERE name = %s
#                 UNION ALL
#                 SELECT ig.name
#                 FROM `tabItem Group` ig
#                 INNER JOIN item_group_hierarchy ig_hierarchy ON ig.parent_item_group = ig_hierarchy.name
#             )
#             SELECT name FROM item_group_hierarchy
#         """, (category_id,), as_list=True)

#         child_groups = [group[0] for group in child_groups]
#         if child_groups:
#             placeholders = ", ".join(["%s"] * len(child_groups))
#             filters.append(f"i.item_group IN ({placeholders})")

#     if brand_id:
#         filters.append("i.brand = %s")  # Brand filter
#     if price_list_id:
#         filters.append("ip.price_list = %s")
#     if warehouse:
#         filters.append("bn.warehouse = %s")  # Apply warehouse filter to tabBin table

#     where_clause = " AND ".join(filters)
#     args = []
#     if child_groups:
#         args.extend(child_groups)
#     if brand_id:
#         args.append(brand_id)
#     if price_list_id:
#         args.append(price_list_id)
#     if warehouse:
#         args.append(warehouse)

#     try:
#         page = int(page)
#     except ValueError:
#         page = 1

#     try:
#         page_size = int(page_size)
#     except ValueError:
#         page_size = 12

#     offset = (page - 1) * page_size

#     query = f"""
#         SELECT 
#             i.name AS item_id,
#             i.item_name,
#             i.image AS item_image,
#             i.description AS item_description,
#             ip.price_list_rate AS price,
#             pl.price_list_name,
#             b.name AS brand_name,
#             ig.name AS category_name,
#             bn.warehouse AS warehouse_name,  
#             bn.actual_qty AS available_quantity  
#         FROM 
#             `tabItem` i
#         LEFT JOIN 
#             `tabItem Price` ip ON ip.item_code = i.name
#         LEFT JOIN 
#             `tabPrice List` pl ON pl.name = ip.price_list
#         LEFT JOIN 
#             `tabBrand` b ON b.name = i.brand
#         LEFT JOIN 
#             `tabItem Group` ig ON ig.name = i.item_group
#         LEFT JOIN 
#             `tabBin` bn ON bn.item_code = i.name  -- Changed alias from b to bn
#         WHERE 
#             {where_clause}
#         ORDER BY 
#             pl.price_list_name, i.item_name ASC
#         LIMIT %s OFFSET %s
#     """
#     args.extend([page_size, offset])

#     items = frappe.db.sql(query, args, as_dict=True)

#     count_query = f"""
#         SELECT 
#             COUNT(*) AS total_count
#         FROM 
#             `tabItem` i
#         LEFT JOIN 
#             `tabItem Price` ip ON ip.item_code = i.name
#         LEFT JOIN 
#             `tabPrice List` pl ON pl.name = ip.price_list
#         LEFT JOIN 
#             `tabBin` bn ON bn.item_code = i.name  -- Changed alias from b to bn
#         WHERE 
#             {where_clause}
#     """
#     count_args = args[:-2]  # Exclude LIMIT and OFFSET
#     total_count = frappe.db.sql(count_query, count_args, as_dict=True)[0].get("total_count", 0)

#     total_pages = (total_count + page_size - 1) // page_size

#     return {
#         "items": items,
#         "pagination": {
#             "current_page": page,
#             "page_size": page_size,
#             "total_items": total_count,
#             "total_pages": total_pages,
#         },
#     }

# @frappe.whitelist(allow_guest=True)
# def get_item_list(category_id=None, brand_id=None, price_list_id=None, page=1, page_size=12):
#     def fetch_children(parent):
#         """Recursively fetch child item groups and their items"""
#         children = frappe.get_all(
#             "Item Group",
#             filters={"parent_item_group": parent},
#             fields=["name", "parent_item_group", "is_group", "image"]
#         )

#         items = frappe.get_all(
#             "Item",
#             filters={"item_group": parent},
#             fields=["item_code", "item_name"]
#         )

#         return {
#             "name": parent,
#             "is_group": 1,
#             "items": items,  # Direct items under this group
#             "children": [fetch_children(child["name"]) for child in children]
#         }

#     filters = ["i.custom_show_in_rental_screen = 1", "ip.price_list_rate IS NOT NULL"]

#     # Fetch category tree
#     category_tree = []
#     if category_id:
#         category_tree = [fetch_children(category_id)]

#     child_groups = []
#     if category_id:
#         child_groups = frappe.db.sql("""
#             WITH RECURSIVE item_group_hierarchy AS (
#                 SELECT name FROM `tabItem Group` WHERE name = %s
#                 UNION ALL
#                 SELECT ig.name
#                 FROM `tabItem Group` ig
#                 INNER JOIN item_group_hierarchy ig_hierarchy ON ig.parent_item_group = ig_hierarchy.name
#             )
#             SELECT name FROM item_group_hierarchy
#         """, (category_id,), as_list=True)

#         child_groups = [group[0] for group in child_groups]
#         if child_groups:
#             placeholders = ", ".join(["%s"] * len(child_groups))
#             filters.append(f"i.item_group IN ({placeholders})")

#     if brand_id:
#         filters.append("i.brand = %s")
#     if price_list_id:
#         filters.append("ip.price_list = %s")

#     where_clause = " AND ".join(filters)
#     args = []
#     if child_groups:
#         args.extend(child_groups)
#     if brand_id:
#         args.append(brand_id)
#     if price_list_id:
#         args.append(price_list_id)

#     try:
#         page = int(page)
#     except ValueError:
#         page = 1

#     try:
#         page_size = int(page_size)
#     except ValueError:
#         page_size = 12

#     offset = (page - 1) * page_size

#     query = f"""
#         SELECT 
#             i.name AS item_id,
#             i.item_name,
#             i.image AS item_image,
#             i.description AS item_description,
#             ip.price_list_rate AS price,
#             pl.price_list_name,
#             b.name AS brand_name,
#             ig.name AS category_name
#         FROM 
#             `tabItem` i
#         LEFT JOIN 
#             `tabItem Price` ip ON ip.item_code = i.name
#         LEFT JOIN 
#             `tabPrice List` pl ON pl.name = ip.price_list
#         LEFT JOIN 
#             `tabBrand` b ON b.name = i.brand
#         LEFT JOIN 
#             `tabItem Group` ig ON ig.name = i.item_group
#         WHERE 
#             {where_clause}
#         ORDER BY 
#             pl.price_list_name, i.item_name ASC
#         LIMIT %s OFFSET %s
#     """
#     args.extend([page_size, offset])

#     items = frappe.db.sql(query, args, as_dict=True)

#     count_query = f"""
#         SELECT 
#             COUNT(*) AS total_count
#         FROM 
#             `tabItem` i
#         LEFT JOIN 
#             `tabItem Price` ip ON ip.item_code = i.name
#         LEFT JOIN 
#             `tabPrice List` pl ON pl.name = ip.price_list
#         WHERE 
#             {where_clause}
#     """
#     count_args = args[:-2]  # Exclude LIMIT and OFFSET
#     total_count = frappe.db.sql(count_query, count_args, as_dict=True)[0].get("total_count", 0)

#     total_pages = (total_count + page_size - 1) // page_size

#     return {
#         "categories": category_tree,
#         "items": items,
#         "pagination": {
#             "current_page": page,
#             "page_size": page_size,
#             "total_items": total_count,
#             "total_pages": total_pages,
#         },
#     }





@frappe.whitelist(allow_guest=True)
def get_item_list(item_name=None ,category_id=None, brand_id=None, price_list_id=None, warehouse=None, sort_price=None, page=1, page_size=12, start_datetime=None, end_datetime=None, status=None):
    
    filters = ["i.disabled = 0", "i.custom_is_rental_asset = 1"]

    if sort_price == "low_to_high":
        order_by_clause = "i.custom_daily_rate ASC"
    elif sort_price == "high_to_low":
        order_by_clause = "i.custom_daily_rate DESC"
    else:
        order_by_clause = "i.item_name ASC"

    category_tree = []
    if category_id:
        category_tree = [{"name": category_id, "is_group": 1, "items": [], "children": []}]
        filters.append("i.item_group = %s")

    if item_name:
        filters.append("i.item_name LIKE %s")

    where_clause = " AND ".join(filters)
    args = []
    
    if category_id:
        args.append(category_id)
    if item_name:
        args.append(f"%{item_name}%")

    page = int(page)
    page_size = int(page_size)
    offset = (page - 1) * page_size

    query = f"""
        SELECT 
            i.name AS item_id,
            i.item_name AS item_name,
            i.image AS item_image,
            i.description AS item_description,
            i.custom_daily_rate AS price,
            'Standard Selling' AS price_list_name,
            i.brand AS brand_name,
            '' AS warehouse_name,
            (SELECT SUM(actual_qty) FROM `tabBin` WHERE item_code = i.name) AS bin_stock_qty,
            (SELECT COUNT(*) FROM `tabSerial No` WHERE item_code = i.name) AS serial_total_qty,
            (SELECT COUNT(*) FROM `tabSerial No` WHERE item_code = i.name AND status = 'Active') AS serial_available_qty,
            CASE WHEN i.custom_asset_tracking_mode = 'Quantity' THEN 1 ELSE 0 END AS custom_is_bulk_item,
            i.custom_asset_tracking_mode
        FROM  
            `tabItem` i
        WHERE 
            {where_clause}
        ORDER BY 
            {order_by_clause}
        LIMIT %s OFFSET %s;
    """
    args.extend([page_size, offset])

    raw_items = frappe.db.sql(query, args, as_dict=True)

    branding_tracking = frappe.db.get_single_value("Branding Settings", "default_asset_tracking_mode") or "Mixed"
    items = []
    
    for item in raw_items:
        tracking_mode = item.get("custom_asset_tracking_mode") or branding_tracking
        if tracking_mode == "Mixed":
            # If still Mixed at Item level (unlikely, but fallback), default to Individual
            tracking_mode = "Individual"
            
        if tracking_mode == "Individual":
            # Query active Serial Numbers for this Item
            serial_nos = frappe.get_all(
                "Serial No", 
                filters={"item_code": item["item_id"], "status": "Active"}, 
                fields=["name"]
            )
            
            # Legacy: Also check Rental Assets if any (keeping backward compatibility)
            rental_assets = frappe.get_all("Rental Asset", filters={"item": item["item_id"], "asset_status": ["!=", "Inactive"]}, fields=["name", "asset_status"])
            
            has_assets = False
            
            if serial_nos:
                has_assets = True
                for sn in serial_nos:
                    new_item = item.copy()
                    new_item["item_id"] = sn["name"]  # For React keys
                    new_item["item_code"] = item["item_id"]
                    new_item["item_name"] = item["item_name"]
                    new_item["serial_no"] = sn["name"]
                    new_item["display_name"] = f"{item['item_name']} - {sn['name']}"
                    new_item["tracking_mode"] = "Individual"
                    new_item["available_qty"] = 1
                    new_item["total_assets"] = 1
                    new_item["stock_qty"] = 1
                    new_item["status"] = "Available"
                    items.append(new_item)
                    
            if rental_assets:
                has_assets = True
                for ra in rental_assets:
                    new_item = item.copy()
                    new_item["item_id"] = ra["name"]  # Legacy: keep rental asset name as ID
                    new_item["item_code"] = item["item_id"]
                    new_item["item_name"] = item["item_name"]
                    new_item["serial_no"] = ""
                    new_item["display_name"] = f"{item['item_name']} - {ra['name']}"
                    new_item["tracking_mode"] = "Individual"
                    new_item["available_qty"] = 1 if ra["asset_status"] == "Available" else 0
                    new_item["total_assets"] = 1
                    new_item["stock_qty"] = 1
                    new_item["status"] = ra["asset_status"]
                    items.append(new_item)
                    
            if not has_assets:
                # Still append the base item but mark it unavailable if no serial numbers exist
                new_item = item.copy()
                new_item["item_code"] = item["item_id"]
                new_item["item_name"] = item["item_name"]
                new_item["serial_no"] = ""
                new_item["display_name"] = item["item_name"]
                new_item["tracking_mode"] = "Individual"
                new_item["available_qty"] = 0
                new_item["total_assets"] = item.get("serial_total_qty") or 0
                new_item["stock_qty"] = new_item["total_assets"]
                new_item["status"] = "Unavailable"
                items.append(new_item)
                
        else:
            # Quantity Mode
            item["item_code"] = item["item_id"]
            item["item_name"] = item["item_name"]
            item["serial_no"] = ""
            item["display_name"] = item["item_name"]
            item["total_assets"] = item.get("bin_stock_qty") or 0
            item["stock_qty"] = item.get("bin_stock_qty") or 0
            item["available_qty"] = item["total_assets"]
            item["status"] = "Available" if item["stock_qty"] > 0 else "Unavailable"
            item["tracking_mode"] = "Quantity"
            items.append(item)

    if status:
        items = [item for item in items if item["status"] == status]

    count_query = f"""
        SELECT COUNT(*) AS total_count
        FROM `tabItem` i
        WHERE {where_clause}
    """
    count_args = args[:-2]
    total_count = frappe.db.sql(count_query, count_args, as_dict=True)[0].get("total_count", 0)
    total_pages = (total_count + page_size - 1) // page_size
        
    return {
        "categories": category_tree,
        "items": items,
        "pagination": {
            "current_page": page,
            "page_size": page_size,
            "total_items": total_count,
            "total_pages": total_pages,
        },
    }




@frappe.whitelist(allow_guest=True)
def get_product_bundle_list():
    filters = []  
    where_clause = " AND ".join(filters) if filters else "1=1" 

    query = f"""
        SELECT 
            pb.name AS bundle_id,
            pb.new_item_code,
            pb.description AS bundle_description,
            b.name AS brand_name,
            i.item_code AS bundle_item_code,
            i.item_name AS bundle_item_name,
            bi.qty AS item_quantity,
            bi.uom AS item_uom,
            bi.description AS item_description,
            bi.custom_is_main_item  -- Fetch main item flag
        FROM 
            `tabProduct Bundle` pb
        LEFT JOIN 
            `tabProduct Bundle Item` bi ON bi.parent = pb.name
        LEFT JOIN 
            `tabItem` i ON i.name = bi.item_code
        LEFT JOIN 
            `tabBrand` b ON b.name = i.brand
        WHERE 
            {where_clause}
        ORDER BY 
            bi.idx ASC 
    """
    
    raw_bundles = frappe.db.sql(query, as_dict=True)
    bundles = {}

    for row in raw_bundles:
        bundle_id = row['bundle_id']
        
        if bundle_id not in bundles:
            bundles[bundle_id] = {
                'bundle_id': row['bundle_id'],
                'new_item_code': row['new_item_code'],
                'bundle_description': row['bundle_description'],
                'items': []
            }

        # Append item with main item flag
        bundles[bundle_id]['items'].append({
            'bundle_item_code': row['bundle_item_code'],
            'bundle_item_name': row['bundle_item_name'],
            'item_quantity': row['item_quantity'],
            'item_uom': row['item_uom'],
            'item_description': row['item_description'],
            'is_main_item': row['custom_is_main_item'] or 0  # Default to 0 if None
        })

    # Ensure main item appears first
    for bundle in bundles.values():
        bundle['items'].sort(key=lambda x: x['is_main_item'], reverse=True)

    return list(bundles.values())



@frappe.whitelist(allow_guest=True)
def get_item_list_without_page(category_id=None, brand_id=None, price_list_id=None):
    filters = [
        "i.custom_show_in_rental_screen = 1",
        "i.disabled = 0",
        "ip.price_list_rate IS NOT NULL",
        "NOT EXISTS (SELECT 1 FROM `tabProduct Bundle Item` pbi JOIN `tabItem` child ON child.name = pbi.item_code WHERE pbi.parent = i.name AND child.disabled = 1)"
    ]

    child_groups = []
    if category_id:
        child_groups = frappe.db.sql("""
            WITH RECURSIVE item_group_hierarchy AS (
                SELECT name FROM `tabItem Group` WHERE name = %s
                UNION ALL
                SELECT ig.name
                FROM `tabItem Group` ig
                INNER JOIN item_group_hierarchy ig_hierarchy ON ig.parent_item_group = ig_hierarchy.name
            )
            SELECT name FROM item_group_hierarchy
        """, (category_id,), as_list=True)

        child_groups = [group[0] for group in child_groups]
        if child_groups:
            placeholders = ", ".join(["%s"] * len(child_groups))
            filters.append(f"i.item_group IN ({placeholders})")

    if brand_id:
        filters.append("i.brand = %s")
    if price_list_id:
        filters.append("ip.price_list = %s")

    where_clause = " AND ".join(filters)
    args = []
    if child_groups:
        args.extend(child_groups)
    if brand_id:
        args.append(brand_id)
    if price_list_id:
        args.append(price_list_id)

    query = f"""
        SELECT 
            i.name AS item_id,
            i.item_name,
            i.image AS item_image,
            i.description AS item_description,
            ip.price_list_rate AS price,
            pl.price_list_name,
            b.name AS brand_name,
            ig.name AS category_name
        FROM 
            `tabItem` i
        LEFT JOIN 
            `tabItem Price` ip ON ip.item_code = i.name
        LEFT JOIN 
            `tabPrice List` pl ON pl.name = ip.price_list
        LEFT JOIN 
            `tabBrand` b ON b.name = i.brand
        LEFT JOIN 
            `tabItem Group` ig ON ig.name = i.item_group
        WHERE 
            {where_clause}
        ORDER BY 
            pl.price_list_name, i.item_name ASC
    """

    items = frappe.db.sql(query, args, as_dict=True)

    return {
        "items": items
    }

