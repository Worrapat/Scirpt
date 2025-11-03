var itemUC3 = '907ddea4978d7290f86b34b71153afe8'; // TASK0072033

var grUISILI = new GlideRecord('u_ist_stock_in_line_item');
if (grUISILI.get(itemUC3)) {
	updateItemByUCCode(grUISILI);
}

function updateItemByUCCode(lineitem) {
	var ucCode = lineitem.getValue('u_uc_code');
	// gs.info('ucCode : ' + ucCode);
	var itemSysId = lineitem.getDisplayValue('u_item');
	// gs.info('Item : ' + itemSysId + '(' + lineitem.getValue('sys_id') + ')');
	var newCost = parseFloat(lineitem.getValue('u_unit_cost'));
	// gs.info('newCost : ' + newCost);
	var qty = parseFloat(lineitem.getDisplayValue('u_quantity'));
	// gs.info('qty : ' + qty);

	var masterItem = lineitem.u_item.u_master_item_name;
	// gs.info('masterItem : ' + masterItem);
	var budgetHolder = lineitem.u_order.u_budget_holder.u_budget_holder;
	// gs.info('budgetHolder : ' + budgetHolder);

	var stockIn = new GlideRecord('u_istationery_stock_in');
	stockIn.addEncodedQuery('u_master_item_name=' + masterItem + '^u_budget_holder=' + budgetHolder);
	stockIn.orderBy('order');
	stockIn.query();

	switch (ucCode) {
		// === UC-Code 1 : Update Unit Cost ของทุก record เดิม ===
		case 'UC-001':
			while (stockIn.next()) {
				stockIn.u_stock_in_unit_cost = newCost;
				stockIn.update();
			}
			break;

		case 'UC-002':
			gs.info('--- UC-002 Start ---');

			var oldRecords = [];
			var orderCounter = 100;
			var maxOrder = 0;
			var parentItemRef = ''; // เก็บ parent item ของ record ที่ credit != 0

			// Step 1: Deactivate all and collect data
			while (stockIn.next()) {
				var credit = parseInt(stockIn.u_credit_avaliable || 0);

				if (parseInt(stockIn.order) <= 0) {
					stockIn.order = 100;
				}

				stockIn.active = false;
				stockIn.update();
				// gs.info('Deactivated record: ' + stockIn.name + ' → order=' + stockIn.order);

				if (parseInt(stockIn.order) > maxOrder) {
					maxOrder = parseInt(stockIn.order);
				}

				if (credit != 0) {
					parentItemRef = stockIn.sys_id;
					gs.info('002 parentItemRef: ' + parentItemRef);
				}

				// Keep one sample record (first one)
				if (oldRecords.length === 0) {
					oldRecords.push({
						u_parent_item: parentItemRef,
						name: stockIn.name,
						u_master_item_name: stockIn.u_master_item_name,
						u_supplier: stockIn.u_supplier,
						u_budget_holder: stockIn.u_budget_holder,
						u_main_category: stockIn.u_main_category,
						u_category: stockIn.u_category,
						u_sub_category: stockIn.u_sub_category,
						u_type_of_item: stockIn.u_type_of_item,
						u_group_item: stockIn.u_group_item,
						u_stock_in_unit: stockIn.u_stock_in_unit,
						u_multiplier: stockIn.u_multiplier,
						u_unit: stockIn.u_unit,
						price: stockIn.price,
					});
				}
			}

			// Step 2: Create just one new record
			if (oldRecords.length > 0) {
				var rec = oldRecords[0]; // ใช้ record แรกแทนการ loop
				var newStock = new GlideRecord('u_istationery_stock_in');
				newStock.initialize();
				newStock.u_item = itemSysId;
				newStock.u_stock_in_unit_cost = newCost;
				newStock.active = true;
				newStock.order = maxOrder + 100;

				// Copy fields
				for (var key in rec) {
					newStock[key] = rec[key];
				}

				var newSysId = newStock.insert();
				gs.info(
					'Created new stock record: ' +
						newStock.name +
						' (' +
						newSysId +
						') order=' +
						newStock.order,
				);
			}
			lineitem.u_item = newSysId; // For update create avaliable
			lineitem.update();

			gs.info('--- UC-002 End ---');

			break;

		case 'UC-003':
			var reactivated = false;
			var maxCount = stockIn.getRowCount();
			gs.info('maxCount : ' + maxCount);
			var orderCounter = maxCount * 100;

			var toReactivate = null;

			// รอบแรก: หาตัวที่ควร reactivate
			while (stockIn.next()) {
				var credit = parseFloat(stockIn.u_credit_avaliable) || 0;
				var isActive = stockIn.active == true || stockIn.active == 'true';

				// ✅ เก็บ record ที่ inactive และ credit = 0
				if (credit === 0) {
					toReactivate = stockIn.sys_id; // จำ sys_id ไว้
				}
			}

			stockIn.query();

			// รอบสอง: จัด order + reactivate ตัวสุดท้าย
			while (stockIn.next()) {
				var credit = parseFloat(stockIn.u_credit_avaliable) || 0;
				var isActive = stockIn.active == true || stockIn.active == 'true';
				var beforeCost = parseFloat(stockIn.u_stock_in_unit_cost) || 0;
				var action = '';

				if (stockIn.sys_id == toReactivate && !reactivated) {
					// ✅ Reactivate ตัวสุดท้าย
					stockIn.u_stock_in_unit_cost = newCost;
					stockIn.active = true;
					stockIn.order = orderCounter;
					action = '💡 Reactivate (LAST)';
					lineitem.setValue('u_item', stockIn.sys_id);
					lineitem.update();
					reactivated = true;
				} else {
					stockIn.active = false;
					stockIn.order = orderCounter - 100; // ✅ Deactivate ลำดับก่อนหน้า
					action = '🔴 Deactivate';
				}

				gs.info(
					[
						'--------------------------------------------',
						'UC-003 | ' + action,
						'Name           : ' + stockIn.name,
						'Sys ID         : ' + stockIn.sys_id,
						'Credit         : ' + credit,
						'Active Before  : ' + isActive,
						'Active After   : ' + stockIn.active,
						'Order Assigned : ' + stockIn.order,
						'Cost Before    : ' + beforeCost,
						'Cost After     : ' + (action.indexOf('Reactivate') >= 0 ? newCost : beforeCost),
						'Reactivated?   : ' + reactivated,
						'--------------------------------------------',
					].join('\n'),
				);

				orderCounter -= 100;

				stockIn.update();
			}

			break;

		// === UC-Code 4 : ถ้า credit=0 → update cost, ถ้า > 0 → deactivate + create ใหม่ ===
		case 'UC-004':
			gs.info('--- UC-004 Start ---');

			var records = [];
			var orderCounter = 100;
			var parentItem = '';

			// Step 1: Load all existing stockIn records
			while (stockIn.next()) {
				var credit = parseInt(stockIn.u_credit_avaliable || 0);
				stockIn.order = orderCounter;
				stockIn.active = false;
				gs.info('name: ' + stockIn.name + ' (' + stockIn.sys_id + ')');

				if (stockIn.u_parent_item && stockIn.u_parent_item.toString() != '') {
					parentItem = stockIn.u_parent_item.toString();
					gs.info('parentItem found: ' + parentItem);
				}

				stockIn.update();
				records.push(stockIn);
				orderCounter += 100;
			}

			gs.info('credit : ' + credit);

			// Step 2: Create new record only if credit != 0
			if (credit != 0) {
				var newStock = new GlideRecord('u_istationery_stock_in');
				newStock.initialize();
				newStock.u_item = itemSysId;
				newStock.u_credit_avaliable = 0;
				newStock.u_stock_in_unit_cost = newCost;
				newStock.active = true;

				if (records.length > 0) {
					var first = records[0];

					// Assign parentItem (ต้องเป็น string Sys ID)
					if (parentItem != '') {
						newStock.u_parent_item = parentItem;
					}

					// Copy fields from first record
					newStock.u_master_item_name = first.u_master_item_name;
					newStock.u_supplier = first.u_supplier;
					newStock.u_budget_holder = first.u_budget_holder;
					newStock.u_main_category = first.u_main_category;
					newStock.u_category = first.u_category;
					newStock.u_sub_category = first.u_sub_category;
					newStock.u_type_of_item = first.u_type_of_item;
					newStock.u_group_item = first.u_group_item;
					newStock.u_stock_in_unit = first.u_stock_in_unit;
					newStock.u_multiplier = first.u_multiplier;
					newStock.u_unit = first.u_unit;
					newStock.price = first.price;
					newStock.name = first.name;
					newStock.order = orderCounter;
				}

				// Step 3: Insert record
				var newSysId = newStock.insert();
				lineitem.u_item = newSysId; // For update create avaliable
				lineitem.update();
				gs.info(
					'name: ' + (newStock.name || '[no name]') + ' (' + (newStock.sys_id || '[no id]') + ')',
				);
			} else {
				gs.info('No new record created because credit = 0');
			}

			gs.info('--- UC-004 End ---');
			break;

		default:
			break;
	}
}
