(function () {
	var arr = [];
	console.log('Input Action: ' + input.action);
	if (input.action == 'referencevalue' && input.filterData != '') {
		var arrAllowed = []; // items allowed for this user
		var uniqueAllowed = {}; // prevent duplicates

		var po_item = new GlideRecord('u_ist_look_up_po_item');
		po_item.addEncodedQuery(
			'u_po=' +
				input.filterData +
				'^u_budget_holder.u_budget_holder=' +
				input.budget_holder +
				'^u_po.u_active=true^ORDERBYu_master_item',
		);
		po_item.query();

		while (po_item.next()) {
			var master_item = po_item.u_master_item.getRefRecord();
			var u_master_item_name = po_item.u_master_item.u_master_item_name;
			var u_ist_budget_holder = po_item.u_po.u_ist_budget_holder;

			var img = ' ';
			if (
				po_item.u_master_item.u_master_item_name.u_item_picture != '' ||
				po_item.u_master_item.u_master_item_name.u_item_picture != ' ' ||
				po_item.u_master_item.u_master_item_name.u_item_picture != null
			) {
				img = po_item.u_master_item.u_master_item_name.u_item_picture + '.iix';
			}

			var checkItem = new GlideRecord('u_map_master_item_holder');
			checkItem.addEncodedQuery(
				'u_budget_holder=' +
					u_ist_budget_holder +
					'^u_item=' +
					u_master_item_name +
					'^ORu_can_pick_itemDYNAMIC90d1921e5f510100a9ad2572f2b477fe' +
					'^ORu_can_pick_item_groupLIKE' +
					gs.getUser().getRecord().getValue('department') +
					'^ORu_groupDYNAMICd6435e965f510100a9ad2572f2b47744',
			);
			checkItem.query();
			while (checkItem.next()) {
				var itemId = checkItem.u_item.toString();
				// ป้องกัน duplicate
				if (!uniqueAllowed[itemId]) {
					uniqueAllowed[itemId] = true;
					arrAllowed.push(itemId);
				}
			}

			// เอา arrAllowed ไปใช้ filter record อีกที
			var isAllowed = arrAllowed.indexOf(u_master_item_name.toString()) > -1;

			var request_qty = 0;
			var line_item = new GlideRecord('u_ist_stock_in_line_item');
			line_item.addEncodedQuery(
				'u_order=' + input.ref + '^u_item=' + master_item.sys_id + '^active=true',
			);
			line_item.query();
			if (line_item.next()) {
				request_qty = line_item.u_quantity.getDisplayValue();
			}

			var po_max_rem = po_item.u_po_remaining.getValue();
			var po_rem = po_item.u_po_remaining.getValue();
			if ((request_qty != '0' && input.ref != '') || (request_qty != 0 && input.ref != '')) {
				po_max_rem = parseInt(po_max_rem) + parseInt(request_qty);
				po_rem = parseInt(po_rem) + parseInt(request_qty);
			}
			if (po_max_rem != 0 && po_item.u_po_remaining != 0 && po_item.u_po_remaining != '') {
				var obj = {
					photo1: img,
					description: master_item.getValue('name'),
					unit_type: master_item.u_stock_in_unit.getDisplayValue(),
					unit_price: parseFloat(master_item.getValue('u_stock_in_unit_cost'))
						.toFixed(2)
						.toString()
						.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
					po_remaining_qty: po_max_rem == null ? 0 : po_max_rem,
					remaining_qty: po_rem == null ? 0 : po_rem,
					qty: 0,
					totalPrice: 0.0,
					item_id: master_item.getUniqueValue(),
				};
				arr.push(obj);
			}
			//gs.log(JSON.stringify(arr));
			data.finalObject = arr;
		}
	} else if (input.action == 'referencepreviewvalue') {
		arr = [];
		for (var i = 0; i < input.mrv.length; i++) {
			var request_qty = 0;
			var po_item = new GlideRecord('u_ist_look_up_po_item');
			po_item.addQuery(
				'u_po=' +
					input.po +
					'^u_master_item=' +
					input.mrv[i].u_description_sin +
					'^u_budget_holder.u_budget_holder=' +
					input.budget_holder,
			);
			po_item.query();
			if (po_item.next()) {
				// get MRV request QTY
				var mrv_item = po_item.u_master_item.getRefRecord();
				var mrv_item_id = mrv_item.getUniqueValue();
				var imgPreview = ' ';

				if (
					po_item.u_master_item.u_master_item_name.u_item_picture != '' ||
					po_item.u_master_item.u_master_item_name.u_item_picture != ' ' ||
					po_item.u_master_item.u_master_item_name.u_item_picture != null
				) {
					imgPreview = po_item.u_master_item.u_master_item_name.u_item_picture + '.iix';
				}

				// get Submitted request QTY
				var line_item = new GlideRecord('u_ist_stock_in_line_item');
				line_item.addEncodedQuery(
					'u_order=' + input.ref + '^u_item=' + mrv_item.sys_id + '^active=true',
				);
				line_item.query();
				if (line_item.next()) {
					request_qty = line_item.u_quantity.getDisplayValue();
				}

				var po_max_rem = po_item.u_po_remaining.getValue();
				var po_rem = po_item.u_po_remaining.getValue();
				if (request_qty != '0' || request_qty != 0) {
					po_max_rem = parseInt(po_max_rem) + parseInt(request_qty);
					po_rem = parseInt(po_rem);
				}

				var qty = input.mrv[i].u_qty.replace(/,/g, '');

				var ref = input.ref != '';
				var objPreview = {
					photo1: imgPreview,
					description: mrv_item.name.getDisplayValue(),
					unit_type: mrv_item.u_stock_in_unit.getDisplayValue(),
					unit_price: parseFloat(mrv_item.getValue('u_stock_in_unit_cost'))
						.toFixed(2)
						.toString()
						.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
					po_remaining_qty: ref ? po_max_rem : parseInt(po_item.u_po_remaining),
					remaining_qty: ref
						? po_max_rem - parseInt(qty)
						: parseInt(po_item.u_po_remaining) - parseInt(qty),
					qty: parseInt(qty),
					totalPrice: input.mrv[i].u_total_price,
					item_id: mrv_item_id,
				};
				arr.push(objPreview);
				//gs.log('Preview po re-pack : '+JSON.stringify(objPreview));
			}
			data.finalPreviewObject = arr;
			//gs.log(JSON.stringify(data.finalPreviewObject));
			var totalAmnt = 0;
			for (var j = 0; j < data.finalPreviewObject.length; j++) {
				//gs.log("total_amount : " + data.finalArray[i].total_amount.replace(/,/g, ""));
				totalAmnt =
					parseFloat(totalAmnt) +
					parseFloat(data.finalPreviewObject[j].totalPrice.replace(/,/g, ''));
			}
			data.grand_price = totalAmnt;
		}
	} else if (input.action == 'referenceoldvalue' && input.filterData != '') {
		arr = [];
		var arrAllowed = []; // items allowed for this user
		var uniqueAllowed = {}; // prevent duplicates
		var mrv_po_item = new GlideRecord('u_ist_look_up_po_item');
		po_item.addEncodedQuery(
			'u_po=' +
				input.filterData +
				'^u_budget_holder.u_budget_holder=' +
				input.budget_holder +
				'^u_po.u_active=true^ORDERBYu_master_item',
		);
		mrv_po_item.query();

		while (mrv_po_item.next()) {
			var mas_item = mrv_po_item.u_master_item.getRefRecord();
			var u_master_item_name = mrv_po_item.u_master_item.u_master_item_name;
			var u_ist_budget_holder = mrv_po_item.u_po.u_ist_budget_holder;
			var imgs = ' ';
			if (
				mas_item.u_master_item.u_master_item_name.u_item_picture != '' &&
				mas_item.u_master_item.u_master_item_name.u_item_picture != ' ' &&
				mas_item.u_master_item.u_master_item_name.u_item_picture != null
			) {
				imgs = mas_item.u_master_item.u_master_item_name.u_item_picture + '.iix';
			}

			var checkItem = new GlideRecord('u_map_master_item_holder');
			checkItem.addEncodedQuery(
				'u_budget_holder=' +
					u_ist_budget_holder +
					'^u_item=' +
					u_master_item_name +
					'^ORu_can_pick_itemDYNAMIC90d1921e5f510100a9ad2572f2b477fe' +
					'^ORu_can_pick_item_groupLIKE' +
					gs.getUser().getRecord().getValue('department') +
					'^ORu_groupDYNAMICd6435e965f510100a9ad2572f2b47744',
			);
			checkItem.query();
			// console.log('Permission Query: ' + checkItem.getEncodedQuery());
			// console.log(checkItem.next());
			while (checkItem.next()) {
				var itemId = checkItem.u_item.toString();
				// ป้องกัน duplicate
				if (!uniqueAllowed[itemId]) {
					uniqueAllowed[itemId] = true;
					arrAllowed.push(itemId);
				}
			}

			console.log('Allowed Items: ' + arrAllowed.join(','));
			// เอา arrAllowed ไปใช้ filter record อีกที
			var isAllowed = arrAllowed.indexOf(u_master_item_name.toString()) > -1;
			if (!isAllowed) {
				console.log(
					'Item ' +
						master_item.getDisplayValue('name') +
						' is not allowed for this user. Skipping.',
				);
				continue; // skip to next po_item
			}

			var request_qty = 0;
			var line_item = new GlideRecord('u_ist_stock_in_line_item');
			line_item.addEncodedQuery(
				'u_order=' + input.ref + '^u_item=' + mas_item.sys_id + '^active=true',
			);
			line_item.query();
			if (line_item.next()) {
				request_qty = line_item.u_quantity.getDisplayValue();
			}

			var po_max_rem = mrv_po_item.u_po_remaining.getValue();
			var po_rem = mrv_po_item.u_po_remaining.getValue();

			if ((request_qty != '0' && input.ref != '') || (request_qty != 0 && input.ref != '')) {
				po_max_rem = parseInt(po_max_rem) + parseInt(request_qty);
				po_rem = parseInt(po_rem) + parseInt(request_qty);
			}

			if (po_max_rem != 0 && mrv_po_item.u_po_remaining != 0 && mrv_po_item.u_po_remaining != '') {
				var objOld = {
					photo1: imgs,
					description: mas_item.getValue('name'),
					unit_type: mas_item.u_stock_in_unit.getDisplayValue(),
					unit_price: parseFloat(mas_item.getValue('u_stock_in_unit_cost'))
						.toFixed(2)
						.toString()
						.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
					po_remaining_qty:
						mrv_po_item.u_po_remaining.getValue() == null
							? 0
							: mrv_po_item.u_po_remaining.getValue(),
					remaining_qty:
						mrv_po_item.u_po_remaining.getValue() == null
							? 0
							: mrv_po_item.u_po_remaining.getValue(),
					qty: 0,
					totalPrice: 0.0,
					item_id: mas_item.getUniqueValue(),
				};

				// match กับรายการ MRV เก่าที่ส่งมา
				for (var s = 0; s < input.mrvsvalue.length; s++) {
					if (input.mrvsvalue[s].u_description_sin === objOld.item_id) {
						var qty = input.mrvsvalue[s].u_qty.replace(/,/g, '');
						objOld.qty = parseInt(qty);
						objOld.totalPrice = input.mrvsvalue[s].u_total_price;
						objOld.po_remaining_qty = parseInt(mrv_po_item.u_po_remaining);
						objOld.remaining_qty = parseInt(mrv_po_item.u_po_remaining) - parseInt(qty);
					}
				}
				arr.push(objOld);
			}
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
	} else if (input.action == 'checkreferencevalue') {
		arr = [];
		var arrAllowed = []; // items allowed for this user
		var uniqueAllowed = {}; // prevent duplicates

		var mrvs_po_item = new GlideRecord('u_ist_look_up_po_item');
		mrvs_po_item.addEncodedQuery(
			'u_po=' +
				input.filterData +
				'^u_budget_holder.u_budget_holder=' +
				input.budget_holder +
				'^u_po.u_active=true^ORDERBYu_master_item',
		);
		mrvs_po_item.query();

		while (mrvs_po_item.next()) {
			console.log('mrvs_po_item Query: ' + mrvs_po_item.getEncodedQuery());

			var mast_item = mrvs_po_item.u_master_item.getRefRecord();

			var request_qty = 0;
			var line_item = new GlideRecord('u_ist_stock_in_line_item');
			line_item.addEncodedQuery(
				'u_order=' + input.ref + '^u_item=' + mast_item.sys_id + '^active=true',
			);
			line_item.query();
			if (line_item.next()) {
				request_qty = line_item.u_quantity.getDisplayValue();
			}

			var imgg = ' ';
			if (
				mast_item.getValue('picture') != '' &&
				mast_item.getValue('picture') != ' ' &&
				mast_item.getValue('picture') != null
			) {
				imgg = mast_item.getValue('picture') + '.iix';
			}

			var checkItem = new GlideRecord('u_map_master_item_holder');
			checkItem.addEncodedQuery(
				'u_budget_holder=' +
					u_ist_budget_holder +
					'^u_item=' +
					u_master_item_name +
					'^ORu_can_pick_itemDYNAMIC90d1921e5f510100a9ad2572f2b477fe' +
					'^ORu_can_pick_item_groupLIKE' +
					gs.getUser().getRecord().getValue('department') +
					'^ORu_groupDYNAMICd6435e965f510100a9ad2572f2b47744',
			);
			checkItem.query();
			console.log('Permission Query: ' + checkItem.getEncodedQuery());
			// console.log(checkItem.next());
			while (checkItem.next()) {
				var itemId = checkItem.u_item.toString();
				// ป้องกัน duplicate
				if (!uniqueAllowed[itemId]) {
					uniqueAllowed[itemId] = true;
					arrAllowed.push(itemId);
				}
			}

			// เอา arrAllowed ไปใช้ filter record อีกที
			var isAllowed = arrAllowed.indexOf(u_master_item_name.toString()) > -1;

			var po_max_rem = mrvs_po_item.u_po_remaining.getValue();
			var po_rem = mrvs_po_item.u_po_remaining.getValue();

			if (request_qty != '0' && request_qty != 0 && input.ref != '') {
				po_max_rem = parseInt(po_max_rem) + parseInt(request_qty);
				po_rem = parseInt(po_rem) + parseInt(request_qty);
			}

			if (
				po_max_rem != 0 &&
				mrvs_po_item.u_po_remaining != 0 &&
				mrvs_po_item.u_po_remaining != ''
			) {
				var oldObj = {
					photo1: imgg,
					description: mast_item.getValue('name'),
					unit_type: mast_item.u_stock_in_unit.getDisplayValue(),
					unit_price: parseFloat(mast_item.getValue('u_stock_in_unit_cost'))
						.toFixed(2)
						.toString()
						.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
					po_remaining_qty: po_max_rem == null ? 0 : po_max_rem,
					remaining_qty: po_rem == null ? 0 : po_rem,
					qty: 0,
					totalPrice: 0.0,
					item_id: mast_item.getUniqueValue(),
				};

				for (var k = 0; k < input.mrvsvalue.length; k++) {
					if (input.mrvsvalue[k].u_description_sin === oldObj.item_id) {
						var qty = input.mrvsvalue[k].u_qty.replace(/,/g, '');
						oldObj.qty = parseInt(qty);
						oldObj.totalPrice = input.mrvsvalue[k].u_total_price;
						oldObj.po_remaining_qty = parseInt(po_max_rem);
						oldObj.remaining_qty = parseInt(po_max_rem) - parseInt(qty);
					}
				}
				arr.push(oldObj);
			}
		}
		data.finalReSubObject = arr;
	}
})();
