(function () {
	var arr = [];
	// console.log('input.action : ' + input.action);
	// First Time Load
	if (input.action == 'referencevalue' && input.filterData != '') {
		var userGR = new GlideRecord('sys_user');
		if (userGR.get(input.requested_for)) {
			data.user_dept = userGR.getValue('department'); // sys_id
		}

		// console.log('data.user_dept : ' + data.user_dept);

		var checkItem = new GlideRecord('u_map_master_item_holder');

		checkItem.addEncodedQuery(
			'u_can_pick_itemDYNAMIC90d1921e5f510100a9ad2572f2b477fe ' +
				'^ORu_can_pick_item_groupLIKE' +
				data.user_dept +
				'^ORu_groupDYNAMICd6435e965f510100a9ad2572f2b47744',
		);
		checkItem.query();

		var arrAllowed = []; // items allowed for this user

		while (checkItem.next()) {
			arrAllowed.push(checkItem.u_item.sys_id.toString()); // collect the item field
		}

		// Deduplicate
		var arrayUtil = new ArrayUtil();
		var finalItems = arrayUtil.unique(arrAllowed);

		var master_item = new GlideRecord('u_istationery_stock_in');
		master_item.addQuery('u_master_item_name.sys_id', 'IN', finalItems);
		master_item.addQuery('u_budget_holder.u_budget_holder', input.budget_holder);
		master_item.addQuery('u_category', input.filterData.category);
		master_item.addQuery('u_sub_category', input.filterData.sub_category);
		master_item.addQuery('active', true);
		master_item.orderBy('name');
		master_item.query();

		while (master_item.next()) {
			// console.log('master_item: ' + master_item.getRowCount());
			var img = ' ';
			var picture = master_item.u_master_item_name.u_item_picture.getValue('picture');

			if (
				master_item.u_master_item_name.u_item_picture.getValue('picture') != '' ||
				master_item.u_master_item_name.u_item_picture.getValue('picture') != ' ' ||
				master_item.u_master_item_name.u_item_picture.getValue('picture') != null
			) {
				img = master_item.u_master_item_name.u_item_picture.getValue('picture') + '.iix';
			}

			var caseResult = checkUseCase(master_item);

			var obj = {
				photo1: img,
				// description: master_item.u_master_item_name.u_name.getValue('name'),
				description: master_item.getValue('name'),
				unit_type: master_item.u_stock_in_unit.getDisplayValue(),
				unit_price: parseFloat(master_item.getValue('u_stock_in_unit_cost'))
					.toFixed(2)
					.toString()
					.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
				stock_in_unit_cost: parseFloat(master_item.getValue('u_stock_in_unit_cost'))
					.toFixed(2)
					.toString()
					.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
				qty: 0,
				totalPrice: 0.0,
				item_id: master_item.getUniqueValue(),
				active: master_item.active.getDisplayValue(),
				uc_code: caseResult.ucCode,
				editable: caseResult.editable,
			};

			arr.push(obj);
		}

		data.finalObject = arr;
	}
	// First Time Load
	else if (input.action == 'referencepreviewvalue') {
		//gs.log('SIT Case : B');
		arr = [];
		for (var i = 0; i < input.arrdatavalue.length; i++) {
			var mrvs_id;
			var ms_item = GlideRecord('u_istationery_stock_in');
			ms_item.addQuery('sys_id', 'IN', input.arrdatavalue[i].u_description_sin);
			ms_item.query();

			while (ms_item.next()) {
				mrvs_id = ms_item.getUniqueValue();
				var imgPreview = ' ';

				if (
					ms_item.u_master_item_name.u_item_picture.getValue('picture') != '' ||
					ms_item.u_master_item_name.u_item_picture.getValue('picture') != ' ' ||
					ms_item.u_master_item_name.u_item_picture.getValue('picture') != null
				) {
					imgPreview = ms_item.u_master_item_name.u_item_picture.getValue('picture') + '.iix';
				}

				var qty = input.arrdatavalue[i].u_qty.replace(/,/g, '');

				var caseResult = checkUseCase(ms_item);

				var objPreview = {
					photo1: imgPreview,
					description: ms_item.getValue('name'),
					// description: ms_item.u_master_item_name.u_name.getValue('name'),
					unit_type: ms_item.u_stock_in_unit.getDisplayValue(),
					unit_price: parseFloat(ms_item.getValue('u_stock_in_unit_cost'))
						.toFixed(2)
						.toString()
						.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
					stock_in_unit_cost: parseFloat(ms_item.getValue('u_stock_in_unit_cost'))
						.toFixed(2)
						.toString()
						.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
					qty: parseInt(qty),
					totalPrice: input.arrdatavalue[i].u_total_price,
					item_id: mrvs_id,
					uc_code: caseResult.ucCode,
					editable: caseResult.editable,
				};
				arr.push(objPreview);
			}
			data.finalPreviewObject = arr;
			var totalAmnt = 0;
			for (var j = 0; j < data.finalPreviewObject.length; j++) {
				totalAmnt =
					parseFloat(totalAmnt) +
					parseFloat(data.finalPreviewObject[j].totalPrice.replace(/,/g, ''));
			}
			data.grand_price = totalAmnt;
		}
	} else if (input.action == 'referenceoldvalue' && input.filterData != '') {
		arr = [];
		var mas_item = GlideRecord('u_istationery_stock_in');
		mas_item.addEncodedQuery(
			'u_category=' +
				input.filterData.category +
				'^u_sub_category=' +
				input.filterData.sub_category +
				'^active=true^ORDERBYname',
		);
		mas_item.query();

		while (mas_item.next()) {
			var imgs = ' ';
			if (
				mas_item.getValue('picture') != '' ||
				mas_item.getValue('picture') != ' ' ||
				mas_item.getValue('picture') != null
			) {
				imgs = mas_item.getValue('picture') + '.iix';
			}

			var caseResult = checkUseCase(mas_item);

			var objOld = {
				photo1: imgs,
				description: mas_item.getValue('name'),
				unit_type: mas_item.u_stock_in_unit.getDisplayValue(),
				unit_price: parseFloat(mas_item.getValue('u_stock_in_unit_cost'))
					.toFixed(2)
					.toString()
					.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
				stock_in_unit_cost: parseFloat(mas_item.getValue('u_stock_in_unit_cost'))
					.toFixed(2)
					.toString()
					.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
				qty: 0,
				totalPrice: 0.0,
				item_id: mas_item.getUniqueValue(),
				uc_code: caseResult.ucCode,
				editable: caseResult.editable,
			};
			for (var s = 0; s < input.mrvsvalue.length; s++) {
				if (input.mrvsvalue[s].u_description_sin === objOld.item_id) {
					var qty = input.mrvsvalue[s].u_qty.replace(/,/g, '');
					objOld.qty = parseInt(qty);
					objOld.totalPrice = input.mrvsvalue[s].u_total_price;
				}
			}
			arr.push(objOld);
		}
		data.finalSubObject = arr;
	} else if (input.action == 'checkmultirow') {
		var arrayUtil = new ArrayUtil();
		var finalmvrs = [];
		var oldArr = input.oldArr;
		var newArr = input.newArr;

		for (var v = 0; v < newArr.length; v++) {
			//check loop
			var foundIndex = -1;
			for (var x = 0; x < oldArr.length; x++) {
				if (oldArr[x].u_description_sin === newArr[v].u_description_sin) {
					foundIndex = x;
				}
			}

			if (foundIndex != -1) {
				//gs.log('A');
				if (newArr[v].u_qty != 0) {
					//gs.log('A - A');
					oldArr[foundIndex].u_qty = newArr[v].u_qty;
					oldArr[foundIndex].u_total_price = newArr[v].u_total_price;
				} else {
					//gs.log('A - B');
					oldArr.splice(foundIndex, 1);
				}
			} else {
				//gs.log('B');
				if (foundIndex == -1) {
					if (newArr[v].u_qty != 0) {
						//gs.log('B - A');
						oldArr.push(newArr[v]);
					} else {
						//gs.log('B - B');
					}
				}
			}
		}
		data.oldArr = oldArr;

		// console.log(JSON.stringify(data.oldArr));
	} else if (input.action == 'previewUpdate') {
		var oldArr = input.oldArr;
		var newArr = input.newArr;

		for (var v = 0; v < newArr.length; v++) {
			//check loop
			var indexFound = -1;
			for (var x = 0; x < oldArr.length; x++) {
				if (oldArr[x].u_description_sin === newArr[v].u_description_sin) {
					indexFound = x;
				}
			}

			if (indexFound != -1) {
				//gs.log('A');
				if (newArr[v].u_qty != 0) {
					//gs.log('A - A');
					oldArr[indexFound].u_qty = newArr[v].u_qty;
					oldArr[indexFound].u_total_price = newArr[v].u_total_price;
				} else {
					//gs.log('A - B');
					oldArr.splice(indexFound, 1);
				}
			} else {
				//gs.log('B');
				if (indexFound == -1) {
					if (newArr[v].u_qty != 0) {
						//gs.log('B - A');
						oldArr.push(newArr[v]);
					} else {
						//gs.log('B - B');
					}
				}
			}
		}
		data.oldArr = oldArr;
	} else if (input.action == 'determineUcCode') {
		var itemIds = (input.itemId || '').split(',').map(function (id) {
			return id.trim();
		});
		var results = [];

		itemIds.forEach(function (id) {
			// console.log('ids: ' + id);
			var grItem = new GlideRecord('u_istationery_stock_in');
			grItem.addEncodedQuery('sys_idIN' + id);
			grItem.query();
			while (grItem.next()) {
				var result = checkUseCase(grItem);
				results.push({
					description: id,
					name: grItem.getValue('name'),
					uc_code: result.ucCode,
					u_unit_price: result.u_unit_price,
					stock_in_unit_cost: grItem.getValue('u_stock_in_unit_cost'),
					u_stock_in_unit: grItem.getDisplayValue('u_stock_in_unit'),
					oldPrice: result.u_unit_price,
					editable: result.editable,
				});
				// console.log('results - ' + JSON.stringify(results));
			}
		});

		data.results = results;
	}

	function checkUseCase(grItem) {
		var ucCode = 'Out of case';
		var editable = true;

		// ---------- Query main items ----------
		var grUISI = new GlideRecord('u_istationery_stock_in');
		grUISI.addQuery('u_master_item_name.sys_id', grItem.u_master_item_name);
		grUISI.query();

		var items = [];
		while (grUISI.next()) {
			items.push({
				sys_id: grUISI.getUniqueValue(),
				itemName: grUISI.u_name,
				credit_available: parseInt(grUISI.u_credit_avaliable),
				active: grUISI.getValue('active') == '1',
				u_parent_item: grUISI.getValue('u_parent_item'),
			});
		}

		// ---------- No items ----------
		if (items.length === 0) return { ucCode: 'Out of case', editable: false };

		// ---------- UC-005: PO Active ----------
		var grPO = new GlideRecord('u_ist_look_up_po_item');
		grPO.addQuery('u_master_item', grItem.getUniqueValue());
		grPO.addQuery('u_po.u_active', 'true'); // or true if Boolean field
		grPO.query();
		if (grPO.hasNext()) return { ucCode: 'UC-005', editable: false };

		// ---------- Determine UC Code ----------
		if (items.length === 1) {
			var item = items[0];
			if (item.active) {
				gs.log(item.itemName + ' : ' + item.credit_available);
				return {
					ucCode: item.credit_available === 0 ? 'UC-001' : 'UC-002',
					editable: true,
				};
			} else {
				return { ucCode: 'Out of case', editable: false };
			}
		} else {
			var hasInactiveCreditZero = false;
			var hasInactiveCreditMore = false;
			var allActive = true;
			var outOfcase = false;

			var checkParentItem = checkParent(items);
			if (checkParentItem.hasParent == true) {
				if (checkParentItem.countActive > 1) {
					return { ucCode: 'UC-007', editable: false };
				}
			}

			for (var i = 0; i < items.length; i++) {
				var it = items[i];
				// if (checkParentItem.countActive > 1) {
				//     console.log(it.itemName + ' : ' + checkParentItem.countActive + ' : ');
				// 	outOfcase = true;
				// }

				// if (parseInt(it.credit_available) == 0 && !it.active) {
				// 	console.log('in');
				// 	hasInactiveCreditZero = true;
				// }

				if (it.credit_available == 0) {
					// if (it.active == true) {
					hasInactiveCreditZero = true;
					// }
				}

				if (!it.active && it.credit_available > 0) {
					hasInactiveCreditMore = true;
				}
				if (!it.active) {
					allActive = false;
				}
			}

			// console.log('outOfcase - ' + outOfcase);
			if (hasInactiveCreditZero) return { ucCode: 'UC-003', editable: true };
			if (hasInactiveCreditMore) return { ucCode: 'UC-004', editable: true };
			if (allActive) return { ucCode: 'UC-007', editable: false };
		}
	}

	function checkParent(items) {
		var parentItems = [];
		var hasParent = false;
		var countActive = 0;

		for (var i = 0; i < items.length; i++) {
			var it = items[i];
			if (it.active === true) {
				countActive++;
			}
			if (it.u_parent_item) {
				parentItems.push(it.u_parent_item);
				hasParent = true;
			}
		}

		return {
			hasParent: hasParent,
			parentItem: parentItems,
			countActive: countActive,
		};
	}
})();
