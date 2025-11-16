api.controller = function ($scope, $rootScope) {
	var c = this;
	c.searchText = '';
	c.currentPage = 1;
	c.copyArr = [];
	c.previewOBJ = [];
	c.orderedItems = [];
	c.copyObjectArr = [];
	c.oldData = [];
	c.checkObj = [];
	c.tempData = [];
	c.newArrData = [];
	$scope.status = $scope.data.status;

	// c.filterResult = {
	//     'category': '',
	//     'sub_category': ''
	// };
	c.filterResult = '';
	c.oldResult = null;

	// ===== Update UC Code Table =====
	c.updateUCCode = function (items) {
		console.log('items :', items);

		// --- 1. Validate input ---
		if (!Array.isArray(items) || items.length === 0) {
			// แสดงข้อความ default ถ้าไม่มีข้อมูลใน items
			$scope.page.g_form.setValue(
				'u_ticket_summary',
				'<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; font-family: Segoe UI, Arial, sans-serif; font-size: 14px; color: #374151; line-height: 1.5; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">This field is used to store the <strong style="color: #2563eb;">UC Code</strong>, which indicates the system’s behavior under different conditions. Use the table below as a quick reference.</div>',
			);
			return;
		}

		// --- 2. Initialize HTML structure ---
		let tableHTML =
			'<table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;">' +
			'<thead>' +
			'<tr style="background-color: #297bd8; color:#ffffff;">' +
			'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:35%;">Description</th>' +
			'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:15%;">Use Case</th>' +
			'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:25%;">User Edit Price</th>' +
			'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:25%;">Stock-In Unit Cost (Excl. VAT)</th>' +
			'</tr>' +
			'</thead><tbody>';

		// --- 3. Loop through each item to build rows ---
		items.forEach((item) => {
			const description = item.description;
			const ucCode = item.uc_code;
			const userEditPrice = item.u_unit_price;
			const stockInUnitCost = item.oldPrice;

			tableHTML +=
				`<tr>` +
				`<td style="border: 1px solid #ddd; padding: 8px; width:35%;">` +
				description +
				`</td>` +
				`<td style="border: 1px solid #ddd; padding: 8px; text-align:center; width:15%;">` +
				ucCode +
				`</td>` +
				`<td style="border: 1px solid #ddd; padding: 8px; text-align:center; width:25%;">` +
				userEditPrice +
				`</td>` +
				`<td style="border: 1px solid #ddd; padding: 8px; text-align:center; width:25%;">` +
				stockInUnitCost +
				`</td>` +
				`</tr>`;
		});

		// --- 4. Close table and set value back to form field ---
		tableHTML += '</tbody></table>';

		$scope.page.g_form.setValue('u_ticket_summary', tableHTML);
	};

	// Copy Array //

	c.copyArray = function () {
		// c.filterResult.category = $scope.page.g_form.getValue('u_category');
		// c.filterResult.sub_category = $scope.page.g_form.getValue('u_sub_category');
		var ref = $scope.page.g_form.getValue('reference_to_stock_in_request');
		c.filterResult = $scope.page.g_form.getValue('u_so_po_no_');
		//alert(c.filterResult.category);
		// if (c.oldResult == null) {
		c.oldResult = c.filterResult;
		c.fetchValue(ref);
		// } else {
		//     c.oldResult = c.filterResult;
		//     c.fetchValue();
		// }
	};

	// Fetch Value //

	c.fetchValue = function (ref) {
		//alert(c.filterResult.category);
		var reference = '';
		var checkmvrs = $scope.page.g_form.getValue('istationary_stock_in_item_list_cart');
		if (checkmvrs != '' && ref == '') {
			checkmvrs = JSON.parse(checkmvrs);
			reference = 'referenceoldvalue';
		} else if (checkmvrs != '' && ref != '') {
			checkmvrs = JSON.parse(checkmvrs);
			reference = 'checkreferencevalue';
		} else {
			reference = 'referencevalue';
		}
		c.server
			.get({
				action: reference,
				filterData: c.filterResult,
				previewData: c.previewData,
				mrvsvalue: checkmvrs,
				ref: ref,
			})
			.then(function (r) {
				//alert(JSON.stringify(r.data));
				if (r.data) {
					c.data.finalSubObject = r.data.finalSubObject;
					c.data.finalObject = r.data.finalObject;
					c.data.finalReSubObject = r.data.finalReSubObject;
					//c.copyArr = JSON.parse(JSON.stringify(c.data.finalObject));
					if (reference == 'referencevalue') {
						c.copyArr = JSON.parse(JSON.stringify(c.data.finalObject));
					} else if (reference == 'checkreferencevalue') {
						c.copyArr = JSON.parse(JSON.stringify(c.data.finalReSubObject));
					} else {
						c.copyArr = JSON.parse(JSON.stringify(c.data.finalSubObject));
					}
					//console.log(JSON.stringify(c.copyArr));
					// alert(JSON.stringify(c.copyArr));
				}
			});
	};

	// Generate Array //

	c.generateArray = function () {
		c.finalData = [];
		c.previewData = [];
		c.newArr = [];
		c.olddataArr = [];
		var oldDataStr = $scope.page.g_form.getValue('istationary_stock_in_item_list_cart');
		// console.log('oldata : ' + oldDataStr + ' ; type : ' + typeof(oldDataStr));
		if (oldDataStr != '') {
			c.oldData = JSON.parse(oldDataStr);
		}
		for (var y = 0; y < c.copyArr.length; y++) {
			if (oldDataStr == '') {
				// console.log('if = empty');
				if (c.copyArr[y].qty != 0) {
					var newData = {
						u_description_sin: c.copyArr[y].item_id,
						u_unit_type: c.copyArr[y].unit_type,
						u_unit_price: c.copyArr[y].unit_price,
						u_qty: c.copyArr[y].qty.toString(),
						u_total_price: c.copyArr[y].totalPrice,
					};
					c.newArr.push(newData);
				}
			} else {
				// console.log('else != empty');
				var newData = {
					u_description_sin: c.copyArr[y].item_id,
					u_unit_type: c.copyArr[y].unit_type,
					u_unit_price: c.copyArr[y].unit_price,
					u_qty: c.copyArr[y].qty.toString(),
					u_total_price: c.copyArr[y].totalPrice,
				};
				c.newArr.push(newData);
			}
		}
		if (oldDataStr != '') {
			// console.log('if oldDataStr != empty')
			c.server
				.get({
					action: 'checkmultirow',
					newArr: c.newArr,
					oldArr: c.oldData,
				})
				.then(function (r) {
					// console.log(r.data.oldArr);
					c.olddataArr = r.data.oldArr;
					c.newDataArr = c.olddataArr;

					// Prepare items for UC code table
					const itemsForUC = oldArr.map((item) => {
						// console.log('**** oldArr =>: ' + JSON.stringify(item) + '****');
						const copyItem = c.copyArr.find((ci) => ci.item_id === item.u_description_sin);
						return {
							u_description_sin: item.u_description_sin,
							description: copyItem
								? copyItem.description
								: item.description || item.u_description_sin,
							u_unit_price: item.u_unit_price,
							oldPrice: '-',
							uc_code: '-',
						};
					});

					c.updateUCCode(itemsForUC);

					c.updatMRV(c.newDataArr);
					//console.log(c.newDataArr);
				});
		} else {
			// console.log('else oldDataStr == empty')
			c.olddataArr = c.newArr;
			c.newDataArr = c.olddataArr;
			c.finalData = c.newDataArr;

			const itemsForUC = c.newArr.map((item) => {
				const copyItem = c.copyArr.find((ci) => ci.item_id === item.u_description_sin);
				return {
					u_description_sin: item.u_description_sin,
					description: copyItem ? copyItem.description : item.description || item.u_description_sin,
					u_unit_price: item.u_unit_price,
					oldPrice: '-',
					uc_code: '-',
				};
			});

			// console.log('✅ itemsForUC (from backend oldPrice):', JSON.stringify(itemsForUC, null, 2));

			c.updateUCCode(itemsForUC);
			c.updatMRV(c.newDataArr);
		}
	};

	c.updatMRV = function (finalData) {
		//console.log('updateMRV : ' + finalData);
		c.total = 0;
		for (var v = 0; v < finalData.length; v++) {
			if (parseFloat(finalData[v].u_qty) > 0) {
				c.total = c.total + parseFloat(finalData[v].u_total_price.replace(/,/g, ''));
				$scope.data.sumPrice =
					$scope.data.sumPrice + parseFloat(finalData[v].u_total_price.replace(/,/g, ''));
			}
			c.total_display = c.total
				.toFixed(2)
				.toString()
				.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
			$scope.page.g_form.setValue('u_grand_price_display', '฿' + c.total_display);
			// console.log('updateMRV c.total_display : ' + c.total_display);
			$scope.page.g_form.setValue('u_grand_price', c.total);
			// console.log('updateMRV c.total : ' + c.total);
		}

		$('#myPoModal').modal('hide');
		$('#myPreviewPoModal').modal('hide');

		if (finalData.length != 0) {
			$scope.page.g_form.setValue('istationary_stock_in_item_list_cart', JSON.stringify(finalData));
			c.data.finalObject = c.copyArr;
			//alert('Preview Data : ' + JSON.stringify(c.previewData));
			//c.previewOBJ += JSON.parse(JSON.stringify(c.previewData));
		} else {
			$scope.page.g_form.setValue('istationary_stock_in_item_list_cart', '');
		}
	};

	c.fetchObjectValue = function () {
		var mrv = $scope.page.g_form.getValue('istationary_stock_in_item_list_cart');
		var po = $scope.page.g_form.getValue('u_so_po_no_');
		var ref = $scope.page.g_form.getValue('reference_to_stock_in_request');
		if (mrv != '') {
			mrv = JSON.parse(mrv);
		}
		c.server
			.get({
				action: 'referencepreviewvalue',
				mrv: mrv,
				po: po,
				ref: ref,
			})
			.then(function (item) {
				if (item.data) {
					c.data.finalPreviewObject = item.data.finalPreviewObject;

					if (c.copyObjectArr.length == 0) {
						c.copyObjectArr = JSON.parse(JSON.stringify(c.data.finalPreviewObject));
						// c.updatMRV(c.data.finalPreviewObject);
						c.total_display = item.data.grand_price
							.toFixed(2)
							.toString()
							.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
						$scope.page.g_form.setValue('u_grand_price', c.total_display);
						$scope.page.g_form.setValue('u_grand_price_display', '฿' + c.total_display);
					} else {
						c.copyObjectArr = JSON.parse(JSON.stringify(c.data.finalPreviewObject));
						// c.updatMRV(c.data.finalPreviewObject);
						c.total_display = item.data.grand_price
							.toFixed(2)
							.toString()
							.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
						$scope.page.g_form.setValue('u_grand_price', c.total_display);
						$scope.page.g_form.setValue('u_grand_price_display', '฿' + c.total_display);
					}
					c.previewOBJ = c.copyObjectArr;
					// alert(JSON.stringify(c.copyArr));
				}
			});
	};
	// ShowImage //

	$scope.showLargeImage = function (imgUrl) {
		var html = '<div align="center">';
		if (imgUrl == '') {
			html += '<img ng-src="No%20Image.png" height="500" />';
		} else {
			html +=
				'<img ng-src="' +
				imgUrl +
				'" height="500" onclick="window.open(' +
				imgUrl +
				', _blank);"/>';
		}
		html += '</div>';
		c.largeImage = $uibModal
			.open({
				template: html,
			})
			.then(function () {});
	};

	// Update Price //

	$scope.updatePrice = function (item) {
		//--- Dynamic Po Rem ---//
		var price = item.unit_price.toString();
		var actualPrice = 0;
		c.total = 0;
		//--- cal change in preview ---
		// console.log(c.total_display + ' : ' + typeof(c.total_display));
		if (c.total_display == '0' || c.total_display == undefined) {
			c.total_display = 0;
		} else {
			if (item.totalPrice == '0' || item.totalPrice == undefined) {
				// console.log('if');
				item.totalPrice = 0;
			} else {
				item.totalPrice = item.totalPrice.replaceAll(',', '');
				item.totalPrice = parseFloat(item.totalPrice);
			}
			c.total_display = c.total_display.toString();
			c.total_display = c.total_display.replaceAll(',', '');
			c.total_display = parseFloat(c.total_display);
			c.total_display = c.total_display - item.totalPrice;
			// console.log('base : ' + c.total_display);
		}
		var summary = '';
		var orderSummary = '';
		if (parseFloat(item.qty) == 0 || parseFloat(item.qty) == '0' || item.qty == '') {
			item.totalPrice = 0.0;
			//--- Dynamic Po Rem ---//
			item.remaining_qty = item.po_remaining_qty;
			//console.log('if rem : ' + item.remaining_qty)
		} else {
			// console.log('else')
			actualPrice = price.replace(/[^0-9.-]+/g, '');
			item.totalPrice = parseFloat(item.qty) * parseFloat(actualPrice);
			var item_total_price = item.totalPrice;
			// console.log('plus : ' + item_total_price);
			item.totalPrice = item.totalPrice
				.toFixed(2)
				.toString()
				.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
			var new_total = c.total_display + parseFloat(item_total_price);
			c.total_display = new_total
				.toFixed(2)
				.toString()
				.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
			// console.log('final : ' + c.total_display);
			//--- Dynamic Po Rem ---//
			item.remaining_qty = parseFloat(item.po_remaining_qty) - parseFloat(item.qty);
			item.remaining_qty = item.remaining_qty.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
			//console.log('else rem : ' + item.remaining_qty)
		}
	};

	c.updateCart = function () {
		c.finalData = [];
		c.previewData = [];
		c.newArr = [];
		c.olddataArr = [];
		var oldDataStr = $scope.page.g_form.getValue('istationary_stock_in_item_list_cart');
		c.oldData = JSON.parse(oldDataStr);
		for (var y = 0; y < c.previewOBJ.length; y++) {
			//console.log('Preview old-pack : '+JSON.stringify(c.previewOBJ[y]));
			var newData = {
				u_description_sin: c.previewOBJ[y].item_id,
				u_unit_type: c.previewOBJ[y].unit_type,
				u_unit_price: c.previewOBJ[y].unit_price,
				u_qty: c.previewOBJ[y].qty.toString(),
				u_total_price: c.previewOBJ[y].totalPrice,
			};
			//console.log('Preview re-pack : '+JSON.stringify(newData));
			c.newArr.push(newData);
		}

		c.server
			.get({
				action: 'previewUpdate',
				newArr: c.newArr,
				oldArr: c.oldData,
			})
			.then(function (r) {
				// //console.log(r.data.oldArr);
				// c.olddataArr = r.data.oldArr;
				// c.newDataArr = c.olddataArr;
				// c.updatMRV(c.newDataArr);
				// //console.log(c.newDataArr);
				const oldArr = (r.data.oldArr || []).map((oldItem) => {
					const match = c.previewOBJ.find((p) => p.item_id === oldItem.u_description_sin);

					// Convert string to number before comparing
					const oldPriceNum = parseNumber(oldItem.u_unit_price);
					const newPriceNum = match ? parseNumber(match.unit_price) : oldPriceNum;

					if (oldPriceNum !== newPriceNum) {
						return { ...oldItem, u_unit_price: formatCurrency(newPriceNum) };
					}

					return { ...oldItem, u_unit_price: formatCurrency(oldItem.u_unit_price) };
				});

				// Save the processed array
				c.olddataArr = oldArr;
				c.newDataArr = c.olddataArr;

				// Call functions to update UC Code and MRV
				c.updateUCCode(c.newDataArr);
				c.updatMRV(c.newDataArr);
			});
	};
};
