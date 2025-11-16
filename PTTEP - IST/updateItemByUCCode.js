var itemUC2 = '7d47b42097c17290f86b34b71153af0b'; // TASK0072100
var itemUC4 = '4952363c97013690f86b34b71153af73'; // TASK0072218

var grUISILI = new GlideRecord('u_ist_stock_in_line_item');
if (grUISILI.get(itemUC4)) {
	updateItemByUCCode(grUISILI);
}

// #region Update item by UC-Code

function updateItemByUCCode(lineitem) {
	var ucCode = lineitem.getValue('u_uc_code');
	// gs.info('ucCode : ' + ucCode);
	var itemSysId = lineitem.getDisplayValue('u_item');
	// gs.info('Item : ' + itemSysId + '(' + lineitem.getValue('sys_id') + ')');
	var newCost = parseFloat(lineitem.getValue('u_unit_cost'));
	gs.info('newCost : ' + newCost);
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
			var maxOrder = 0;

			// Step 1: Deactivate all and collect data
			while (stockIn.next()) {
				var credit = parseInt(stockIn.u_credit_avaliable || 0);
				var currentOrder = parseInt(stockIn.order || 0);

				if (currentOrder <= 0) {
					currentOrder = 100;
					stockIn.order = 100;
				}

				stockIn.active = false;
				// stockIn.update();
				// gs.info('[UC-002] Deactivated record: ' + stockIn.name + ' → order=' + stockIn.order);

				if (currentOrder > maxOrder) {
					maxOrder = currentOrder;
				}

				if (!stockIn.u_parent_item) {
					oldRecords.push({
						u_parent_item: stockIn.sys_id,
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
						u_safety_stock: stockIn.u_safety_stock,
						price: stockIn.price,
					});
				}
			}

			// Step 2: Create new record
			if (oldRecords.length > 0) {
				var rec = oldRecords[0];

				gs.info('[UC-002] Preparing to create new record...');
				gs.info(
					'[UC-002] Source sys_id=' +
						rec.sys_id +
						', safety_stock=' +
						rec.u_safety_stock +
						', parent=' +
						rec.u_parent_item,
				);

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
					'[UC-002] Created new stock record: ' +
						newStock.name +
						' (' +
						newSysId +
						') order=' +
						newStock.order,
				);
			}

			gs.info('--- UC-002 End ---');
			break;

		case 'UC-003':
			var reactivated = false;
			var maxCount = stockIn.getRowCount();
			gs.info('maxCount : ' + maxCount);
			var maxCounter = maxCount * 100;
			var orderCounter = maxCount * 100;

			var toReactivate = null;

			// 🔹 รอบแรก: หาตัวที่ควร reactivate (credit == 0)
			while (stockIn.next()) {
				var credit = parseFloat(stockIn.u_credit_avaliable) || 0;
				if (credit === 0) {
					toReactivate = stockIn.sys_id;
					break; // เอาเฉพาะตัวสุดท้าย (เจอแล้วหยุด)
				}
			}

			// 🔹 โหลดใหม่เพื่อวนรอบทำงาน
			stockIn.query();

			while (stockIn.next()) {
				var credit = parseFloat(stockIn.u_credit_avaliable) || 0;
				var beforeCost = parseFloat(stockIn.u_stock_in_unit_cost) || 0;
				var action = '';

				if (credit === 0 && stockIn.sys_id == toReactivate) {
					// ✅ Reactivate ตัวสุดท้ายที่ credit == 0
					stockIn.u_stock_in_unit_cost = newCost;
					stockIn.active = true;
					stockIn.order = maxCounter;
					action = '💡 Reactivate (LAST)';
					lineitem.setValue('u_item', stockIn.sys_id);
					// lineitem.update();
					reactivated = true;
					gs.info('orderCounter : ' + orderCounter);
				} else if (credit != 0) {
					// 🔴 Deactivate เฉพาะ record ที่ credit != 0
					orderCounter -= 100;
					gs.info('Sys ID : ' + stockIn.sys_id);
					stockIn.active = false;
					stockIn.order = orderCounter;
					action = '🔴 Deactivate';
				}

				gs.info(
					[
						'--------------------------------------------',
						'UC-003 | ' + action,
						'Name           : ' + stockIn.name,
						'Sys ID         : ' + stockIn.sys_id,
						'Credit         : ' + credit,
						'Active After   : ' + stockIn.active,
						'Order Assigned : ' + stockIn.order,
						'Cost Before    : ' + beforeCost,
						'Cost After     : ' + (action.indexOf('Reactivate') >= 0 ? newCost : beforeCost),
						'--------------------------------------------',
					].join('\n'),
				);

				// stockIn.update();
			}
			break;

		// === UC-Code 4 : ถ้า credit=0 → update cost, ถ้า > 0 → deactivate + create ใหม่ ===
		case 'UC-004':
			gs.info('--- UC-004 Start ---');

			var parents = []; // เก็บเฉพาะ parent items
			var orderCounter = 100;

			// Step 1: เก็บ parent items พร้อม safety stock ไว้กับ object เลย
			while (stockIn.next()) {
				stockIn.order = orderCounter;
				stockIn.active = false;

				if (stockIn.u_parent_item == '') {
					// parent item
					gs.info('Parent item found: ' + stockIn.name + ' (' + stockIn.sys_id + ')');
					gs.info('Safety stock: ' + stockIn.u_safety_stock);

					// เก็บค่า safety stock ไว้กับ parent object
					stockIn.safetyCopy = parseInt(stockIn.u_safety_stock || 0, 10);
					parents.push(stockIn);
				}

				orderCounter += 100;
			}

			// Step 2: ถ้ามี parent ให้สร้าง newStock
			if (parents.length > 0) {
				parents.forEach(function (parent) {
					var newStock = new GlideRecord('u_istationery_stock_in');
					newStock.initialize(); // เตรียม record ใหม่
					newStock.u_item = itemSysId;
					newStock.u_credit_avaliable = 0;
					newStock.u_stock_in_unit_cost = newCost;
					newStock.active = true;

					// Copy fields จาก parent
					newStock.u_parent_item = parent.sys_id;
					newStock.u_master_item_name = parent.u_master_item_name;
					newStock.u_supplier = parent.u_supplier;
					newStock.u_budget_holder = parent.u_budget_holder;
					newStock.u_main_category = parent.u_main_category;
					newStock.u_category = parent.u_category;
					newStock.u_sub_category = parent.u_sub_category;
					newStock.u_type_of_item = parent.u_type_of_item;
					newStock.u_group_item = parent.u_group_item;
					newStock.u_stock_in_unit = parent.u_stock_in_unit;
					newStock.u_multiplier = parent.u_multiplier;
					newStock.u_unit = parent.u_unit;
					newStock.price = parent.price;
					newStock.name = parent.name;
					newStock.u_safety_stock = parent.safetyCopy; // ใช้ค่า safety stock จาก parent โดยตรง
					newStock.order = orderCounter;

					// var newSysId = newStock.insert();
					// lineitem.u_item = newSysId; // update reference ถ้าต้องการ
					// lineitem.update();

					gs.info('Created newStock: ' + newStock.name);
					gs.info('Created newStock.u_safety_stock: ' + newStock.u_safety_stock);

					orderCounter += 100; // เพิ่มลำดับต่อเนื่อง
				});
			}
			gs.info('--- UC-004 End ---');
			break;

		default:
			break;
	}
}

// #endregion Update item by UC-Code
