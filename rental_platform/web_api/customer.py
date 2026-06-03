import frappe

# @frappe.whitelist(allow_guest=True)
# def customer_list():
#     cus_name=[]
#     cus_phoneno=[]
#     cus_list=frappe.db.get_all("Customer",fields=["*"])    
#     frappe.local.response['customers']=cus_list
#     for i in cus_list:
#         cus_name.append(i.name)      
#         frappe.local.response['names']=cus_name                   
#         if i.get('mobile_no'):
#             cus_phoneno.append(i.mobile_no)                      
        # for index, customer in enumerate(cus_list, start=1):
        #     customer["index_number"] = f"{index:04d}" 

@frappe.whitelist(allow_guest=True)
def customer_list():
    customers_data = []

    # Get all customers
    cus_list = frappe.db.get_all("Customer", fields=["name", "customer_name", "mobile_no","custom_alternate_number","owner","customer_type", "custom_black_list", "custom_yellow_list" ])

    for cus in cus_list:
        # Fetch related Booking Entry documents
        bookings = frappe.db.get_all(
            "Booking Entry",
            filters={"customer": cus.name},
            fields=["name", "return_status"]
        )

        # Append customer data along with their bookings
        customers_data.append({
            "customer_name": cus.customer_name,
            "customer_id": cus.name,
            "mobile_no": cus.mobile_no,
            "custom_alternate_number": cus.custom_alternate_number,
            "owner": cus.owner,
            "customer_type": cus.customer_type,
            "custom_black_list": cus.custom_black_list,
            "custom_yellow_list": cus.custom_yellow_list,
            "bookings": bookings
        })

    frappe.local.response['customers'] = customers_data
