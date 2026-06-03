// frappe.ui.form.on('Product Bundle', {
//     onload: function(frm) {
//         set_main_item(frm);
//     },
//     refresh: function(frm) {
//         set_main_item(frm);
//     }
// });

// frappe.ui.form.on('Product Bundle Item', {
//     items_add: function(frm, cdt, cdn) {
//         let child = locals[cdt][cdn];
//         let items = frm.doc.items || [];
        
//         // First row should have custom_is_main_item = 1 and be read-only
//         if (items.length === 1) {
//             frappe.model.set_value(cdt, cdn, 'custom_is_main_item', 1);
//             frappe.model.set_df_property('custom_is_main_item', 'read_only', 1, cdt, cdn);
//         } else {
//             frappe.model.set_value(cdt, cdn, 'custom_is_main_item', 0);
//         }
//     },
//     items_remove: function(frm) {
//         set_main_item(frm);
//     }
// });

// function set_main_item(frm) {
//     let items = frm.doc.items || [];

//     items.forEach((row, index) => {
//         if (index === 0) {
//             frappe.model.set_value(row.doctype, row.name, 'custom_is_main_item', 1);
//             frappe.model.set_df_property('custom_is_main_item', 'read_only', 1, row.doctype, row.name);
//         } else {
//             frappe.model.set_value(row.doctype, row.name, 'custom_is_main_item', 0);
//             frappe.model.set_df_property('custom_is_main_item', 'read_only', 0, row.doctype, row.name);
//         }
//     });
// }
frappe.ui.form.on('Product Bundle', {});

frappe.ui.form.on('Product Bundle Item', {
    items_add: function(frm, cdt, cdn) {
        set_main_item(frm);
    },
    items_remove: function(frm, cdt, cdn) {
        set_main_item(frm);
    },
    items_move: function(frm) { 
        set_main_item(frm);
    }
});

function set_main_item(frm) {
    // Ensure items are sorted by idx before setting the first row
    frm.doc.items.sort((a, b) => a.idx - b.idx);

    frm.doc.items.forEach((row, index) => {
        if (index === 0) {  // First row (idx === 1)
            frappe.model.set_value(row.doctype, row.name, 'custom_is_main_item', 1);
            frappe.model.set_df_property('custom_is_main_item', 'read_only', 1, row.doctype, row.name);
        } else {
            frappe.model.set_value(row.doctype, row.name, 'custom_is_main_item', 0);
            frappe.model.set_df_property('custom_is_main_item', 'read_only', 0, row.doctype, row.name);
        }
    });

    frm.refresh_field("items");
}
