import frappe
from frappe import _
from datetime import datetime, timedelta
from rental_platform.web_api.permission import get_sql_match_conditions

@frappe.whitelist(allow_guest=True)
def get_booking_entries_with_financial_details(customer=None, return_status=None, from_date=None, to_date=None, status=None):
    today = datetime.now().date()
    tomorrow = today + timedelta(days=1)

    conditions = ["be.status NOT IN ('Cancelled')"]
    params = []

    if customer:
        conditions.append("be.customer = %s")
        params.append(customer)

    if return_status:
        conditions.append("be.return_status = %s")
        params.append(return_status)

    if from_date:
        conditions.append("be.rental_from_date >= %s")
        params.append(from_date)

    if to_date:
        conditions.append("be.rental_from_date <= %s")
        params.append(to_date)

    if status:
        if isinstance(status, list):
            conditions.append(f"be.status IN ({', '.join(['%s'] * len(status))})")
            params.extend(status)
        else:
            conditions.append("be.status = %s")
            params.append(status)
            
    # Property isolation
    match_cond = get_sql_match_conditions("Booking Entry", alias="be")
    if match_cond:
        conditions.append(match_cond)
            
    where_clause = " AND ".join(conditions) if conditions else "1=1"

    query = f"""
        SELECT
            be.name AS booking_entry,
            be.customer,
            be.rental_from_date,
            be.rental_to_date,
            be.actual_to_date,
            be.status AS booking_status,
            be.return_status AS return_status,
            be.event_date,
            be.venue,
            be.hotel_property,
            be.time_slot,
            be.event_type,
            si.name AS sales_invoice,
            si.posting_date AS invoice_date,
            si.grand_total AS invoice_amount,
            si.outstanding_amount AS invoice_outstanding,
            si.status AS invoice_status,
            be.security_document_status AS security_document_status
        FROM
            `tabBooking Entry` be
        LEFT JOIN
            `tabSales Invoice` si
        ON
            si.custom_booking_entry = be.name
        WHERE
            {where_clause}
        ORDER BY
            be.name, si.posting_date ASC
    """

    results = frappe.db.sql(query, params, as_dict=True)
    
    # Get all booking entry names for batch processing
    booking_entry_names = list(set([row['booking_entry'] for row in results]))
    
    # BATCH FETCH: Get all rental items in one query
    rental_items_by_booking = {}
    if booking_entry_names:
        all_rental_items = frappe.get_all(
            "Booking details Table",
            filters={"parent": ["in", booking_entry_names]},
            fields=["parent", "rental_item_id", "item_name", "pricelist_name", 
                    "price", "quantity", "stock_quantity", "amount", "returned_item"],
            order_by="parent, idx ASC"
        )
        
        for item in all_rental_items:
            parent = item.pop("parent")
            if parent not in rental_items_by_booking:
                rental_items_by_booking[parent] = []
            rental_items_by_booking[parent].append(item)
    
    # BATCH FETCH: Get all stock entries in one query
    stock_entries_by_booking = {}
    if booking_entry_names:
        stock_entries = frappe.db.sql("""
            SELECT 
                se.custom_booking_entry,
                sed.item_code,
                sed.s_warehouse
            FROM 
                `tabStock Entry` se
            INNER JOIN 
                `tabStock Entry Detail` sed ON sed.parent = se.name
            WHERE 
                se.custom_booking_entry IN %(booking_entries)s
                AND se.custom_is_return = 0
        """, {"booking_entries": booking_entry_names}, as_dict=True)
        
        for entry in stock_entries:
            booking = entry['custom_booking_entry']
            if booking not in stock_entries_by_booking:
                stock_entries_by_booking[booking] = {}
            stock_entries_by_booking[booking][entry['item_code']] = entry['s_warehouse']
    
    # BATCH FETCH: Get all item brands in one query
    all_item_names = list(set([
        item['item_name'] 
        for items in rental_items_by_booking.values() 
        for item in items
    ]))
    
    item_brands = {}
    if all_item_names:
        items_data = frappe.get_all(
            "Item",
            filters={"name": ["in", all_item_names]},
            fields=["name", "brand"]
        )
        item_brands = {item['name']: item.get('brand', 'No Brand') for item in items_data}

    # BATCH FETCH: Get all sales orders in one query to calculate total amount
    sales_orders_by_booking = {}
    if booking_entry_names:
        all_sos = frappe.get_all(
            "Sales Order",
            filters={"custom_booking_entry": ["in", booking_entry_names], "docstatus": 1},
            fields=["name", "custom_booking_entry", "grand_total"]
        )
        for so in all_sos:
            b_entry = so.pop("custom_booking_entry")
            if b_entry not in sales_orders_by_booking:
                sales_orders_by_booking[b_entry] = []
            sales_orders_by_booking[b_entry].append(so)

    # BATCH FETCH: Get all payment entries in one query
    payment_entries_by_booking = {}
    if booking_entry_names:
        all_payments = frappe.get_all(
            "Payment Entry",
            filters={"custom_booking_entry": ["in", booking_entry_names], "docstatus": 1},
            fields=["name", "custom_booking_entry", "posting_date", "paid_amount", "payment_type"]
        )
        for pe in all_payments:
            b_entry = pe.pop("custom_booking_entry")
            if b_entry not in payment_entries_by_booking:
                payment_entries_by_booking[b_entry] = []
            payment_entries_by_booking[b_entry].append(pe)

    booking_data = {}
    for row in results:
        booking_entry = row['booking_entry']
        if booking_entry not in booking_data:
            rental_from_date = row.get('rental_from_date')
            actual_to_date = row.get('actual_to_date')

            if rental_from_date:
                rental_from_date = rental_from_date.date() if isinstance(rental_from_date, datetime) else rental_from_date
            if actual_to_date:
                actual_to_date = actual_to_date.date() if isinstance(actual_to_date, datetime) else actual_to_date

            date_status = "Unknown"

            if rental_from_date and actual_to_date:
                if actual_to_date == today:
                    date_status = "Due Today"
                elif actual_to_date == tomorrow:
                    date_status = "Due Tomorrow"
                elif rental_from_date <= today <= actual_to_date:
                    date_status = "Active"
                elif today < rental_from_date:
                    date_status = "Upcoming"
                elif today > actual_to_date:
                    date_status = "Overdue"
            elif row.get("event_date"):
                # Handle venue reservation dates
                event_date = row.get("event_date")
                if isinstance(event_date, datetime):
                    event_date = event_date.date()
                if event_date == today:
                    date_status = "Event Today"
                elif event_date == tomorrow:
                    date_status = "Event Tomorrow"
                elif today < event_date:
                    date_status = "Upcoming"
                elif today > event_date:
                    date_status = "Completed"
            elif not rental_from_date:
                date_status = "No Rental From Date"
            elif not actual_to_date:
                date_status = "No Actual To Date"

            # Get rental items from batch fetch
            rental_items = rental_items_by_booking.get(booking_entry, [])
            
            # Add warehouse info from batch fetch
            item_warehouse_map = stock_entries_by_booking.get(booking_entry, {})
            for item in rental_items:
                item_code = item.get("item_name")
                item["warehouse"] = item_warehouse_map.get(item_code, "Not Found")
                item["brand"] = item_brands.get(item_code, "No Brand")

            booking_data[booking_entry] = {
                'booking_entry': booking_entry,
                'customer': row['customer'],
                'rental_from_date': rental_from_date,
                'rental_to_date': row['rental_to_date'],
                'actual_to_date': row['actual_to_date'],
                'event_date': row.get('event_date'),
                'venue': row.get('venue'),
                'hotel_property': row.get('hotel_property'),
                'time_slot': row.get('time_slot'),
                'event_type': row.get('event_type'),
                'booking_status': row['booking_status'],
                'return_status': row['return_status'],
                'date_status': date_status,
                'sales_invoices': [],
                'payment_entries': payment_entries_by_booking.get(booking_entry, []),
                'rental_items': rental_items,
                'total_agreement_amount': 0.0,
                'amount_received': 0.0,
                'pending_amount': 0.0,
                'payment_status': 'Pending',
                'security_document_status': row.get('security_document_status')
            }

            # Calculate total agreement amount from all linked Sales Orders
            total_so_amount = sum([so.get('grand_total', 0.0) for so in sales_orders_by_booking.get(booking_entry, [])])
            booking_data[booking_entry]['total_agreement_amount'] = total_so_amount

            # Add payment amounts to amount_received
            for pe in payment_entries_by_booking.get(booking_entry, []):
                booking_data[booking_entry]['amount_received'] += pe.get('paid_amount', 0.0)

        if row['sales_invoice']:
            booking_data[booking_entry]['sales_invoices'].append({
                'sales_invoice': row['sales_invoice'],
                'invoice_date': row['invoice_date'],
                'invoice_amount': row['invoice_amount'],
                'invoice_outstanding': row['invoice_outstanding'],
                'invoice_status': row['invoice_status']
            })

    for entry in booking_data.values():
        entry['pending_amount'] = entry['total_agreement_amount'] - entry['amount_received']
        if entry['pending_amount'] == 0 and entry['total_agreement_amount'] > 0:
            entry['payment_status'] = 'Fully Paid'
        elif entry['amount_received'] > 0:
            entry['payment_status'] = 'Partially Paid'
        else:
            entry['payment_status'] = 'Pending'

    return list(booking_data.values())

#function to update booking entry status
@frappe.whitelist()
def get_booking_entry_status():
    try:
        booking_entries = frappe.get_all(
            "Booking Entry",
            filters={},
            fields=["name", "status"],
            order_by="creation desc"
        )

        return {"booking_entries": booking_entries}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Fetch Booking Entry Status Error")
        return {"error": f"An error occurred: {str(e)}"}

@frappe.whitelist(allow_guest=True)
def get_operational_dashboard_summary(hotel_property=None):
    try:
        today = datetime.now().date()
        
        # 1. Fetch relevant booking entries
        conditions = ["be.status NOT IN ('Cancelled')"]
        params = []
        
        if hotel_property and hotel_property != "All Properties":
            conditions.append("be.hotel_property = %s")
            params.append(hotel_property)
            
        # Property isolation
        match_cond = get_sql_match_conditions("Booking Entry", alias="be")
        if match_cond:
            conditions.append(match_cond)
            
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # We need custom_booking_entry on Sales Invoice. 
        # But for performance and since some bookings might not have invoices yet, 
        # we'll fetch bookings and invoices separately or with a LEFT JOIN.
        
        be_query = f"""
            SELECT
                be.name AS booking_entry,
                be.customer,
                be.event_date,
                be.time_slot,
                be.venue,
                be.hotel_property,
                be.event_type,
                be.guest_count,
                be.status AS booking_status
            FROM
                `tabBooking Entry` be
            WHERE
                {where_clause}
            ORDER BY
                be.event_date ASC, be.creation ASC
        """
        all_bookings = frappe.db.sql(be_query, params, as_dict=True)
        
        today_events = []
        upcoming_reservations = []
        
        for b in all_bookings:
            event_date = b.get("event_date")
            if isinstance(event_date, datetime):
                event_date = event_date.date()
                
            b["date"] = event_date
            
            if event_date == today:
                today_events.append(b)
            elif event_date and event_date > today:
                upcoming_reservations.append(b)
                
        # Limit upcoming reservations to next 10 for dashboard
        upcoming_reservations = upcoming_reservations[:10]
        
        # 2. Venue Availability
        venue_conditions = {"is_sales_item": 0, "hotel_property": ["!=", ""]} # Assuming venues are non-sales or just have a hotel_property
        if hotel_property and hotel_property != "All Properties":
            venue_conditions["hotel_property"] = hotel_property
            
        # Get custom fields if they exist, otherwise fallback
        has_venue_status = frappe.db.has_column("Item", "venue_status")
        fields = ["name as venue_name", "hotel_property"]
        if has_venue_status:
            fields.append("venue_status")
            
        # Natively secured because frappe.get_all will apply User Permissions to Item.hotel_property
        venues = frappe.get_all("Item", filters=venue_conditions, fields=fields)
        
        venue_availability = []
        total_bookable_venues = 0
        available_venues_count = 0
        
        today_booked_venues = [b.venue for b in today_events if b.venue]
        
        for v in venues:
            status = v.get("venue_status") or "Available"
            
            if status in ["Available", ""]:
                total_bookable_venues += 1
                
                if v.venue_name in today_booked_venues:
                    current_status = "BOOKED"
                else:
                    current_status = "AVAILABLE"
                    available_venues_count += 1
            else:
                # Maintenance, Blocked, Inactive
                current_status = status.upper()
                
            venue_availability.append({
                "venue": v.venue_name,
                "property": v.hotel_property,
                "status": current_status
            })
            
        # 3. Payment Overview
        so_query = f"""
            SELECT SUM(so.grand_total) as total_booking_value
            FROM `tabSales Order` so
            INNER JOIN `tabBooking Entry` be ON so.custom_booking_entry = be.name
            WHERE {where_clause} AND so.docstatus = 1
        """
        so_totals = frappe.db.sql(so_query, params, as_dict=True)[0]
        total_booking_value = so_totals.get("total_booking_value") or 0.0

        pe_query = f"""
            SELECT SUM(pe.paid_amount) as advance_received
            FROM `tabPayment Entry` pe
            INNER JOIN `tabBooking Entry` be ON pe.custom_booking_entry = be.name
            WHERE {where_clause} AND pe.docstatus = 1
        """
        pe_totals = frappe.db.sql(pe_query, params, as_dict=True)[0]
        advance_received = pe_totals.get("advance_received") or 0.0

        outstanding_amount = total_booking_value - advance_received
        if outstanding_amount < 0:
            outstanding_amount = 0.0
        
        pending_payments_count = frappe.db.sql(f"""
            SELECT COUNT(DISTINCT be.name)
            FROM `tabBooking Entry` be
            INNER JOIN `tabSales Order` so ON so.custom_booking_entry = be.name
            WHERE {where_clause} AND so.docstatus = 1
            AND (
                SELECT COALESCE(SUM(so2.grand_total), 0)
                FROM `tabSales Order` so2
                WHERE so2.custom_booking_entry = be.name AND so2.docstatus = 1
            ) > (
                SELECT COALESCE(SUM(pe.paid_amount), 0)
                FROM `tabPayment Entry` pe
                WHERE pe.custom_booking_entry = be.name AND pe.docstatus = 1
            )
        """, params)[0][0]
        
        # Get total time slots available
        time_slot_count = frappe.db.count("Time Slot") or 1
        total_bookable_time_slots = total_bookable_venues * time_slot_count
        booked_time_slots = len(today_events)
        
        return {
            "kpis": {
                "today_events": len(today_events),
                "upcoming_events": len(upcoming_reservations),
                "available_venues": available_venues_count,
                "total_venues": total_bookable_venues,
                "total_bookable_time_slots": total_bookable_time_slots,
                "booked_time_slots": booked_time_slots,
                "pending_payments": pending_payments_count,
                "outstanding_amount": outstanding_amount
            },
            "today_events": today_events,
            "upcoming_reservations": upcoming_reservations,
            "venue_availability": venue_availability,
            "payment_summary": {
                "total_booking_value": total_booking_value,
                "advance_received": advance_received,
                "outstanding_amount": outstanding_amount
            }
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Fetch Operational Dashboard Summary Error")
        return {"error": f"An error occurred: {str(e)}"}
