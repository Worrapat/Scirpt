api.controller = function ($scope, $rootScope) {
	//#region Variables
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
	c.filterResult = { category: '', sub_category: '' };
	c.oldResult = null;

	//#endregion Variables

	//#region Helper Functions

	const parseNumber = (value) => parseFloat((value || 0).toString().replace(/,/g, '')) || 0;
	const formatCurrency = (value) =>
		parseNumber(value).toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});

	//#endregion Helper Functions

	//#region updateUCCode Functions

	// ===== Update UC Code Table =====
	c.updateUCCode = function (items) {
		// ensure items is array
		if (!Array.isArray(items) || items.length === 0) {
			$scope.page.g_form.setValue(
				'u_ticket_summary',
				'<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; font-family: Segoe UI, Arial, sans-serif; font-size: 14px; color: #374151; line-height: 1.5; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">This field is used to store the <strong style="color: #2563eb;">UC Code</strong>, which indicates the system&rsquo;s behavior under different conditions. Use the table below as a quick reference.</div>',
			);
			return;
		}

		// --- ถ้าไม่มี previous state ให้เริ่มต้นใหม่ ---
		if (!c.previousItemsWithDetails) {
			c.previousItemsWithDetails = [];
		}

		c.server
			.get({
				action: 'determineUcCode',
				itemId: items.map((i) => i.u_description_sin).join(','),
			})
			.then((r) => {
				const results = r.data.results || [];
				const resultMap = Object.fromEntries(results.map((res) => [res.description, res]));

				// map items has uc_code and description
				let itemsWithDetails = items.map((item) => {
					const res = resultMap[item.u_description_sin] || {};
					const isPriceChanged =
						parseNumber(res.stock_in_unit_cost) !== parseNumber(item.u_unit_price);

					return {
						item_id: item.description,
						description: res.name || item.u_description_sin,
						uc_code: res.uc_code || '',
						u_unit_price: formatCurrency(item.u_unit_price),
						oldPrice: formatCurrency(item.oldPrice),
						flagOldRecord: isPriceChanged,
						u_stock_in_unit: res.u_stock_in_unit,
					};
				});

				c.previousItemsWithDetails = itemsWithDetails;

				// console.log('itemsWithDetails :', JSON.stringify(itemsWithDetails, null, 2));

				// --- render table ---
				let htmlValue =
					'<table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;">' +
					'<thead>' +
					'<tr style="background-color: #297bd8; color:#ffffff;">' +
					'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:25%;">Description</th>' +
					'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:15%;">Use Case</th>' +
					'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">User Edit Price</th>' +
					'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">Stock-In Unit Cost (Excl. VAT)</th>' +
					'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:20%;">Stock-In Unit</th>' +
					'</tr></thead><tbody>';

				itemsWithDetails.forEach((item) => {
					let desc = item.description || '';
					let uc = item.flagOldRecord ? item.uc_code : '-';
					let newPrice = item.flagOldRecord ? item.u_unit_price : '-';
					let oldPrice = item.oldPrice;

					htmlValue +=
						`<tr><td style="border: 1px solid #ddd; padding: 8px; width:35%;">` +
						desc +
						`</td>` +
						`<td style="border: 1px solid #ddd; padding: 8px; width:15%; text-align:center">` +
						uc +
						`</td>` +
						`<td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">` +
						newPrice +
						`<td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">` +
						oldPrice +
						`</td>` +
						`<td style="border: 1px solid #ddd; padding: 8px; width:25%; text-align:center">` +
						item.u_stock_in_unit +
						`</td>` +
						`</td></tr>`;
				});

				htmlValue += '</tbody></table>';

				$scope.page.g_form.setValue('u_ticket_summary', htmlValue);
			});
	};

	//#endregion updateUCCode Functions

	// ===== Copy Array =====
	c.copyArray = function () {
		c.filterResult.category = $scope.page.g_form.getValue('u_category');
		c.filterResult.sub_category = $scope.page.g_form.getValue('u_sub_category');

		if (c.oldResult == null) {
			c.oldResult = JSON.parse(JSON.stringify(c.filterResult));
			c.fetchValue();
		} else {
			if (JSON.stringify(c.oldResult) !== JSON.stringify(c.filterResult)) {
				c.oldResult = JSON.parse(JSON.stringify(c.filterResult));
				c.fetchValue();
			}
		}
	};

	// ===== Fetch Value =====
	c.fetchValue = function () {
		const rawCart = $scope.page.g_form.getValue('istationary_stock_in_item_list_cart');
		const u_requested_for = $scope.page.g_form.getValue('u_requested_for');
		const u_budget_holder = $scope.page.g_form.getDisplayValue('u_budget_holder');
		let reference = rawCart ? 'referenceoldvalue' : 'referencevalue';
		let checkmvrs = rawCart ? JSON.parse(rawCart) : [];
		c.priceCache = {};

		const parseAndRound = (value) =>
			Math.round(parseFloat(value?.toString().replace(/,/g, '') || 0) * 100) / 100;

		c.server
			.get({
				action: reference,
				filterData: c.filterResult,
				previewData: c.previewData,
				mrvsvalue: checkmvrs,
				budget_holder: u_budget_holder,
				requested_for: u_requested_for,
			})
			.then((r) => {
				if (!r.data) return;
				const finalObject = r.data.finalObject || [];
				const finalSubObject = r.data.finalSubObject || [];

				if (reference === 'referencevalue') {
					finalObject.forEach((el) => {
						const price = parseAndRound(el.unit_price);
						el.unit_price = price;
						el.oldPrice = price;
						el.uc_code = el.uc_code || '';
					});
					c.copyArr = JSON.parse(JSON.stringify(finalObject));
					c.data.finalObject = finalObject;
				} else {
					const previewMap = Object.fromEntries(finalSubObject.map((item) => [item.item_id, item]));

					checkmvrs.forEach((m) => {
						const previewItem = previewMap[m.u_description_sin];
						if (previewItem) {
							const mrvsPrice = parseAndRound(m.u_unit_price);
							if (mrvsPrice && mrvsPrice > 0) {
								previewItem.unit_price = mrvsPrice;
							} else {
								previewItem.unit_price = parseAndRound(previewItem.unit_price);
							}

							previewItem.uc_code = m.u_uc_code || previewItem.uc_code || '';
						}
					});

					finalSubObject.forEach((el) => {
						el.unit_price = parseAndRound(el.unit_price);
						el.uc_code = el.uc_code || '';
					});

					c.copyArr = JSON.parse(JSON.stringify(finalSubObject));
					c.data.finalSubObject = finalSubObject;
				}
			});
	};

	// ===== Generate Array =====
	c.generateArray = function () {
		c.finalData = [];
		c.previewData = [];
		c.newArr = [];
		c.olddataArr = [];

		// Parse oldData
		const oldDataStr = $scope.page.g_form.getValue('istationary_stock_in_item_list_cart');
		c.oldData = oldDataStr ? JSON.parse(oldDataStr) : [];

		// Helper: parse number
		const toNum = (v) => parseFloat((v ?? '0').toString().replace(/,/g, '')) || 0;

		// ---------- Step 1: Build newArr ----------
		c.copyArr.forEach((item) => {
			const qty = toNum(item.qty);
			// console.log('item.qty :', item.qty);
			if (qty > 0) {
				const unitPrice = toNum(item.unit_price);
				c.newArr.push({
					u_description_sin: item.item_id,
					u_unit_type: item.unit_type,
					u_unit_price: unitPrice.toFixed(2),
					stock_in_unit_cost: item.stock_in_unit_cost,
					oldPrice: item.oldPrice ? item.oldPrice.toFixed(2) : unitPrice.toFixed(2), // ✅ ใช้ oldPrice จาก referencevalue
					u_qty: qty.toString(),
					u_total_price: (unitPrice * qty).toFixed(2),
					u_uc_code: item.uc_code || '',
					description: item.description || '',
				});
			}
		});

		// ---------- Step 2: If oldData exists, sync with newArr ----------
		if (c.oldData && c.oldData.length > 0) {
			c.server.get({ action: 'checkmultirow', newArr: c.newArr, oldArr: c.oldData }).then((r) => {
				// Prepare data
				const oldArr = r.data.oldArr || [];
				const newArr = c.newArr || [];
				console.log(' oldArr :', JSON.stringify(oldArr, null, 2));
				console.log(' newArr :', JSON.stringify(newArr, null, 2));

				// Build index from newArr
				const newIndex = {};
				newArr.forEach((item) => {
					newIndex[item.u_description_sin] = item;
				});

				// Merge for MRV
				const finalMRVArr = oldArr.map((oldItem) => {
					const newItem = newIndex[oldItem.u_description_sin];

					// No change
					if (!newItem) {
						return {
							...oldItem,
							u_unit_price: formatCurrency(oldItem.u_unit_price),
							u_total_price: formatCurrency(oldItem.u_total_price),
						};
					}

					// With change
					const qty = parseNumber(newItem.u_qty);
					const unitPrice = parseNumber(newItem.u_unit_price);

					return {
						...oldItem,
						u_unit_type: newItem.u_unit_type,
						u_qty: qty.toString(),
						u_unit_price: formatCurrency(unitPrice), // Current Price
						stock_in_unit_cost: formatCurrency(oldItem.stock_in_unit_cost), // reference
						u_total_price: formatCurrency(qty * unitPrice),
					};
				});

				// Assign & update
				c.olddataArr = finalMRVArr;
				c.newDataArr = finalMRVArr;

				console.log(' finalMRVArr :', JSON.stringify(finalMRVArr, null, 2));

				c.updateUCCode(finalMRVArr);
				c.updatMRV(finalMRVArr);
			});
		} else {
			console.log('**** First time case  ****');

			// ---------- First time case ----------
			c.olddataArr = c.newArr;
			c.newDataArr = c.newArr;
			c.finalData = c.newArr;

			const itemsForUC = c.newArr.map((item) => {
				const copyItem = c.copyArr.find((ci) => ci.item_id === item.u_description_sin);
				return {
					u_description_sin: item.u_description_sin,
					description: copyItem ? copyItem.description : item.description || item.u_description_sin,
					u_unit_price: item.u_unit_price,
					stock_in_unit_cost: item.stock_in_unit_cost,
					oldPrice: item.oldPrice || copyItem?.oldPrice || '',
					uc_code: copyItem ? copyItem.uc_code || '' : item.u_uc_code || '',
				};
			});

			// console.log(' itemsForUC :', JSON.stringify(itemsForUC, null, 2));

			c.updateUCCode(itemsForUC);
			c.updatMRV(c.newDataArr);
		}
	};

	// ===== Update MRV =====
	c.updatMRV = function (finalData) {
		c.total = 0;

		for (var v = 0; v < finalData.length; v++) {
			let item = finalData[v];

			let qty = parseFloat(item.u_qty) || 0;
			let unitPrice = parseFloat(item.u_unit_price.toString().replace(/,/g, '')) || 0;

			if (qty > 0) {
				let totalPrice = qty * unitPrice;

				item.u_unit_price = formatCurrency(unitPrice);
				item.u_total_price = formatCurrency(totalPrice);

				c.total += totalPrice;
			} else {
				item.u_unit_price = formatCurrency(0);
				item.u_total_price = formatCurrency(0);
			}

			// console.log('finalData : ' + JSON.stringify(item));
		}

		c.total_display = c.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		$scope.page.g_form.setValue('u_grand_price_display', '฿' + c.total_display);
		$scope.page.g_form.setValue('u_grand_price', c.total);

		$('#myModal').modal('hide');
		$('#myPreviewModal').modal('hide');

		if (finalData.length !== 0) {
			$scope.page.g_form.setValue('istationary_stock_in_item_list_cart', JSON.stringify(finalData));
			c.data.finalObject = c.copyArr;
		} else {
			$scope.page.g_form.setValue('istationary_stock_in_item_list_cart', '');
		}
	};

	// ===== FETCH OBJECT VALUE FOR PREVIEW =====
	c.fetchObjectValue = function () {
		const rawMrvs = $scope.page.g_form.getValue('istationary_stock_in_item_list_cart');
		const mrvs = rawMrvs ? JSON.parse(rawMrvs) : [];

		// console.log('Fetching object value for preview:', mrvs);

		c.server.get({ action: 'referencepreviewvalue', arrdatavalue: mrvs }).then((response) => {
			const data = response.data;
			if (!data) return;

			const finalPreview = data.finalPreviewObject || [];
			const previewMap = Object.fromEntries(finalPreview.map((p) => [p.item_id, p]));
			// console.log('previewMap :', previewMap);

			mrvs.forEach((m) => {
				m.u_unit_price = parseNumber(m.u_unit_price || 0);
				m.u_total_price = parseNumber(m.u_total_price || 0);
				m.u_qty = parseNumber(m.u_qty || 0);
				m.stock_in_unit_cost = formatCurrency(m.stock_in_unit_cost);
				m.u_unit_price_display = m.u_unit_price;
				// m.u_total_price_display = formatCurrency(m.u_total_price);

				const previewItem = previewMap[m.u_description_sin];
				if (previewItem) {
					previewItem.unit_price = parseNumber(previewItem.unit_price || 0);

					if (m.u_unit_price !== previewItem.unit_price) {
						previewItem.unit_price = m.u_unit_price;
					}

					previewItem.uc_code = m.u_uc_code || previewItem.uc_code || '';
				}
				// console.log(' previewItem.unit_price :', previewItem.unit_price);
			});

			// Ensure number
			finalPreview.forEach((p) => {
				p.unit_price = parseNumber(p.unit_price || 0);
				p.total_price = parseNumber(p.total_price || 0);
				p.qty = parseNumber(p.qty || 0);
				p.stock_in_unit_cost = formatCurrency(p.stock_in_unit_cost);
			});

			c.data.finalPreviewObject = finalPreview;
			c.copyObjectArr = JSON.parse(JSON.stringify(finalPreview));
			c.previewOBJ = c.copyObjectArr;

			const totalNumber = parseNumber(data.grand_price);

			const totalDisplay = formatCurrency(data.grand_price);

			c.total_display = totalDisplay;
			$scope.page.g_form.setValue('u_grand_price', totalNumber);
			$scope.page.g_form.setValue('u_grand_price_display', '฿' + totalDisplay);
		});
	};

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

	// ===== UPDATE PRICE FROM INPUT =====
	$scope.updatePrice = function (item) {
		const formatNumber = (value) =>
			parseFloat(value)
				.toFixed(2)
				.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

		const unitPrice = parseNumber(item.unit_price);
		const quantity = parseNumber(item.qty);
		const previousTotal = parseNumber(item.totalPrice);
		const currentTotalDisplay = parseNumber(c.total_display);

		// Subtract the old total price of the item from the current total display
		let newTotalDisplay = currentTotalDisplay - previousTotal;

		// Calculate new item total price
		let newItemTotal = 0;
		if (quantity > 0 && unitPrice > 0) {
			newItemTotal = quantity * unitPrice;
			item.totalPrice = formatNumber(newItemTotal);
			newTotalDisplay += newItemTotal;
		} else {
			item.totalPrice = formatNumber(0);
		}

		// Update the display total
		c.total_display = formatNumber(newTotalDisplay);
	};

	// ===== UPDATE CART =====
	c.updateCart = function () {
		c.finalData = [];
		c.previewData = [];
		c.newArr = [];
		c.olddataArr = [];

		// Get old cart data
		var oldDataStr = $scope.page.g_form.getValue('istationary_stock_in_item_list_cart');
		c.oldData = JSON.parse(oldDataStr);

		// Build newArr from previewOBJ
		for (var y = 0; y < c.previewOBJ.length; y++) {
			var newData = {
				u_description_sin: c.previewOBJ[y].item_id,
				u_unit_type: c.previewOBJ[y].unit_type,
				u_unit_price: c.previewOBJ[y].unit_price,
				stock_in_unit_cost: c.previewOBJ[y].stock_in_unit_cost,
				u_qty: c.previewOBJ[y].qty.toString(),
				u_total_price: c.previewOBJ[y].totalPrice,
			};
			c.newArr.push(newData);
		}

		// Call server previewUpdate
		c.server
			.get({
				action: 'previewUpdate',
				newArr: c.newArr,
				oldArr: c.oldData,
			})
			.then(function (r) {
				const oldArr = (r.data.oldArr || []).map((oldItem) => {
					const match = c.previewOBJ.find((p) => p.item_id === oldItem.u_description_sin);

					// Convert string to number before comparing
					const oldPriceNum = parseNumber(oldItem.u_unit_price);
					const newPriceNum = match ? parseNumber(match.unit_price) : oldPriceNum;

					if (oldPriceNum !== newPriceNum) {
						return { ...oldItem, u_unit_price: formatCurrency(newPriceNum) };
					}

					return {
						...oldItem,
						u_unit_price: formatCurrency(oldItem.u_unit_price),
					};
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
