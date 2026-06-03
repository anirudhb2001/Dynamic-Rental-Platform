frappe.ui.form.on("Rental Order", {

    pickup_date(frm){
        calculate_days(frm);
        calculate_total(frm);
    },

    return_date(frm){
        calculate_days(frm);
        calculate_total(frm);
    },

    rental_days(frm){
        calculate_total(frm);
    }

});


frappe.ui.form.on("Rental Order Item", {

    rental_item(frm, cdt, cdn){

        let row = locals[cdt][cdn];

        if(!row.rental_item) return;

        frappe.db.get_doc(
            "Rental Item",
            row.rental_item
        ).then(doc=>{

            frappe.model.set_value(
                cdt,
                cdn,
                "daily_rate",
                doc.daily_rate || 0
            );

            frappe.model.set_value(
                cdt,
                cdn,
                "deposit",
                doc.security_deposit || 0
            );

            calculate_total(frm);

        });

    },

    quantity(frm){
        calculate_total(frm);
    },

    daily_rate(frm){
        calculate_total(frm);
    },

    deposit(frm){
        calculate_total(frm);
    }

});


function calculate_days(frm){

    if(frm.doc.pickup_date && frm.doc.return_date){

        let days =
        frappe.datetime.get_day_diff(
            frm.doc.return_date,
            frm.doc.pickup_date
        );

        frm.set_value(
            "rental_days",
            days > 0 ? days : 1
        );
    }
}


function calculate_total(frm){

    let total_amount = 0;
    let total_deposit = 0;
    let total_rate = 0;

    (frm.doc.items || []).forEach(row=>{

        let qty = row.quantity || 1;

        let rate = row.daily_rate || 0;

        let deposit = row.deposit || 0;

        let days = frm.doc.rental_days || 1;

        let row_total =
            (rate * qty * days)
            + deposit;

        frappe.model.set_value(
            row.doctype,
            row.name,
            "total",
            row_total
        );

        total_amount += row_total;

        total_deposit += deposit;

        total_rate += rate;

    });

    frm.set_value(
        "price_per_day",
        total_rate
    );

    frm.set_value(
        "deposit",
        total_deposit
    );

    frm.set_value(
        "total_amount",
        total_amount
    );

    frm.refresh_field("items");
}