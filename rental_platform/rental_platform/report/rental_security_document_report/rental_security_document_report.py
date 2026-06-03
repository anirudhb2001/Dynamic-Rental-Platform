# Copyright (c) 2025, nakul@faircodetech.com and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    columns = [
        {"label": "Booking Entry ID", "fieldname": "booking_entry", "fieldtype": "Link", "options": "Booking Entry", "width": 180},
        {"label": "Customer", "fieldname": "customer", "fieldtype": "Data", "width": 180},
        {"label": "Mobile Number", "fieldname": "mobile_number", "fieldtype": "Data", "width": 150},
        {"label": "Security Document Status", "fieldname": "security_document_status", "fieldtype": "Data", "width": 180},
        {"label": "Document Type", "fieldname": "attachment", "fieldtype": "Data", "width": 180},
        {"label": "Method of Collecting", "fieldname": "method_of_collecting", "fieldtype": "Data", "width": 180},
        {"label": "Document Attachment", "fieldname": "document_attachment", "fieldtype": "Attach", "width": 180},
        {"label": "Status", "fieldname": "child_status", "fieldtype": "Data", "width": 120},
    ]

    data = frappe.db.sql("""
        SELECT
            be.name AS booking_entry,
            be.customer AS customer,
            be.custom_mobile_number AS mobile_number,
            be.security_document_status AS security_document_status,
            rsdt.attachment AS attachment,
            rsdt.method_of_collecting AS method_of_collecting,
            rsdt.document_attachment AS document_attachment,
            rsdt.status AS child_status
        FROM
            `tabBooking Entry` be
        LEFT JOIN
            `tabRental Security Document Type` rsdt
        ON
            rsdt.parent = be.name
        WHERE
            be.security_document_status != 'Document Returned'
        ORDER BY
            be.name DESC
    """, as_dict=True)

    return columns, data


