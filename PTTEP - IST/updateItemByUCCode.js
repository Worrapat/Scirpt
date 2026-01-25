var itemUC2 = '83682aa397e9b210f86b34b71153af23'; // TASK0072606
var itemUC4 = '76350fb397293610f86b34b71153af95'; // TASK0072626

var grUISILI = new GlideRecord('u_ist_stock_in_line_item');
if (grUISILI.get(itemUC2)) {
	updateItemByUCCode(grUISILI);
}

// #region Update item by UC-Code

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
		case 'UC-001':
			while (stockIn.next()) {
				stockIn.u_stock_in_unit_cost = newCost;
				stockIn.u_remarks =
					'Ref to K.' +
					lineitem.u_order.u_requestor.getDisplayValue() +
					' ,required to update unit cost due to new procurement as ' +
					lineitem.u_order.number;
				stockIn.u_remarks =
					'Ref to ' +
					lineitem.u_order.number +
					' ,' +
					'K' +
					lineitem.u_order.u_requestor.getDisplayValue() +
					' required to update unit cost due to new procurement';
				stockIn.update();
			}
			break;

		case 'UC-002':
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

				if (currentOrder > maxOrder) {
					maxOrder = currentOrder;
				}

				if (stockIn.u_parent_item == '') {
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
						u_product_code: stockIn.u_product_code,
					});
				}
			}

			// Step 2: Create new record
			if (oldRecords.length > 0) {
				var rec = oldRecords[0];

				var newStock = new GlideRecord('u_istationery_stock_in');
				newStock.initialize();
				newStock.u_item = itemSysId;
				newStock.u_stock_in_unit_cost = newCost;
				newStock.active = true;
				newStock.order = maxOrder + 100;
				// newStock.u_remarks = 'Ref to K.' + lineitem.u_order.u_requestor
				// 	.getDisplayValue() + ' ,required to update unit cost due to new procurement as ' + lineitem.u_order.number;
				newStock.u_remarks =
					'Ref to ' +
					lineitem.u_order.number +
					',' +
					'K.' +
					lineitem.u_order.u_requestor.getDisplayValue() +
					' required to update unit cost due to new procurement';
				// console.log("newStock.u_remarks - " + newStock.u_remarks);
				// Copy fields
				for (var key in rec) {
					newStock[key] = rec[key];
				}
				// console.log("rec - " + rec.u_parent_item)

				// var newSysId = newStock.insert();
				// lineitem.u_item = newSysId;
				// lineitem.update();
			}

			break;

		case 'UC-003':
			var reactivated = false;
			var maxCount = stockIn.getRowCount();
			var maxCounter = maxCount * 100;
			var orderCounter = maxCount * 100;
			var count = 0;
			var toReactivate = null;
			var sysIdList = [];
			var creditMap = {};

			while (stockIn.next()) {
				var credit = parseFloat(stockIn.u_credit_avaliable) || 0;
				sysIdList.push(stockIn.sys_id + '');
				creditMap[stockIn.sys_id + ''] = credit;

				if (credit === 0 && toReactivate != '') {
					toReactivate = stockIn.sys_id + '';
				}
			}

			sysIdList.forEach(function (sid) {
				var credit = creditMap[sid];

				var gr = new GlideRecord('u_istationery_stock_in');
				if (!gr.get(sid)) {
					// โหลด record เดิม
					gs.warn('Cannot find record for sys_id: ' + sid);
					return; // ข้าม record ที่ไม่เจอ
				}

				var beforeCost = parseFloat(gr.u_stock_in_unit_cost) || 0;
				var action = '';

				if (credit === 0 && sid == toReactivate) {
					gr.u_stock_in_unit_cost = newCost;
					gr.active = true;
					gr.order = maxCounter;
					gr.u_remarks =
						'Ref to K.' +
						lineitem.u_order.u_requestor.getDisplayValue() +
						' ,required to update unit cost due to new procurement as ' +
						lineitem.u_order.number;

					action = ' Reactivate (LAST)';
					lineitem.setValue('u_item', sid);
					reactivated = true;
				} else {
					count += 100;
					gr.active = false;
					gr.order = count;
					action = ' Deactivate';
				}

				gs.info(
					[
						'--------------------------------------------',
						'UC-003 | ' + action,
						'Name           : ' + gr.name,
						'Sys ID         : ' + gr.sys_id,
						'Credit         : ' + credit,
						'Active After   : ' + gr.active,
						'Order Assigned : ' + gr.order,
						'Cost Before    : ' + beforeCost,
						'Cost After     : ' + (action.indexOf('Reactivate') >= 0 ? newCost : beforeCost),
						'--------------------------------------------',
					].join('\n'),
				);

				gr.update();
			});
			break;

		// === UC-Code 4 : ถ้า credit=0 → update cost, ถ้า > 0 → deactivate + create ใหม่ ===
		case 'UC-004':
			var parents = []; // เก็บเฉพาะ parent items
			var orderCounter = 100;

			// Step 1: เก็บ parent items พร้อม safety stock ไว้กับ object เลย
			while (stockIn.next()) {
				stockIn.order = orderCounter;
				stockIn.active = false;

				if (stockIn.u_parent_item == '') {
					// parent item
					stockIn.safetyCopy = parseInt(stockIn.u_safety_stock || 0, 10);
					var isParentItem = stockIn.sys_id;
					console.log('isParentItem  - ' + isParentItem);
					parents.push({
						sys_id: stockIn.sys_id.toString(),
						u_master_item_name: stockIn.u_master_item_name.toString(),
						u_supplier: stockIn.u_supplier.toString(),
						u_budget_holder: stockIn.u_budget_holder.toString(),
						u_main_category: stockIn.u_main_category.toString(),
						u_category: stockIn.u_category.toString(),
						u_sub_category: stockIn.u_sub_category.toString(),
						u_type_of_item: stockIn.u_type_of_item.toString(),
						u_group_item: stockIn.u_group_item.toString(),
						u_stock_in_unit: stockIn.u_stock_in_unit.toString(),
						u_multiplier: stockIn.u_multiplier.toString(),
						u_unit: stockIn.u_unit.toString(),
						price: stockIn.price,
						name: stockIn.name.toString(),
						u_product_code: stockIn.u_product_code.toString(),
						safetyCopy: parseInt(stockIn.u_safety_stock || 0, 10),
					});
					// parents.push(stockIn);
				}

				// stockIn.update();
				orderCounter += 100;
			}

			if (parents.length > 0) {
				parents.forEach(function (parent) {
					var newStock = new GlideRecord('u_istationery_stock_in');
					newStock.initialize(); // เตรียม record ใหม่
					newStock.u_item = itemSysId;
					newStock.u_credit_avaliable = 0;
					newStock.u_stock_in_unit_cost = newCost;
					newStock.active = true;

					// Copy fields from parent
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
					newStock.u_product_code = parent.u_product_code;
					newStock.u_safety_stock = parent.safetyCopy; // ใช้ค่า safety stock จาก parent โดยตรง
					newStock.order = orderCounter;
					newStock.u_remarks =
						'Ref to K.' +
						lineitem.u_order.u_requestor.getDisplayValue() +
						' ,required to update unit cost due to new procurement as ' +
						lineitem.u_order.number;

					// var newSysId = newStock.insert();
					lineitem.u_item = parent.sys_id;
					console.log('lineitem.u_item  - ' + lineitem.u_item);
					// lineitem.update();

					orderCounter += 100;
				});
			}
			break;
		default:
			break;
	}
}

// #endregion Update item by UC-Code
