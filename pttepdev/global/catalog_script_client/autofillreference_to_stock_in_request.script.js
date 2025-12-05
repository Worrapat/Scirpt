function onLoad() {
	function tryParseJSON(str) {
		try {
			return JSON.parse(str);
		} catch (e) {
			return null;
		}
	}

	var url = top.location.href;
	var change = new URLSearchParams(url).get('sysparm_change');

	if (change) {
		g_form.setValue('reference_to_stock_in_request', change);

		g_form.getReference('reference_to_stock_in_request', function (caller) {
			// ---- BASIC FIELDS ----
			g_form.setValue('u_requested_for', caller.u_requested_for);
			g_form.setValue('u_order_date', caller.u_order_date);
			g_form.setValue('description', caller.description);
			g_form.setValue('u_require_date', caller.u_request_type);
			g_form.setValue('u_so_po_no_', caller.u_po_no);
			g_form.setValue('u_supplier', caller.u_supplier);
			g_form.setValue('u_budget_holder', caller.u_budget_holder);

			// ---- SUMMARY FIX ----
			var u_ticket_summary = caller.u_ticket_summary;
			var ticket_summary = tryParseJSON(u_ticket_summary);

			// Force to string only
			var summary_html = ticket_summary ? JSON.stringify(ticket_summary) : u_ticket_summary;
			console.log('summary_html : ' + summary_html + ' \n' + typeof summary_html);

			g_form.setValue('u_ticket_summary', summary_html + '');
		});

		// ---- AJAX MULTIROW ----
		var ajax = new GlideAjax('ISUtilsBase');
		ajax.addParam('sysparm_name', 'getIST_multirow');
		ajax.addParam('sysparm_id', change);
		ajax.addParam('sysparm_type', 'stock_in');
		ajax.getXMLAnswer(function (answer) {
			g_form.setValue('istationary_stock_in_item_list_cart', answer);
		});
	}
}

// function onLoad() {
// 	var url = top.location.href;
// 	var change = new URLSearchParams(url).get('sysparm_change');

// 	if (change != '') {
// 		g_form.setValue('reference_to_stock_in_request', change);
// 		var caller = g_form.getReference('reference_to_stock_in_request', doAlert);
// 		var id = change;
// 		var ajax = new GlideAjax('ISUtilsBase');
// 		ajax.addParam('sysparm_name', 'getIST_multirow');
// 		ajax.addParam('sysparm_id', id);
// 		ajax.addParam('sysparm_type', 'stock_in');
// 		ajax.getXMLAnswer(function (answer) {
// 			answer = JSON.stringify(JSON.parse(answer));
// 			// console.info("MSV Get Val : " + answer);
// 			g_form.setValue('istationary_stock_in_item_list_cart', answer);
// 		});
// 	}

// 	function doAlert(caller) {
// 		g_form.setValue('u_requested_for', caller.u_requested_for);
// 		g_form.setValue('u_order_date', caller.u_order_date);
// 		g_form.setValue('description', caller.description);
// 		g_form.setValue('u_require_date', caller.u_request_type);
// 		g_form.setValue('u_so_po_no_', caller.u_po_no);
// 		g_form.setValue('u_supplier', caller.u_supplier);
// 		g_form.setValue('u_budget_holder', caller.u_budget_holder);

// 		var ajax = new GlideAjax('ISUtilsBase');
// 		ajax.addParam('sysparm_name', 'getBudgetYear');
// 		ajax.addParam('sysparm_budget_holder_id', caller.u_budget_holder);
// 		ajax.getXMLAnswer(function (answer) {
// 			answer = JSON.stringify(JSON.parse(answer));
// 			// console.info("MSV Get Val : " + answer);
// 			// alert('Year : '+answer);
// 			g_form.setValue('budget_year', answer);
// 		});

// 		g_form.setValue('u_budget_item', caller.u_budget_item);
// 		g_form.setValue('u_activities', caller.u_activities);
// 		g_form.setValue('u_grand_price', caller.u_grand_price);
// 		var total_display = parseFloat(caller.u_grand_price)
// 			.toFixed(2)
// 			.toString()
// 			.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// 		g_form.setValue('u_grand_price_display', '฿ ' + total_display);
// 		g_form.setValue('u_delivery_location', caller.u_delivery_location);
// 		g_form.setValue('u_delivery_date', caller.u_delivery_date);
// 		g_form.setValue('u_payment_method', caller.u_payment_type);
// 		g_form.setValue('u_ticket_summary', caller.u_ticket_summary); // Uc-Code
// 	}
// }
