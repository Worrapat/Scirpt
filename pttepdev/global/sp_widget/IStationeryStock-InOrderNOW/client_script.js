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
		// console.log('items :', items);

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

				// --- แปลง previous list เป็น map เพื่อ lookup ง่าย ---
				const prevMap = Object.fromEntries(c.previousItemsWithDetails.map((i) => [i.item_id, i]));

				// --- map items ใหม่ ---
				const itemsWithDetails = items.map((item) => {
					const res = resultMap[item.u_description_sin] || {};
					const prev = prevMap[item.description];

					// --- normalize number ---
					const prevPrice = prev
						? parseFloat(String(prev.u_unit_price || '0').replace(/,/g, ''))
						: parseFloat(String(item.oldPrice || '0').replace(/,/g, ''));
					const newPrice = parseFloat(String(item.u_unit_price || '0').replace(/,/g, ''));

					const flagOldRecord = newPrice !== prevPrice;

					// --- ใช้ราคาเก่าจากรอบก่อนถ้ามี ---
					const oldDisplay = prev
						? prev.u_unit_price
						: formatCurrency(item.oldPrice || item.u_unit_price);

					return {
						item_id: item.description,
						description: res.name || item.u_description_sin,
						uc_code: res.uc_code || '',
						u_unit_price: formatCurrency(item.u_unit_price),
						oldPrice: oldDisplay,
						flagOldRecord,
					};
				});

				c.previousItemsWithDetails = itemsWithDetails;

				console.log('itemsWithDetails :', JSON.stringify(itemsWithDetails, null, 2));

				// --- render table ---
				let htmlValue =
					'<table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;">' +
					'<thead>' +
					'<tr style="background-color: #297bd8; color:#ffffff;">' +
					'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:35%;">Description</th>' +
					'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:15%;">Use Case</th>' +
					'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:25%;">User Edit Price</th>' +
					'<th style="border: 1px solid #ddd; padding: 8px; text-align:center; width:25%;">Stock-In Unit Cost (Excl. VAT)</th>' +
					'</tr></thead><tbody>';

				itemsWithDetails.forEach((item) => {
					let desc = item.description || '';
					// let uc = item.flagOldRecord ? '-' : item.uc_code;
					let uc = item.flagOldRecord ? item.uc_code : '-';
					// console.log('uc :', uc);
					// let newPrice = item.u_unit_price || '';
					let newPrice = item.flagOldRecord ? item.u_unit_price : '-';
					// let oldPrice = item.flagOldRecord ? '-' : item.oldPrice;
					let oldPrice = item.oldPrice;
					// console.log('oldPrice :', oldPrice);

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
						el.oldPrice = price; // ✅ เก็บ oldPrice ไว้ตอนแรกเลย
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
							// ✅ ถ้ามีค่าใน MRVS ให้ใช้ค่านั้นเป็นหลัก
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
			if (qty > 0) {
				const unitPrice = toNum(item.unit_price);
				c.newArr.push({
					u_description_sin: item.item_id,
					u_unit_type: item.unit_type,
					u_unit_price: unitPrice.toFixed(2),
					oldPrice: item.oldPrice ? item.oldPrice.toFixed(2) : unitPrice.toFixed(2), // ✅ ใช้ oldPrice จาก referencevalue
					u_qty: qty.toString(),
					u_total_price: (unitPrice * qty).toFixed(2),
					u_uc_code: item.uc_code || '',
					description: item.description || '',
				});
			}
		});
		// console.log('**** c.newArr =>: ' + JSON.stringify(c.newArr) + '****');

		// ---------- Step 2: If oldData exists, sync with newArr ----------
		if (c.oldData && c.oldData.length > 0) {
			c.server.get({ action: 'checkmultirow', newArr: c.newArr, oldArr: c.oldData }).then((r) => {
				const oldArr = (r.data.oldArr || []).map((item) => ({ ...item }));

				// Build index for quick lookup
				const newMap = Object.fromEntries(c.newArr.map((n) => [n.u_description_sin, n]));

				oldArr.forEach((item) => {
					const match = newMap[item.u_description_sin];
					if (!match) return;

					// ✅ เก็บราคาเก่าก่อนจะอัปเดต
					if (!item.oldPrice) {
						item.oldPrice = toNum(item.u_unit_price).toFixed(2);
						// console.log('Set oldPrice for item:', item.oldPrice);
					}

					// Update qty ถ้าเปลี่ยน
					const newQty = toNum(match.u_qty);
					if (newQty !== toNum(item.u_qty)) item.u_qty = newQty;

					// Update unit price ถ้าเปลี่ยน
					const newPrice = toNum(match.u_unit_price);
					if (newPrice !== toNum(item.u_unit_price)) {
						item.u_unit_price = newPrice.toFixed(2);
						// ❌ ไม่แตะ oldPrice เพื่อคงค่าเดิมไว้
					}

					// Recalculate total price
					item.u_total_price = (toNum(item.u_unit_price) * toNum(item.u_qty)).toFixed(2);

					// Sync UC code
					if (match.u_uc_code && match.u_uc_code !== item.u_uc_code) {
						item.u_uc_code = match.u_uc_code;
					}

					// Sync description
					if (!item.description) {
						item.description = match.description || '';
					}
				});

				// Add any new rows from newArr not in oldArr
				c.newArr.forEach((n) => {
					if (!oldArr.find((i) => i.u_description_sin === n.u_description_sin)) {
						oldArr.push({ ...n });
					}
				});

				// Prepare items for UC code table
				const itemsForUC = oldArr.map((item) => {
					// console.log('**** oldArr =>: ' + JSON.stringify(item) + '****');
					const copyItem = c.copyArr.find((ci) => ci.item_id === item.u_description_sin);
					return {
						u_description_sin: item.u_description_sin,
						description: item.description,
						u_unit_price: item.u_unit_price,
						oldPrice: item.oldPrice || item.u_unit_price, // ✅ ใช้ราคาเดิมถ้ามี
						u_uc_code: item.u_uc_code || '',
					};
				});

				c.updateUCCode(itemsForUC);

				// Update final data & MRV
				c.olddataArr = oldArr;
				c.newDataArr = oldArr;
				c.finalData = oldArr;
				c.updatMRV(c.newDataArr);
			});
		} else {
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

					// ✅ ใช้ oldPrice ที่ backend ส่งมาเท่านั้น
					oldPrice: item.oldPrice || copyItem?.oldPrice || '',

					uc_code: copyItem ? copyItem.uc_code || '' : item.u_uc_code || '',
				};
			});

			// console.log('✅ itemsForUC (from backend oldPrice):', JSON.stringify(itemsForUC, null, 2));

			c.updateUCCode(itemsForUC);
			c.updatMRV(c.newDataArr);
		}
	};

	// ===== Update MRV =====
	c.updatMRV = function (finalData) {
		c.total = 0;

		for (var v = 0; v < finalData.length; v++) {
			let item = finalData[v];

			// แปลง qty และ unit_price เป็นตัวเลข
			let qty = parseFloat(item.u_qty) || 0;
			let unitPrice = parseFloat(item.u_unit_price.toString().replace(/,/g, '')) || 0;

			if (qty > 0) {
				// คำนวณ total ใหม่
				let totalPrice = qty * unitPrice;

				// เก็บราคาที่ format แล้ว
				item.u_unit_price = formatCurrency(unitPrice);
				item.u_total_price = formatCurrency(totalPrice);

				// รวม total ทั้งหมด
				c.total += totalPrice;
			} else {
				// กรณี qty = 0, กำหนดราคาเป็น 0
				item.u_unit_price = formatCurrency(0);
				item.u_total_price = formatCurrency(0);
			}

			// console.log('finalData : ' + JSON.stringify(item));
		}

		// แสดง total รวมแบบมี comma และแสดงใน form
		c.total_display = c.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		$scope.page.g_form.setValue('u_grand_price_display', '฿' + c.total_display);
		$scope.page.g_form.setValue('u_grand_price', c.total);

		// ซ่อน modal
		$('#myModal').modal('hide');
		$('#myPreviewModal').modal('hide');

		// อัปเดต cart field
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

				m.u_unit_price_display = m.u_unit_price;
				m.u_total_price_display = formatCurrency(m.u_total_price);

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
			});

			c.data.finalPreviewObject = finalPreview;
			c.copyObjectArr = JSON.parse(JSON.stringify(finalPreview));
			c.previewOBJ = c.copyObjectArr;

			const totalNumber = parseNumber(data.grand_price);
			// console.log('totalNumber :', totalNumber);

			const totalDisplay = formatCurrency(data.grand_price);
			// console.log('totalDisplay :', totalDisplay);

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
		// console.log('Updating price for item:', item);
		const parseNumber = (value) => parseFloat((value || '0').toString().replace(/,/g, '')) || 0;
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
