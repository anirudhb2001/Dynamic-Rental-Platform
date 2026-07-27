import frappe
@frappe.whitelist()
def get_dashboard_stats():

    # Count Individual Assets from Asset Instance
    available_instances = frappe.db.count("Asset Instance", {"status": "Available"})
    reserved_instances = frappe.db.count("Asset Instance", {"status": "Reserved"})
    rented_instances = frappe.db.count("Asset Instance", {"status": "On Rent"})
    maintenance_instances = frappe.db.count("Asset Instance", {"status": "Maintenance"})

    # Count Quantity Assets from Bin
    quantity_items = frappe.db.sql("""
        SELECT i.name
        FROM tabItem i
        WHERE i.custom_is_rental_asset = 1 AND i.custom_asset_tracking_mode = 'Quantity'
    """, as_dict=True)
    
    quantity_stock = 0
    if quantity_items:
        item_codes = [d.name for d in quantity_items]
        bins = frappe.db.sql("""
            SELECT SUM(actual_qty) as total_qty
            FROM tabBin
            WHERE item_code IN %s
        """, (item_codes,), as_dict=True)
        if bins and bins[0].total_qty:
            quantity_stock = int(bins[0].total_qty)

    # Note: Quantity tracking items booking stats can be aggregated from Rental Bookings
    # For now, Dashboard KPI for quantity just needs available stock. 
    # To be fully accurate, we count reserved/rented from Rental Booking.
    active_qty_bookings = frappe.db.sql("""
        SELECT booking_status, SUM(quantity) as qty
        FROM `tabRental Booking`
        WHERE booking_status IN ('Reserved', 'Picked Up')
        AND item IN %s
        GROUP BY booking_status
    """, (item_codes,) if quantity_items else ([""],), as_dict=True)

    reserved_qty = 0
    rented_qty = 0
    for b in active_qty_bookings:
        if b.booking_status == "Reserved":
            reserved_qty += int(b.qty or 0)
        elif b.booking_status == "Picked Up":
            rented_qty += int(b.qty or 0)

    # Actual available stock is stock minus reserved and rented.
    available_qty = max(0, quantity_stock - reserved_qty - rented_qty)

    return {
        "available": available_instances + available_qty,
        "reserved": reserved_instances + reserved_qty,
        "out_on_rent": rented_instances + rented_qty,
        "maintenance": maintenance_instances
    }