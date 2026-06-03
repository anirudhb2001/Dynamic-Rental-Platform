// frappe.ui.form.on('Sales Invoice', {
//     refresh: function (frm) {
//         if (!frm.is_new() && frm.doc.docstatus === 0) {
//             if (frm.doc.otp_verified) {
//                 frm.page.set_primary_action('');  
//             } else {
//                 frm.page.set_primary_action(__('Submit'), () => {
//                     const hasClosedStatus = frm.doc.custom_rental_security_documents?.some(row => row.status === 'Closed');
//                     if (hasClosedStatus && !frm.otp_verified) {
//                         frappe.validated = false;  
//                         send_otp_request(frm);
//                     } else {
//                         frm.savesubmit();  
//                     }
//                 });
//             }
//         }
//     }
// });


// function send_otp_request(frm) {
//     frappe.call({
//         method: "rental_platform.rental_platform.custom_sales_invoice.send_otp_to_customer",
//         args: { sales_invoice_id: frm.doc.name },
//         callback: function(response) {
//             if (response.message.status === "success") {
//                 frappe.show_alert(response.message.message);
//                 show_otp_dialog(frm);
//                 frm.reload_doc(); 
//             } else {
//                 frappe.show_alert(__('Failed to send OTP.'));
//             }
//         }
//     });
// }

// function show_otp_dialog(frm) {
//     frappe.call({
//         method: "frappe.client.get",
//         args: {
//             doctype: "Customer",
//             name: frm.doc.customer
//         },
//         callback: function(response) {
//             let customer_doc = response.message;
//             let phone_number = customer_doc.mobile_no || customer_doc.phone;

//             if (!phone_number) {
//                 frappe.show_alert(__('Customer does not have a phone number.'));
//                 return;
//             }

//             let dialog = new frappe.ui.Dialog({
//                 title: __('OTP Verification'),
//                 fields: [
//                     { label: __('Phone'), fieldname: 'phone', fieldtype: 'Data', reqd: 1, read_only: 1, default: phone_number },
//                     { label: __('OTP'), fieldname: 'otp', fieldtype: 'Data', reqd: 1 },
//                     {
//                         label: __('Verify and Save'),
//                         fieldname: 'verify_save',
//                         fieldtype: 'Button',
//                         click: function () {
//                             let otp_value = dialog.get_value('otp');
//                             if (!otp_value) {
//                                 frappe.show_alert(__('Please enter the OTP.'));
//                                 return;
//                             }
//                             verify_otp_code(phone_number, otp_value, frm, dialog);
//                         }
//                     }
//                 ]
//             });
//             dialog.show();
//         }
//     });
// }


// function verify_otp_code(phone, otp, frm, dialog) {
//     frappe.call({
//         method: "rental_platform.rental_platform.custom_sales_invoice.verify_otp_by_phone",
//         args: { phone: phone, otp: otp, sales_invoice_id: frm.doc.name },
//         callback: function(response) {
//             if (response.message.verified) {
//                 frappe.show_alert(response.message.message);
//                 frm.otp_verified = true;
//                 dialog.hide();
//                 frappe.validated = true;
//                 frm.savesubmit(); 
//             } else {
//                 frappe.show_alert(__('Invalid OTP or Phone Number. Please try again.'));
//             }
//         }
//     });
// }




