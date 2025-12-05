/***DO NOT REMOVE OR MODIFY THIS SECTION!!! Automatically added by "Force population of record producer used" business rule.
Forces population of this record producer sys_id into the target record for reporting purposes.***/
var usage = [
	{
		u_description_sin: '1cff76be93b4921898803d697bba1025',
		u_unit_type: 'Dozen',
		u_unit_price: '95.00',
		u_qty: '10',
		u_total_price: '950.00',
	},
];

// var u_so_po_no_ = '7d4c9efcdb0725d4f19edc2dd3961962';

var ticket_summary = `<table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;"><thead><tr style="background-color: #297bd8; color:#ffffff;"><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:25%;">Description</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:15%;">Use Case</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">User Edit Price</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">Stock-In Unit Cost (Excl. VAT)</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">Stock-In Unit</th></tr></thead><tbody><tr><td style="border: 1px solid #ddd; padding: 8px; width:35%;">Measuring cup</td><td style="border: 1px solid #ddd; padding: 8px; width:15%; text-align:center">UC-003</td><td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">95.00<td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">93.45</td><td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">Dozen</td></td></tr></tbody></table>`;

var count = 1;

//#region ENH-iStationery smart stock 2025
// var ticket_summary = producer.u_ticket_summary;
// gs.info("ticket_summary : " + ticket_summary);
// var usage = producer.istationary_stock_in_item_list_cart;
// gs.info("usage : " + usage);
// var count = usage.getRowCount();
// gs.info("count : " + count);

// --- STEP 1: Extract Description + UC Code from HTML ---
// var regex = /<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>/g;
var regex = /<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>.*?<\/td>/g;

var match;
var descriptionMap = {};

while ((match = regex.exec(ticket_summary)) !== null) {
	var desc = match[1].trim();
	var uc = match[2].trim();
	// descriptionMap[desc] = uc;
	descriptionMap[desc.toLowerCase()] = uc; // normalize to lower case

	// gs.info(' STEP 1 - descriptionMap : ' + desc + ' → ' + uc);
}

// --- STEP 2: Helper: Generate Ticket Summary (Multiple Records) ---
// Create HTML table
function buildTicketSummary(rows) {
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
		var rowStyle = 'text-align:center;';
		if (r.itemUpdate === true || r.ucCode == 'UC-001') {
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
			// (r.itemUpdate === true ? '-' : r.unitPrice) +
			(r.itemUpdate === true ? r.unitPrice : '-') +
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

// --- STEP 3: Collect rows + Insert Line Items ---
var rows = [];
var lineItemObjects = [];
var lineItem = new GlideRecord('u_ist_stock_in_line_item');

// gs.info('current.sys_id : ' + current.sys_id);

// for (var i = 0; i < usage.length; i++) {
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

		// Map UC Code from HTML.
		var ucCode = descriptionMap[nameItem.toLowerCase().trim()] || 'Out of case';

		gs.info(nameItem + '|' + 'unitPrice : ' + unitPrice + '\n ' + 'type of : ' + typeof unitPrice);

		var obj = {
			// u_order: current.sys_id, // Ref Stock-In Request
			u_po_line: i + 1,
			u_item: usage[i].u_description_sin,
			u_name: nameItem,
			u_received_amount: 0,
			u_quantity: usage[i].u_qty,
			u_unit: item.u_stock_in_unit.toString(),
			u_total_amount: usage[i].u_qty * parseFloat(unitPrice.replace(/,/g, '')),
			u_unit_cost: unitPrice,
			u_uc_code: ucCode,
		};

		// new ISUtilsBase().addPo_qty(usage[i].u_description_sin, usage[i].u_qty, producer.u_so_po_no_);

		lineItemObjects.push(obj);
	}
}

var allRows = [];

// --- STEP 4: Build SummaryHTML ---
lineItemObjects.forEach(function (obj) {
	var grUISI = new GlideRecord('u_istationery_stock_in');
	grUISI.addQuery('name', obj.u_name);
	// grUISI.addQuery('u_budget_holder', producer.u_budget_holder.u_budget_holder);
	grUISI.query();

	var currentRows = [];
	var hasOldRecord = false;

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
					itemUpdate: false,
					enableLink: true,
					hasOldRecord: false,
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
					hasOldRecord: false,
				});
				orderCounter += 100;
			}

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
				hasOldRecord: false,
			});
			break;

		case 'UC-003':
			var allUCRows = [];
			var firstActiveId = null; // เก็บ sys_id ของ active ตัวแรก

			while (grUISI.next()) {
				var credit = parseInt(grUISI.u_credit_avaliable || 0);
				var isActive = credit > 0;

				var row = {
					sys_id: grUISI.getUniqueValue(),
					description: grUISI.name + '',
					stockInCost: grUISI.u_stock_in_unit_cost.getDisplayValue(),
					unitPrice: obj.u_unit_cost,
					ucCode: obj.u_uc_code,
					u_credit_avaliable: credit,
					active: isActive ? 'true' : 'false',
					itemUpdate: isActive,
					enableLink: true,
				};

				// เก็บ active ตัวแรกเท่านั้น
				if (isActive && !firstActiveId) {
					firstActiveId = row.sys_id;
				}

				allUCRows.push(row);
			}

			// ---------------------
			// 🔥 Force ให้ active เหลือแค่ตัวเดียว
			// ---------------------
			allUCRows.forEach((r) => {
				if (r.sys_id === firstActiveId) {
					r.active = 'true';
					r.itemUpdate = true;
				} else {
					r.active = 'false';
					r.itemUpdate = false;
				}
			});

			// ---------------------
			// แยก inactive ก่อน active ตาม logic เดิม
			// ---------------------
			var inactive = allUCRows.filter((r) => r.active === 'false');
			var active = allUCRows.filter((r) => r.active === 'true');

			var orderCounter = 100;

			inactive.forEach((r) => {
				r.order = orderCounter;
				orderCounter += 100;
			});

			active.forEach((r) => {
				r.order = orderCounter;
				orderCounter += 100;
			});

			currentRows = inactive.concat(active);
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
					hasOldRecord: false,
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
					hasOldRecord: false,
				});
			}
			break;

		default:
			if (producer.u_so_po_no_ != '') {
				var grUILUPI = new GlideRecord('u_ist_look_up_po_item');
				grUILUPI.addEncodedQuery('u_po=' + producer.u_so_po_no_ + '^u_master_item=' + obj.u_item);
				grUILUPI.query();
				while (grUILUPI.next()) {
					var isActive = grUILUPI.u_master_item.active;
					var isUpdate = obj.u_item == grUILUPI.u_master_item;
					currentRows.push({
						sys_id: grUILUPI.u_master_item,
						description: grUILUPI.u_master_item.name.toString(),
						stockInCost: grUILUPI.u_master_item.u_stock_in_unit_cost.getDisplayValue(),
						unitPrice: obj.u_unit_cost,
						ucCode: obj.u_uc_code,
						order: grUILUPI.u_master_item.order.toString() || '',
						active: isUpdate ? true : isActive,
						itemUpdate: isUpdate,
						enableLink: true,
						hasOldRecord: true,
					});
				}
			} else {
				while (grUISI.next()) {
					var isActive = grUISI.getDisplayValue('active');
					var isUpdate = obj.u_item == grUISI.getUniqueValue();
					currentRows.push({
						sys_id: grUISI.getUniqueValue(),
						description: grUISI.name.toString(),
						stockInCost: grUISI.u_stock_in_unit_cost.getDisplayValue(),
						unitPrice: obj.u_unit_cost,
						ucCode: obj.u_uc_code,
						order: obj.order.toString() || '',
						active: isUpdate ? true : isActive,
						itemUpdate: isUpdate,
						enableLink: true,
						hasOldRecord: true,
					});
				}
			}
			break;
	}

	var summaryHTML = buildTicketSummary(currentRows);
	allRows = allRows.concat(currentRows); // รวมทุก obj
	// --- หลัง loop ตรวจสอบครั้งเดียว ---
	var isOldRecord = allRows.every((r) => r.hasOldRecord === true);
	// gs.log("hasOldRecord for all lineItemObjects: " + hasOldRecord);
	// --- build lineItem record ---
	// lineItem.initialize();

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
	lineItem.u_old_record = isOldRecord; // ใช้ flag ที่ตั้งไว้ใน switch

	// Clean log
	gs.info(`LineItem Debug:
	  Name       : ${obj.u_name}
	  UC Code    : ${lineItem.u_uc_code}
	  Quantity   : ${obj.u_quantity}
	  Unit Cost  : ${lineItem.u_unit_cost}
	  Total Amt  : ${lineItem.u_total_amount}
	  TicketSummary:
	${summaryHTML}`);

	// lineItem.insert();
});
//#endregion

// Budget Item :Office Service & Supplies
// Activities : Medical Expenses (CTR : C001H02019)

// ticket_summary : <table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;"><thead><tr style="background-color: #297bd8; color:#ffffff;"><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:25%;">Description</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:15%;">Use Case</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">User Edit Price</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">Stock-In Unit Cost (Excl. VAT)</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">Stock-In Unit</th></tr></thead><tbody><tr><td style="border: 1px solid #ddd; padding: 8px; width:35%;">Measuring cup</td><td style="border: 1px solid #ddd; padding: 8px; width:15%; text-align:center">UC-003</td><td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">95.00<td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">93.45</td><td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">Dozen</td></td></tr></tbody></table>|
// 	count : 1
// 	usage : [ {
// "u_description_sin" : "1cff76be93b4921898803d697bba1025",
// "u_unit_type" : "Dozen",
// "u_unit_price" : "95.00",
// "u_qty" : "10",
// "u_total_price" : "950.00"
// } ]
// count : 1	*** Script

// 05/12/2025 20:13:19
// Information	admin.k	Measuring cup|unitPrice : 155.00
// type of : string	*** Script

// 05/12/2025 20:13:19
// Information	admin.k	usage : [ {
// "u_description_sin" : "6edd9dc6dbb6681017bcd3add396193a",
// "u_unit_type" : "Piece",
// "u_unit_price" : "155.00",
// "u_qty" : "10",
// "u_total_price" : "1,550.00"
// } ]	*** Script

// 05/12/2025 20:13:19
// Information	admin.k	Workflow starting: CST - iStationery HQ Stock in, for SIN0002060	ENGINE

// 05/12/2025 20:13:19
// Information	admin.k	ticket_summary : <table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;"><thead><tr style="background-color: #297bd8; color:#ffffff;"><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:25%;">Description</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:15%;">Use Case</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">User Edit Price</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">Stock-In Unit Cost (Excl. VAT)</th><th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">Stock-In Unit</th></tr></thead><tbody><tr><td style="border: 1px solid #ddd; padding: 8px; width:35%;">Measuring cup</td><td style="border: 1px solid #ddd; padding: 8px; width:15%; text-align:center">UC-003</td><td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">155.00<td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">150.00</td><td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">Piece</td></td></tr></tbody></table>