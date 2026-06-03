import frappe
from frappe.utils.pdf import get_pdf

def order_confirmation(doc, method):
    sales_order_name = doc.name
    email = frappe.db.get_value("Customer", {'name': doc.customer}, "custom_email")
    email_template = "confirmation"
    customer = frappe.db.get_value("Customer", {'name': doc.customer}, "customer_name")

    if not email:
        frappe.logger().error(f" No email found for customer {doc.customer}")
        return

    try:
       
        pdf_content = frappe.get_print(doc.doctype, doc.name, print_format="Standard", as_pdf=True)

        
        args = {
            "sales_order_name": sales_order_name,
            "customer": customer,
        }

       
        frappe.sendmail(
            recipients=[email],
            template=email_template,
            args=args,
            subject=f"Booking has been confirmed #{sales_order_name}",
            attachments=[{
                "fname": f"Order_{sales_order_name}.pdf",
                "fcontent": pdf_content,
            }],
            delayed=False,
            now=True
        )

        frappe.logger().info(f"Email successfully sent to: {email}")

    except Exception as e:
        frappe.logger().error(f"Error sending email: {str(e)}")
        frappe.msgprint(f"Error sending email: {str(e)}", indicator="red")
