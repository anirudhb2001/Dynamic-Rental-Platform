import frappe
from frappe import _
from frappe.integrations.google_oauth import GoogleOAuth
from frappe.model.document import Document
from frappe.integrations.doctype.google_contacts.google_contacts import sync
from frappe.integrations.doctype.google_contacts.google_contacts import sync_contacts_from_google_contacts 
            
@frappe.whitelist()
def contact_sync(doc, method=None):
    google_contacts = frappe.get_list("Google Contacts", filters={"enable": 1})
    for g_contact in google_contacts:
        sync_contacts_from_google_contacts(g_contact.name)

@frappe.whitelist()
def validate_enable(doc, method=None):
    if doc.enable:
        if frappe.db.exists('Google Contacts', {'enable': 1, 'name': ['!=', doc.name]}):
            frappe.throw('Enabled Google Contact Already Exists')
            
@frappe.whitelist()
def validate_contact_name(doc,method=None):
    if not doc.first_name:
        doc.first_name=doc.full_name or doc.name
        