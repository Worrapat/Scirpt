var ISTRquestUtils = Class.create();
ISTRquestUtils.prototype = {
	initialize: function () {},

	canReviewThis: function (record) {
		var approvers = getMyApprovals();
		//         gs.log('Approval --->>'+approvers);
		//         gs.log('Record --->>'+record.sys_id);
		var gr = new GlideRecord('sysapproval_approver');
		gr.addQuery('approver', 'IN', approvers);
		gr.addQuery('approver', approvers);
		gr.addEncodedQuery('state=requested^sysapproval=' + record.sys_id);
		gr.query();
		if (gr.next()) {
			if (record.u_stage == 'awaiting_budget_holder_review') {
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	},

	canApproveThis: function (record) {
		var approvers = getMyApprovals();
		//	gs.log('Approval --->>'+approvers);
		//		gs.log('Record --->>'+record.sys_id);
		var gr = new GlideRecord('sysapproval_approver');
		gr.addQuery('approver', 'IN', approvers);
		//	 gr.addQuery("approver", approvers);
		gr.addEncodedQuery('state=requested^sysapproval=' + record.sys_id);
		gr.query();
		if (gr.next()) {
			return true;
		} else {
			return false;
		}
	},

	Approved: function (record) {
		var approvers = getMyApprovals();
		// gs.log('Approval --->>' + approvers);
		// gs.log('Record --->>' + record.sys_id);
		var gr = new GlideRecord('sysapproval_approver');
		gr.addQuery('approver', 'IN', approvers);
		//	 gr.addQuery("approver", approvers);
		gr.addEncodedQuery('state=requested^sysapproval=' + record.sys_id);
		gr.query();
		if (gr.next()) {
			// gs.log(record.number + 'Approved');
			gr.state = 'approved';
			gr.update();
			return true;
		}
	},

	getconvertmonth: function (s) {
		var newString = s.replace('ICT', ' ');
		var output = newString.toString().split('/');
		var months;
		if (s == '') {
			return 'NA';
		}
		if (output[1] == '01') {
			months = 'JAN';
		} else if (output[1] == '02') {
			months = 'FEB';
		} else if (output[1] == '03') {
			months = 'MAR';
		} else if (output[1] == '04') {
			months = 'APR';
		} else if (output[1] == '05') {
			months = 'MAY';
		} else if (output[1] == '06') {
			months = 'JUN';
		} else if (output[1] == '07') {
			months = 'JUL';
		} else if (output[1] == '08') {
			months = 'AUG';
		} else if (output[1] == '09') {
			months = 'SEP';
		} else if (output[1] == '10') {
			months = 'OCT';
		} else if (output[1] == '11') {
			months = 'NOV';
		} else if (output[1] == '12') {
			months = 'DEC';
		}
		return output[0] + '-' + months + '-' + output[2];
	},

	getMyAssets: function () {
		var assetArr = [];
		var gr = new GlideRecord('u_donation_asset_look_up_table');
		gr.addEncodedQuery('u_groupDYNAMICd6435e965f510100a9ad2572f2b47744');
		gr.query();
		while (gr.next()) {
			assetArr.push(gr.getValue('u_asset'));
		}
		var result = 'sys_idIN' + assetArr.toString();
		//gs.log('------------------------ ' + result);
		return result;
	},

	PartialCal: function (id) {
		var total_partial = 0;
		var gr = new GlideRecord('u_ist_line_item_order');
		gr.addEncodedQuery('active=true^u_order.sys_id=' + id);
		gr.orderBy('u_po_line');
		gr.query();
		while (gr.next()) {
			//gs.log('Partial Cal Loop');
			gr.u_total_amount = parseFloat(gr.u_unit_cost) * parseFloat(gr.u_received_amount);
			total_partial = parseFloat(total_partial) + parseFloat(gr.u_total_amount);

			gr.state = 2;
			//gs.log('Partial Cal Loop Update Price : ' + total_partial + ' ; New state : ' + gr.state);
			gr.update();
		}
		//gs.log('Partial Cal Final Update Price : ' + total_partial);
		return total_partial;
	},

	getOptionsBySiteDistinctName: function () {
		var siteName = (this.getParameter('sysparm_site_name') || '').trim();
		if (!siteName) return new global.JSON().encode([]);

		var rows = [];
		var seen = {};

		var ga = new GlideAggregate('u_ist_delivery_location');
		ga.addQuery('u_site_location', siteName);
		// ga.addQuery('active', true);
		ga.addNotNullQuery('name');
		ga.groupBy('name');
		ga.orderBy('name');
		ga.query();

		while (ga.next()) {
			var theName = ga.getValue('name');
			if (seen[theName]) continue;

			var gr = new GlideRecord('u_ist_delivery_location');
			gr.addQuery('u_site_location', siteName);
			gr.addQuery('name', theName);
			// gr.addQuery('active', true);
			gr.setLimit(1);
			gr.query();
			if (gr.next()) {
				rows.push({
					value: gr.getUniqueValue(), // เก็บ sys_id (สำคัญมาก)
					label: gr.getDisplayValue('name'), // ข้อความที่โชว์ให้ผู้ใช้
				});
				seen[theName] = true;
			}
		}

		return new global.JSON().encode(rows);
	},

	PartialCalSIN: function (id) {
		var total_partial = 0;
		var gr = new GlideRecord('u_ist_stock_in_line_item');
		gr.addEncodedQuery('active=true^u_order.sys_id=' + id);
		gr.orderBy('u_po_line');
		gr.query();
		while (gr.next()) {
			//gs.log('Partial Cal Loop');
			gr.u_total_amount = parseFloat(gr.u_unit_cost) * parseFloat(gr.u_received_amount);
			total_partial = parseFloat(total_partial) + parseFloat(gr.u_total_amount);
			gr.state = 2;
			//gs.log('Partial Cal Loop Update Price : ' + total_partial + ' ; New state : ' + gr.state);
			gr.update();
		}
		//gs.log('Partial Cal Final Update Price : ' + total_partial);
		return total_partial;
	},

	ReSubmitCal: function (id) {
		var total_amount = 0;
		var gr = new GlideRecord('u_ist_line_item_order');
		gr.addQuery('u_order', id);
		gr.orderBy('u_po_line');
		gr.query();
		while (gr.next()) {
			gr.u_total_amount = parseFloat(gr.u_unit_cost * gr.u_quantity);
			total_amount += parseFloat(gr.u_unit_cost * gr.u_quantity);
			gr.update();
		}
		return total_amount;
	},

	WithdrawUpdateMasterItem: function (item, qty) {
		var ItemUnit = qty;
		var gr = new GlideRecord('u_istationery_stock_in');
		gr.addQuery('sys_id', item);
		gr.query();
		if (gr.next()) {
			// gs.log('Master Item -= ' + ItemUnit);
			//             gr.u_in_stock -= ItemUnit;
			gr.u_available_qty -= ItemUnit;
			//             gr.u_reserved_qty += ItemUnit; reserved from business rule on open
			gr.update();
		}
	},

	GoodsReceivedUpdateMasterItem: function (item, qty, serviceType) {
		var ItemUnit = qty;
		// gs.log('Update Master item data from serviceType : ' + serviceType + "QTY :" + qty);
		var ConvertServiceType = serviceType.toString();
		switch (ConvertServiceType) {
			case 'stock_out_request': // Stock out
				// gs.log('item A : ' + item);
				var gr2 = new GlideRecord('u_istationery_stock_in');
				gr2.addQuery('sys_id', item);
				gr2.query();
				if (gr2.next()) {
					// gs.log('A : Stock-OUT');
					// gs.log('before Reserved item stock out :' + gr2.u_reserved_qty);
					// gs.log('Received item stock out :' + ItemUnit);
					gr2.u_in_stock = parseInt(gr2.u_in_stock - ItemUnit);
					gr2.u_reserved_qty = parseInt(gr2.u_reserved_qty - ItemUnit);
					gr2.update();
					// gs.log('after Reserved item stock out :' + gr2.u_reserved_qty);
				}
				break;

			case 'stock_in_request': // Stock IN
				// gs.log('item B : ' + item);
				var gr3 = new GlideRecord('u_istationery_stock_in');
				gr3.addQuery('sys_id', item);
				gr3.query();
				if (gr3.next()) {
					// gs.log('B : Stock-In');
					var calStockInToOunt = 0;
					// gs.log('ItemUnit : ' + ItemUnit + '; type :' + typeof(ItemUnit));
					calStockInToOunt = gr3.u_multiplier * ItemUnit;
					// gs.log('add_stock : ' + calStockInToOunt);
					gr3.u_in_stock = gr3.u_in_stock + calStockInToOunt;
					gr3.u_available_qty = gr3.u_available_qty + calStockInToOunt;
					gr3.u_credit_avaliable = gr3.u_credit_avaliable + calStockInToOunt;
					gr3.update();
					/*	var po_lookup = new GlideRecord('u_ist_look_up_po_item');
				po_lookup.addEncodedQuery('u_master_item.sys_id=' + current.u_item + '^u_po.sys_id=' + current.u_order.u_po_no);
				po_lookup.query();
				if (po_lookup.next()) {
				//   gs.info(current.u_quantity);
				// po_lookup.u_po_remaining += qty;
				po_lookup.u_po_in_order -= calStockInToOunt;
				po_lookup.update();
		}*/
				}
				break;
			default:
			// gs.log('Default--->');
			//             case 'special_request' || 'special_request_reimbursement': // Special & rimb
			//                // Do nothing
			//                 break;
		}
		//         var gr1 = new GlideRecord('u_ist_stock_out_line_item');
		//         gr1.addQuery('sys_id', item);
		//         gr1.query();
		//         if (gr1.next()) {
		//             gs.log('A : Stock-Out');
		// 			gs.log('item.u_item :'+gr1.u_item);
		//             var gr2 = new GlideRecord('u_istationery_stock_in');
		//             gr2.addQuery('sys_id', gr1.u_item);
		//             gr2.query();
		//             if (gr2.next()) {
		//                 gs.log('Received item stock out :' + ItemUnit);
		//                 gr2.u_reserved_qty -= ItemUnit;
		//                 gr2.update();
		//             }else{
		// 				gs.log('A : Stock-Out but not found line item');
		// 			}
		//         } else {

		//             var gr3 = new GlideRecord('u_istationery_stock_in');
		//             gr3.addQuery('sys_id', item.u_item);
		//             gr3.query();
		//             if (gr3.next()) {
		//                 gs.log('B : Stock-In');
		//                 var calStockInToOunt = 0;
		//                 calStockInToOunt = gr3.u_multiplier * ItemUnit;
		//                 gs.log(calStockInToOunt);
		//                 gr3.u_in_stock = gr3.u_in_stock + calStockInToOunt;
		//                 gr3.u_available_qty = gr3.u_available_qty + calStockInToOunt;
		//                 gr3.update();
		//             } else {
		//                 gs.log('C : Special');
		//             }
		//         }
	},

	reApprove: function (sysID, serviceTYPE) {
		if (serviceTYPE == 'special_request' || serviceTYPE == 'special_request_reimbursement') {
			var gr1 = new GlideRecord('u_istationery_special_request');
			gr1.addQuery('sys_id', sysID);
			gr1.query();
			if (gr1.next()) {
				gr1.u_re_approve = true;
				gr1.update();
			}
		} else if (serviceTYPE == 'stock_in_request') {
			var gr2 = new GlideRecord('u_istationery_stock_in_request');
			gr2.addQuery('sys_id', sysID);
			gr2.query();
			if (gr2.next()) {
				gr2.u_re_approve = true;
				gr2.update();
			}
		}
	},

	SOTCompleteWithPartial: function (
		item,
		request_amount,
		received_amount,
		withdraw_amount,
		withdraw_remaining,
	) {
		//gs.log('Update Master item data from serviceType : ' + serviceType);
		request_amount = parseInt(request_amount);
		received_amount = parseInt(received_amount);
		withdraw_amount = parseInt(withdraw_amount);
		withdraw_remaining = parseInt(withdraw_remaining);

		//gs.log('item A : ' + item);
		var gr = new GlideRecord('u_istationery_stock_in');
		gr.addQuery('sys_id', item);
		gr.query();
		if (gr.next()) {
			//gs.log('A : Stock-OUT');
			var roll_back_reserved_amount = parseInt(request_amount) - parseInt(received_amount);
			if (request_amount != received_amount) {
				gr.u_reserved_qty -= roll_back_reserved_amount;
				gr.u_credit_avaliable += roll_back_reserved_amount;
			}

			if (withdraw_amount != received_amount) {
				var diff_amount = parseInt(withdraw_amount) - parseInt(received_amount);
				gr.u_available_qty += diff_amount;
			}
			gr.update();
			// gs.log('after u_credit_avaliable stock out :' + gr.u_credit_avaliable + ' ; ');
			// gs.log('after u_reserved_qty stock out :' + gr.u_reserved_qty + ' ; ');
			// gs.log('after u_available_qty stock out :' + gr.u_available_qty + ' ; ');
		}
	},

	getApprovalBar: function (budget_holder, user) {
		var approvalBar = new GlideRecord('u_istationery_stock_out_approval_configuration');
		approvalBar.addEncodedQuery('u_department.u_budget_holder=' + budget_holder);
		approvalBar.query();
		if (approvalBar.next()) {
			// gs.log('external : found budget holder approval bar.');
			return approvalBar.u_approval_budget_bar;
		} else {
			// gs.log('external : not found budget holder approval bar.');
			return null;
		}
		// var isMember = false;
		// var external_group_id = gs.getProperty('ist_stock.out.external_user_group_id');
		// var checkGroup = new GlideRecord('sys_user_grmember');
		// checkGroup.addEncodedQuery('group=' + external_group_id + '^user=' + user);
		// checkGroup.query();
		// if (checkGroup.next()) {
		//     isMember = true;
		// }
		// if (isMember == true) { // use external bar
		//     var externalBar = new GlideRecord('u_istationery_stock_out_approval_configuration');
		//     externalBar.addEncodedQuery('u_department.u_budget_holder=' + budget_holder + '^u_for_external_group=true');
		//     externalBar.query();
		//     if (externalBar.next()) {
		//         // gs.log('external : found budget holder approval bar.');
		//         return externalBar.u_approval_budget_bar;
		//     } else {
		//         // gs.log('external : not found budget holder approval bar.');
		//         return this.getDefultApprovalBar();
		//     }
		// } else { // Internal User Case
		//     // gs.log('internal');
		//     return this.getDefultApprovalBar();
		// }
	},

	getDefultApprovalBar: function () {
		var def_app_bar = new GlideRecord('u_istationery_stock_out_approval_configuration');
		def_app_bar.addEncodedQuery('u_departmentISEMPTY^u_for_external_group=false');
		def_app_bar.query();
		if (def_app_bar.next()) {
			return def_app_bar.u_approval_budget_bar;
		}
	},

	getStockInApprovalBar: function (budget_holder, user) {
		var approvalBar = new GlideRecord('u_istationery_stock_in_approval_configuration');
		approvalBar.addEncodedQuery('u_department.u_budget_holder=' + budget_holder);
		approvalBar.query();
		if (approvalBar.next()) {
			// gs.log('external : found budget holder approval bar.');
			return approvalBar.u_approval_budget_bar;
		} else {
			// gs.log('external : not found budget holder approval bar.');
			return null;
		}
		// var isMember = false;
		// var external_group_id = gs.getProperty('ist_stock.in.external_user_group_id');
		// var checkGroup = new GlideRecord('sys_user_grmember');
		// checkGroup.addEncodedQuery('group=' + external_group_id + '^user=' + user);
		// checkGroup.query();
		// if (checkGroup.next()) {
		//     isMember = true;
		// }
		// if (isMember == true) { // use external bar
		//     var externalBar = new GlideRecord('u_istationery_stock_in_approval_configuration');
		//     externalBar.addEncodedQuery('u_department.u_budget_holder=' + budget_holder + '^u_for_external_group=true');
		//     externalBar.query();
		//     if (externalBar.next()) {
		// 		// gs.log('external : found budget holder approval bar.');
		//         return externalBar.u_approval_budget_bar;
		//     }else{
		// 		// gs.log('external : not found budget holder approval bar.');
		// 		return this.getStockInDefultApprovalBar();
		// 	}
		// } else { // Internal User Case
		//     // gs.log('internal');
		//     return this.getStockInDefultApprovalBar();
		// }
	},

	getStockInDefultApprovalBar: function () {
		var def_app_bar = new GlideRecord('u_istationery_stock_in_approval_configuration');
		def_app_bar.addEncodedQuery('u_departmentISEMPTY^u_for_external_group=false');
		def_app_bar.query();
		if (def_app_bar.next()) {
			return def_app_bar.u_approval_budget_bar;
		}
	},

	// #region Update item by UC-Code

	updateItemByUCCode: function (lineitem) {
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
		stockIn.addEncodedQuery(
			'u_master_item_name=' + masterItem + '^u_budget_holder=' + budgetHolder,
		);
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
				gs.info('--- UC-003 Start ---');
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

				gs.info('--- UC-003 Completed ---');
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
	},

	// #endregion Update item by UC-Code

	type: 'ISTRquestUtils',
};
