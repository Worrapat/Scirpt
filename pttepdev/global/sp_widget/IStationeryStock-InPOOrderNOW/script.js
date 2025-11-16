(function () {
	var arr = [];
	//gs.log('Test			ww');
	if (input.action == 'referencevalue' && input.filterData != '') {
		//	gs.log('cat : '+input.filterData.category);
		//gs.log('SIT Case : A');
		var po_item = new GlideRecord('u_ist_look_up_po_item');
		po_item.addEncodedQuery(
			'u_po=' + input.filterData + '^u_po.u_active=true^ORDERBYu_master_item',
		);
		po_item.query();
		while (po_item.next()) {
			// get MRV request QTY
			var master_item = po_item.u_master_item.getRefRecord();
			var img = ' ';
			if (
				master_item.getValue('picture') != '' ||
				master_item.getValue('picture') != ' ' ||
				master_item.getValue('picture') != null
			) {
				img = master_item.getValue('picture') + '.iix';
			}
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
		}
		//gs.log(JSON.stringify(arr));
		data.finalObject = arr;
	} else if (input.action == 'referencepreviewvalue') {
		//gs.log('SIT Case : B');
		arr = [];
		for (var i = 0; i < input.mrv.length; i++) {
			//gs.log('Preview po old-pack : '+JSON.stringify(input.mrv));

			var request_qty = 0;
			var po_item = new GlideRecord('u_ist_look_up_po_item');
			po_item.addQuery('u_po=' + input.po + '^u_master_item=' + input.mrv[i].u_description_sin);
			po_item.query();
			if (po_item.next()) {
				// get MRV request QTY
				var mrv_item = po_item.u_master_item.getRefRecord();
				var mrv_item_id = mrv_item.getUniqueValue();
				var imgPreview = ' ';
				if (
					mrv_item.getValue('picture') != '' ||
					mrv_item.getValue('picture') != ' ' ||
					mrv_item.getValue('picture') != null
				) {
					imgPreview = mrv_item.getValue('picture') + '.iix';
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
		var mrv_po_item = new GlideRecord('u_ist_look_up_po_item');
		mrv_po_item.addEncodedQuery(
			'u_po=' + input.filterData + '^u_po.u_active=true^ORDERBYu_master_item',
		);
		mrv_po_item.query();
		while (mrv_po_item.next()) {
			var mas_item = mrv_po_item.u_master_item.getRefRecord();
			// if (mrv_po_item.u_po_remaining != 0 || mrv_po_item.u_po_remaining != '0') {
			var imgs = ' ';
			// gs.info(parse[i].u_description_sin)
			if (
				mas_item.getValue('picture') != '' ||
				mas_item.getValue('picture') != ' ' ||
				mas_item.getValue('picture') != null
			) {
				imgs = mas_item.getValue('picture') + '.iix';
			}
			var request_qty = 0;
			var line_item = new GlideRecord('u_ist_stock_in_line_item');
			line_item.addEncodedQuery(
				'u_order=' + input.ref + '^u_item=' + master_item.sys_id + '^active=true',
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
			if (po_max_rem != 0 && po_item.u_po_remaining != 0 && po_item.u_po_remaining != '') {
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
		var mrvs_po_item = new GlideRecord('u_ist_look_up_po_item');
		mrvs_po_item.addEncodedQuery(
			'u_po=' + input.filterData + '^u_po.u_active=true^ORDERBYu_master_item',
		);
		mrvs_po_item.query();
		while (mrvs_po_item.next()) {
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
				mast_item.getValue('picture') != '' ||
				mast_item.getValue('picture') != ' ' ||
				mast_item.getValue('picture') != null
			) {
				imgg = mast_item.getValue('picture') + '.iix';
			}
			var po_max_rem = mrvs_po_item.u_po_remaining.getValue();
			var po_rem = mrvs_po_item.u_po_remaining.getValue();
			if (request_qty != '0' || request_qty != 0) {
				po_max_rem = parseInt(po_max_rem) + parseInt(request_qty);
				po_rem = parseInt(po_rem);
			}
			if (po_max_rem != 0 && po_item.u_po_remaining != 0 && po_item.u_po_remaining != '') {
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
						oldObj.po_remaining_qty = po_max_rem;
						oldObj.remaining_qty = parseInt(po_max_rem) - parseInt(qty);
					}
				}
				arr.push(oldObj);
			}
		}
		data.finalReSubObject = arr;
	}
})();
