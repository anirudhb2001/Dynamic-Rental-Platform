import frappe
from frappe import _
from datetime import datetime, timedelta

@frappe.whitelist(allow_guest=True)
def get_booking_entries_with_financial_details(customer=None, return_status=None, from_date=None, to_date=None):
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

    where_clause = " AND ".join(conditions)

    query = f"""
        SELECT
            be.name AS booking_entry,
            be.customer,
            be.rental_from_date,
            be.rental_to_date,
            be.actual_to_date,
            be.status AS booking_status,
            be.return_status AS return_status,
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
                'booking_status': row['booking_status'],
                'return_status': row['return_status'],
                'date_status': date_status,
                'sales_invoices': [],
                'rental_items': rental_items,
                'total_agreement_amount': 0.0,
                'amount_received': 0.0,
                'pending_amount': 0.0,
                'payment_status': 'Pending',
                'security_document_status': row.get('security_document_status')
            }

        if row['sales_invoice']:
            booking_data[booking_entry]['sales_invoices'].append({
                'sales_invoice': row['sales_invoice'],
                'invoice_date': row['invoice_date'],
                'invoice_amount': row['invoice_amount'],
                'invoice_outstanding': row['invoice_outstanding'],
                'invoice_status': row['invoice_status']
            })

            invoice_amount = row['invoice_amount'] or 0.0
            outstanding_amount = row['invoice_outstanding'] or 0.0
            amount_received = invoice_amount - outstanding_amount

            booking_data[booking_entry]['total_agreement_amount'] += invoice_amount
            booking_data[booking_entry]['amount_received'] += amount_received

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
