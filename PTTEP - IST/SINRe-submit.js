/***DO NOT REMOVE OR MODIFY THIS SECTION!!! Automatically added by "Force population of record producer used" business rule. 
Forces population of this record producer sys_id into the target record for reporting purposes.***/
current.u_record_producer = '8efa95521b522450345977741a4bcb69';
//#region ENH-iStationery smart stock 2025

//#region Utility Functions

function mapProducerToRequest(target, producer) {
	target.u_service_type = 'stock_in_request';
	target.u_requested_for = producer.u_requested_for;
	target.short_description = producer.u_activities.getDisplayValue();
	target.u_payment_type = producer.u_payment_method;
	target.u_actual_amount = producer.u_grand_price;
	target.u_po_no = producer.u_so_po_no_;
	target.u_order_date = producer.u_order_date;
	target.u_supplier = producer.u_supplier;
	target.u_request_type = producer.u_request_type;
	target.u_budget_holder = producer.u_budget_holder;
	target.u_budget_type = producer.u_budget_type;
	target.u_budget_item = producer.u_budget_item;
	target.u_activities = producer.u_activities;
	target.u_delivery_date = producer.u_delivery_date;
	target.u_delivery_location = producer.u_delivery_location;
	target.description = producer.description;
	target.u_budget_year = producer.budget_year;
}

function deleteLineItems(poNumber) {
	var gr = new GlideRecord('u_ist_stock_in_line_item');
	gr.addQuery('u_order', producer.reference_to_stock_in_request);
	gr.query();
	while (gr.next()) {
		new ISUtilsBase().deletePo_qty(gr.u_item, gr.u_quantity, poNumber);
		gr.deleteRecord();
	}
}

function createLineItems() {
	var usage = producer.istationary_stock_in_item_list_cart;
	var count = producer.istationary_stock_in_item_list_cart.getRowCount();
	gs.info(' STEP 2 - createLineItems : ' + usage + 'Length : ' + count);
	var rows = [];
	var lineItemObjects = [];
	var lineItem = new GlideRecord('u_ist_stock_in_line_item');

	for (var i = 0; i < count; i++) {
		var item = new GlideRecord('u_istationery_stock_in');
		item.addQuery('sys_id', usage[i].u_description_sin);
		item.query();

		while (item.next()) {
			var nameItem = item.name.toString();
			var stockInCost = item.u_stock_in_unit_cost.toString();
			var unitPrice = usage[i].u_unit_price;
			var order = item.order.toString();

			// For summary
			rows.push({
				description: nameItem,
				stockInCost: stockInCost,
				unitPrice: unitPrice,
				order: order,
			});

			// console.log("descriptionMap[nameItem]: " + descriptionMap[nameItem]);
			// Map UC Code from HTML.
			var ucCode = descriptionMap[nameItem.toLowerCase().trim()] || 'Out of case';

			// gs.info('current.sys_id : ' + current.sys_id);

			var obj = {
				// u_order: current, // Test Ref Stock-In Request
				u_order: current.sys_id, // Ref Stock-In Request
				u_po_line: i + 1,
				u_item: usage[i].u_description_sin,
				u_name: nameItem,
				u_received_amount: 0,
				u_quantity: usage[i].u_qty,
				u_unit: item.u_stock_in_unit.toString(),
				u_total_amount: usage[i].u_qty * parseFloat(stockInCost.replace(/,/g, '')),
				u_unit_cost: unitPrice,
				u_uc_code: ucCode,
			};

			gs.info(' STEP 3 - obj : ' + JSON.stringify(obj));

			new ISUtilsBase().addPo_qty(usage[i].u_description_sin, usage[i].u_qty, current.u_po_no);

			lineItemObjects.push(obj);
		}
	}

	// --- STEP 4: Build SummaryHTML ---
	lineItemObjects.forEach(function (obj) {
		var grUISI = new GlideRecord('u_istationery_stock_in');
		grUISI.addQuery('name', obj.u_name);
		grUISI.orderBy('name');
		grUISI.orderByDesc('order');
		grUISI.query();

		var currentRows = [];

		switch (obj.u_uc_code) {
			case 'UC-001':
				while (grUISI.next()) {
					var isActive = grUISI.getDisplayValue('active');
					currentRows.push({
						sys_id: grUISI.getUniqueValue(),
						description: grUISI.name.toString(),
						stockInCost: grUISI.u_stock_in_unit_cost.getDisplayValue(),
						unitPrice: obj.u_unit_cost,
						ucCode: obj.u_uc_code,
						order: grUISI.order.toString() || '',
						active: isActive,
						itemUpdate: true,
						enableLink: true,
					});
				}
				break;
			case 'UC-002':
				var orderCounter = 100;
				var maxOrder = 0;

				// Step 1: หาค่า maxOrder ปัจจุบัน
				while (grUISI.next()) {
					var currentOrder = parseInt(grUISI.order || 0);
					if (currentOrder > maxOrder) maxOrder = currentOrder;
				}

				grUISI.query(); // reset query cursor

				// Step 2: เพิ่ม rows
				while (grUISI.next()) {
					var inactiveOrder = orderCounter;
					currentRows.push({
						sys_id: grUISI.getUniqueValue(),
						description: grUISI.name.toString(),
						stockInCost: grUISI.u_stock_in_unit_cost.getDisplayValue(),
						unitPrice: obj.u_unit_cost,
						ucCode: obj.u_uc_code,
						order: inactiveOrder,
						active: 'false',
						enableLink: true,
					});
					orderCounter += 100;
				}

				gs.info('orderCounter : ' + orderCounter);

				// Step 3: Record ใหม่ (active)
				currentRows.push({
					sys_id: obj.u_item,
					description: obj.u_name,
					stockInCost: obj.u_unit_cost,
					unitPrice: obj.u_unit_cost,
					ucCode: obj.u_uc_code,
					order: orderCounter,
					itemUpdate: true,
					active: 'true',
				});
				break;

			case 'UC-003':
				var totalCount = grUISI.getRowCount();
				var orderCounter = totalCount;

				while (grUISI.next()) {
					var credit = parseInt(grUISI.u_credit_avaliable || 0);
					var isActive = credit === 0 ? 'true' : 'false';

					// order 300 ---> 2  record
					var orderValue = orderCounter * 100;

					currentRows.push({
						sys_id: grUISI.getUniqueValue(),
						description: grUISI.name.toString(),
						stockInCost:
							credit === 0 ? obj.u_unit_cost : grUISI.u_stock_in_unit_cost.getDisplayValue(),
						unitPrice: obj.u_unit_cost,
						ucCode: obj.u_uc_code,
						u_credit_avaliable: credit,
						order: orderValue,
						active: isActive,
						itemUpdate: isActive === 'true',
						enableLink: true,
					});
					orderCounter--;
				}

				break;

			case 'UC-004':
				var orderCounter = 100;
				var records = [];

				while (grUISI.next()) {
					var credit = parseInt(grUISI.u_credit_avaliable || 0);
					currentRows.push({
						sys_id: grUISI.getUniqueValue(),
						description: grUISI.name.toString(),
						stockInCost: grUISI.u_stock_in_unit_cost.getDisplayValue(),
						unitPrice: obj.u_unit_cost,
						ucCode: obj.u_uc_code,
						order: orderCounter,
						active: 'false',
						enableLink: true,
					});
					orderCounter += 100;
					records.push(grUISI);
				}

				// เพิ่ม record ใหม่ถ้า credit != 0
				if (records.length > 0 && parseInt(records[0].u_credit_avaliable || 0) != 0) {
					currentRows.push({
						sys_id: obj.u_item,
						description: obj.u_name,
						stockInCost: obj.u_unit_cost,
						unitPrice: obj.u_unit_cost,
						ucCode: obj.u_uc_code,
						order: orderCounter,
						itemUpdate: true,
						active: 'true',
					});
				}
				break;

			default:
				while (grUISI.next()) {
					var isActive = grUISI.getDisplayValue('active');
					currentRows.push({
						sys_id: grUISI.getUniqueValue(),
						description: grUISI.name.toString(),
						stockInCost: grUISI.u_stock_in_unit_cost.getDisplayValue(),
						unitPrice: obj.u_unit_cost,
						ucCode: obj.u_uc_code,
						order: grUISI.order.toString() || '',
						active: isActive,
						enableLink: true,
					});
				}
				break;
		}

		var summaryHTML = buildTicketSummary(currentRows);

		// --- build lineItem record ---
		lineItem.initialize();

		lineItem.u_order = obj.u_order;
		lineItem.u_po_line = obj.u_po_line;
		lineItem.u_item = obj.u_item;
		lineItem.u_name = obj.u_name;
		lineItem.u_received_amount = obj.u_received_amount;
		lineItem.u_quantity = obj.u_quantity;
		lineItem.u_unit = obj.u_unit;
		lineItem.u_total_amount = obj.u_total_amount;
		lineItem.u_unit_cost = obj.u_unit_cost;
		lineItem.u_ticket_summary = summaryHTML;
		lineItem.u_uc_code = (obj.u_uc_code || 'Out of case').toString();

		// Clean log
		gs.info(`LineItem Debug:
	  Name       : ${obj.u_name}
	  UC Code    : ${lineItem.u_uc_code}
	  Quantity   : ${obj.u_quantity}
	  Unit Cost  : ${lineItem.u_unit_cost}
	  Total Amt  : ${lineItem.u_total_amount}
	  TicketSummary:
	${summaryHTML}`);

		lineItem.insert();
	});
}

var descriptionMap = {};

var regex = /<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>.*?<\/td>/g;

var match;

var ticket_summary = producer.u_ticket_summary;
gs.info('prerequisite : ' + ticket_summary);

while ((match = regex.exec(ticket_summary)) !== null) {
	var desc = match[1].trim();
	var uc = match[2].trim();
	descriptionMap[desc.toLowerCase()] = uc; // normalize to lower case
	gs.info(' STEP 1 - descriptionMap : ' + desc + ' → ' + uc);
}

function buildTicketSummary(rows) {
	gs.info(' STEP 4 - buildTicketSummary : ' + rows);
	function numberWithCommas(price) {
		var parts = price.toFixed(2).split('.');
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		return parts.join('.');
	}

	var html =
		'<table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif; font-size:14px;">' +
		'<colgroup>' +
		'<col style="width:40%">' +
		'<col style="width:20%">' +
		'<col style="width:20%">' +
		'<col style="width:10%">' +
		'<col style="width:10%">' +
		'</colgroup>' +
		'<thead><tr style="background-color: #297bd8; color:#ffffff;">' +
		'<th style="border:1px solid #ddd; padding:8px">Description</th>' +
		'<th style="border:1px solid #ddd; padding:6px">Stock-In Unit Cost (Excl. VAT)</th>' +
		'<th style="border:1px solid #ddd; padding:6px">User Edit Price</th>' +
		'<th style="border:1px solid #ddd; padding:6px">Active</th>' +
		'<th style="border:1px solid #ddd; padding:6px">Order</th>' +
		'</tr></thead><tbody>';

	rows.forEach(function (r) {
		// Style ของ row
		var rowStyle = 'text-align:center;';
		if (r.itemUpdate === true) {
			rowStyle += 'background-color:#ffe599; font-weight:bold;';
		}

		// Base URL
		var instanceUrl = gs.getProperty('glide.servlet.uri');
		var linkUrl =
			instanceUrl + 'now/nav/ui/classic/params/target/u_istationery_stock_in?sys_id=' + r.sys_id;

		// Description + link
		var descriptionHtml =
			r.enableLink === true
				? '<a href="' + linkUrl + '" target="_blank">' + r.description + '</a>'
				: r.description;

		// Cut ฿ and parse number
		var numericValue = parseFloat(r.stockInCost.toString().replace(/[^0-9.]/g, '')) || 0;
		// Convert string and add comma + 2 decimal
		var formattedCost = numberWithCommas(numericValue);

		// Add row in HTML
		html +=
			'<tr style="' +
			rowStyle +
			'">' +
			'<td style="border:1px solid #ddd; padding:8px">' +
			descriptionHtml +
			'</td>' +
			'<td style="border:1px solid #ddd; padding:6px">' +
			formattedCost +
			'</td>' +
			'<td style="border:1px solid #ddd; padding:6px">' +
			(r.itemUpdate === true ? '-' : r.unitPrice) +
			'</td>' +
			'<td style="border:1px solid #ddd; padding:6px">' +
			r.active +
			'</td>' +
			'<td style="border:1px solid #ddd; padding:6px">' +
			r.order +
			'</td>' +
			'</tr>';
	});

	html += '</tbody></table>';

	return html;
}

function calculateGrandPrice(cartList) {
	var total = 0.0;
	if (!cartList) return total;
	var count = cartList.getRowCount();
	for (var i = 0; i < count; i++) {
		var amt = parseFloat(cartList[i].u_total_price.toString().replace(/,/g, '') || 0);
		total += amt;
	}
	return total.toFixed(2);
}

function getValue(id) {
	var gr = new GlideRecord('u_istationery_stock_in');
	gr.addQuery('sys_id', id);
	gr.query();
	if (gr.next()) {
		return gr.getDisplayValue();
	} else {
		return id;
	}
}

function getUnit(id) {
	var gr = new GlideRecord('u_ist_unit_type');
	gr.addQuery('u_name', id);
	gr.query();
	if (gr.next()) {
		return gr.sys_id;
	} else {
		return id;
	}
}

function getPOYear(id) {
	var d = new Date();
	var n = d.getFullYear();
	var Year = n.toString();
	var gr = new GlideRecord('u_ist_po_per_year');
	gr.addQuery('u_po_budget', id);
	gr.addQuery('u_year', Year);
	gr.query();
	if (gr.next()) {
		return gr.sys_id;
	} else {
		return id;
	}
}
//#endregion

//#region Main execution
// var u_re_approve = true; // Mock-Up for testing

var u_re_approve = producer.reference_to_stock_in_request.u_re_approve;
if (u_re_approve == true) {
	gs.info('Case A: Re-approve existing request');

	mapProducerToRequest(current, producer);

	var source_record = new GlideRecord('u_istationery_stock_in_request');
	source_record.get(producer.reference_to_stock_in_request);
	current.comments = 're-submit from ticket No.' + source_record.number.getDisplayValue();

	createLineItems();

	current.u_grand_price = calculateGrandPrice(producer.istationary_stock_in_item_list_cart);
} else {
	gs.info('Case B: Re-submit awaiting approval');

	var existingReq = new GlideRecord('u_istationery_stock_in_request');
	if (existingReq.get(producer.reference_to_stock_in_request.sys_id)) {
		if (existingReq.u_stage == 'awaiting_budget_holder_approval') {
			deleteLineItems(existingReq.u_po_no);

			mapProducerToRequest(existingReq, producer);
			existingReq.u_re_approve = true;

			createLineItems();

			// Copy attachments
			new GlideSysAttachment().copy(
				'u_istationery_stock_in_request',
				current.sys_id,
				'u_istationery_stock_in_request',
				existingReq.sys_id,
			);

			existingReq.update();
		}
	}

	current.state = 1;
	current.setAbortAction(true);
}
//#endregion

//#endregion
