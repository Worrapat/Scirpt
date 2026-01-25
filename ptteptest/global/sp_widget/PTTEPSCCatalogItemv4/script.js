// populate the 'data' variable with catalog item, variables, and variable view
(function() {
	var localInput = input; //to safeguard pullution of "input" via BR or other scripts

	var draftID = $sp.getParameter("draft_id");
	data.draft_id = draftID;
	
	var embeddedWidgetOptions = ['auto_redirect', 'requested_for_id', 'requested_for_display'];
	if (localInput && localInput.action == "from_attachment")
		return;

	if (localInput && localInput.action == 'init_item') {
		data._generatedItemGUID = gs.generateGUID();
		return;
	}
	else if (localInput && localInput.action === "order_one_step") {

	}
	else if (localInput && localInput.action === "order_item") {
		//Minimum set of widget options supported for Embedded widget
		embeddedWidgetOptions.forEach(function (embeddedWidgetOption) {
			if (typeof localInput[embeddedWidgetOption] != 'undefined')
				options[embeddedWidgetOption] = localInput[embeddedWidgetOption];
		});
		data.orderItemModal = $sp.getWidget('widget-modal', {
			embeddedWidgetId: 'sc-checkout', 
			embeddedWidgetOptions: {
				cart: {name: localInput.cart}, 
				action: 'order_now', 
				item: localInput.itemDetails, 
																																requested_for: {id:options.requested_for_id, displayValue:options.requested_for_display},
																																auto_redirect: options.auto_redirect,
																																parentParams: localInput.workspaceParams
			}, 
			backdrop: 'static', 
			keyboard: false, 
			size: 'md'
		});
		return;
	} else if (localInput && localInput.action == "order_wishlist_item") {
		//Minimum set of widget options supported for Embedded widget
		embeddedWidgetOptions.forEach(function (embeddedWidgetOption) {
			if (typeof localInput[embeddedWidgetOption] != 'undefined')
				options[embeddedWidgetOption] = localInput[embeddedWidgetOption];
		});
		data.orderItemModal = $sp.getWidget('widget-modal', {
			embeddedWidgetId: 'sc-checkout', 
			embeddedWidgetOptions: {
				cart: {name: localInput.cart}, 
				action: 'order_now_wishlisted_item', 
				item: localInput.itemDetails, 
																																	requested_for: {id:options.requested_for_id, displayValue:options.requested_for_display},
																																	auto_redirect: options.auto_redirect,
																																	parentParams: localInput.workspaceParams
			}, 
			backdrop: 'static', 
			keyboard: false, 
			size: 'md'
		});
		return;
	} else if (localInput && localInput.action === 'log_request') {
		 $sp.logStat('Cat Item Request', localInput.itemDetails.sys_class_name, localInput.itemDetails.sys_id, localInput.itemDetails.name, $sp.getPortalRecord().getUniqueValue());
		 return;
	}
	// portal can specify a catalog and catalog category home page
	var catalogID = $sp.getParameter("catalog_id") ? $sp.getParameter("catalog_id") + "" : "-1";
	data.sc_catalog_page = $sp.getDisplayValue("sc_catalog_page") || "sc_home";
	data.sc_category_page = $sp.getDisplayValue("sc_category_page") || "sc_category";
	var edit_parm = $sp.getParameter('edit');
	data.is_cart_item = edit_parm == 'cart';
	data.is_wishlist_item = edit_parm == 'wishlist';
	data.show_wishlist_msg = false;
	data.recordFound = true;
	options.show_add_cart_button = (options.show_add_cart_button == "true");
	var clGenerator = new GlideChoiceList();
	var choiceListQuantity = clGenerator.getChoiceList("sc_cart_item", "quantity");
	var choicelistQuantityData = [];
	for (var i = 0; i < choiceListQuantity.size(); i++) {
		var choice = choiceListQuantity.get(i);
		if (!isNaN(choice.getValue()))
			choicelistQuantityData.push({value : parseInt(choice.getValue()), label : choice.getLabel()});
	}
	data.choiceListQuantity = choicelistQuantityData;
	data.quantity = choicelistQuantityData[0].value;
	if (options.page) {
		var pageGR = new GlideRecord("sp_page");
		options.page = (pageGR.get(options.page)) ? pageGR.getValue("id") : null;
	}
	if (options.table) {
		var tableGR = new GlideRecord("sys_db_object");
		options.table = (tableGR.get(options.table)) ? tableGR.getValue("name") : null;
	}
	options.url = options.url || "id={page}&is_new_order=true&table={table}&sys_id={sys_id}";
	
	data.showPrices = $sp.showCatalogPrices();
	var m = data.msgs = {};
	m.submitMsg = gs.getMessage("Submit");
	m.requestMsg = gs.getMessage("Request");
	m.orderNowMsg = gs.getMessage("Order Now");
	m.submittedMsg = gs.getMessage("Submitted");
	m.submittingMsg = gs.getMessage("Submitting");
	m.createdMsg = gs.getMessage("Created");
	m.trackMsg = gs.getMessage("track using 'Requests' in the header or");
	m.clickMsg = gs.getMessage("click here to view");
	m.dialogTitle = gs.getMessage("Delete Attachment");
	m.dialogMessage = gs.getMessage("Are you sure?");
	m.dialogOK = gs.getMessage("OK");
	m.dialogCancel = gs.getMessage("Cancel");
	m.addToCart = gs.getMessage("Add to Cart");
	m.updateCart = gs.getMessage("Update Cart");
	
	m.renameSuccessMsg = gs.getMessage("Attachment renamed successfully");
	m.deleteSuccessMsg = gs.getMessage("Attachment deleted successfully");
	m.wishlistMsg = gs.getMessage('Wish List');
	m.cartMsg = gs.getMessage('Cart');
	m.itemWishlistMsg = gs.getMessage('This item is already in your Wish List. If you attempt to add this item to your Wish List it will overwrite the existing item.');
	m.invalidRecordMsg = gs.getMessage('You are either not authorized or record is not valid.');
	m.wishlistUpdateMsg = gs.getMessage('Your Wish List has been updated.');
	m.wishlistAddMsg = gs.getMessage('Your item has been added to your Wish List.');
	m.cartAddMsg = gs.getMessage('Your item has been added to your Cart. To make changes to the items in your cart, click ');
	m.viewWishListMsg = gs.getMessage('View Wish List');
	m.viewCartMsg = gs.getMessage('View Cart');
	m.delete_attachment = gs.getMessage("Delete Attachment?");
	m.regexError = gs.getMessage("Item with invalid variable can't be saved");
	m.requestSubmitted = gs.getMessage("Thank you, your request has been submitted.");
	data.maxAttachmentSize = parseInt(gs.getProperty("com.glide.attachment.max_size", 1024));
	if (isNaN(data.maxAttachmentSize))
		data.maxAttachmentSize = 24;
	m.largeAttachmentMsg = gs.getMessage("Attached files must be smaller than {0} - please try again", "" + data.maxAttachmentSize + "MB");
	
	m.notForMobileMsg = gs.getMessage('Not viewable in mobile');
	
	// var cartName = data.is_cart_item ? 'DEFAULT' : 'saved_items';
	var cartName = 'draft_0374f689db63951c1814586dd39619c2';
	var cart = new sn_sc.CartJS(cartName);
	
	if (edit_parm) {
		var cart_item_id = $sp.getParameter("sys_id");
		var gr = new GlideRecord("sc_cart_item");
		if (!gr.get(cart_item_id) || /* gr.cart != cart.getCartID() || */
				(!new sn_sc.CatItem(gr.getValue('cat_item')).canView())) {
			data.recordFound = false;
			return;
		}
		
		data.showWishlist = data.is_wishlist_item;
		var catItemData = {};
		catItemData.sys_id = gr.getValue('cat_item');
		catItemData.cart_item_id = gr.getUniqueValue();
		catItemData.table = "sc_cart_item";
		catItemData.is_ordering = true;
		data.sc_cat_item = $sp.getCatalogItem(catItemData);
		data.sc_cat_item.isCartItem = true;
		data.sc_cat_item.cart_guide = gr.getValue('order_guide');
		data.hideDeliveryTime = data.sc_cat_item.no_delivery_time;
		if (!data.hideDeliveryTime)
		data.hideDeliveryTime = (options.hide_delivery_time == "true" || data.sc_cat_item.sys_class_name == 'sc_cat_item_producer' || data.sc_cat_item.sys_class_name == 'sc_cat_item_guide' || data.sc_cat_item.sys_class_name == 'std_change_record_producer');

		var values = getValues(cart_item_id);
		for(var f in data.sc_cat_item._fields) {
			// Put the values into the cat item fields
			var field = data.sc_cat_item._fields[f];
			if (typeof values[f] != "undefined" && typeof values[f].value != "undefined") {
				if (values[f].type == 9 || values[f].type == 10)
					field.value = values[f].displayValue;
				else if (values[f].type == 25)
					field.value = values[f].decrypted_value;
				else
					field.value = values[f].value;
				field.displayValue = values[f].displayValue;
				field.display_value_list = values[f].display_value_list;
			}
			updatePriceOnField(field);
				
		}
		data._generatedItemGUID = cart_item_id;
		data.quantity = '' + gr.quantity;
	} else {
		if (localInput)
			data.sys_id = localInput.sys_id;
		else if (options.sys_id)
			data.sys_id = options.sys_id;
		else
			data.sys_id = $sp.getParameter("sys_id") || $sp.getParameter('sl_sys_id');
	
		if (!data.sys_id) {
			data.recordFound = false;
			return;
		}
	
		data._generatedItemGUID = gs.generateGUID();
		var validatedItem = new sn_sc.CatItem('' + data.sys_id);
		if (!validatedItem.canView() || !validatedItem.isVisibleServicePortal()) {
			data.recordFound = false;
			return;
		}
	
		data.sc_cat_item = $sp.getCatalogItem({
			sys_id: data.sys_id + '',
			is_ordering: true
		});
		
		var catRec = new GlideRecord('sc_cat_item');
		if (catRec.get(data.sys_id)) {
			data.sc_cat_item.custom_url = catRec.getValue('u_custom_redirect_link');
		}
		
		if (options.native_mobile == 'true') {
				if (data.sc_cat_item.sys_class_name == 'std_change_record_producer' ||
						data.sc_cat_item.sys_class_name == 'sc_cat_item_content' ||
					  data.sc_cat_item.sys_class_name == 'sc_cat_item_producer_service') {
					data.not_for_mobile = true;
					data.sc_cat_item = {};
					return;
				}
		}
		
		data.hideDeliveryTime = data.sc_cat_item.no_delivery_time;
		if (!data.hideDeliveryTime) 
		data.hideDeliveryTime = (options.hide_delivery_time == "true" || data.sc_cat_item.sys_class_name == 'sc_cat_item_producer' || data.sc_cat_item.sys_class_name == 'sc_cat_item_guide' || data.sc_cat_item.sys_class_name == 'std_change_record_producer');

		if (data.sc_cat_item.category) {
			var categoryJS;
			var categoryID = validatedItem.getFirstAccessibleCategoryForSearch((catalogID && catalogID != "-1") ? catalogID : $sp.getCatalogs().value + "");
			if (GlideStringUtil.isEligibleSysID($sp.getParameter("sysparm_category"))) {
				categoryJS = new sn_sc.CatCategory($sp.getParameter("sysparm_category") + "");
				categoryID = $sp.getParameter("sysparm_category") + "";
			}
			else if(categoryID) {
				categoryJS = new sn_sc.CatCategory(categoryID);
			}
			if (categoryJS && GlideStringUtil.isEligibleSysID(categoryJS.getID())) {
				if (categoryJS.getCatalog()) {
					catalogID = categoryJS.getCatalog();
					data.catalog_id = catalogID;
					var catalogObj = new sn_sc.Catalog(catalogID);
					data.sc_catalog = catalogObj.getTitle();
					data.showWishlist = new sn_sc.Catalog('' + catalogID).isWishlistEnabled();
				}
				data.category = {
					name: categoryJS.getTitle(),
					url: '?id=' + data.sc_category_page + '&sys_id=' + categoryID
				}
				data.categories = [];
				data.categories.push({
					label: categoryJS.getTitle(),
					url: '?id=' + data.sc_category_page + '&sys_id=' + categoryID
				});
				while(categoryJS.getParent()) {
					var parentId =  categoryJS.getParent();
					categoryJS = new sn_sc.CatCategory(parentId);
					var category = {
						label: categoryJS.getTitle(),
						url: '?id=' + data.sc_category_page + '&sys_id=' + parentId
					};
					data.categories.unshift(category);
				}
				if ((($sp.getCatalogs().value + "").split(",")).length > 1) {
					data.all_catalog_msg = gs.getMessage("All Catalogs");
				}
			}
		}

		var gr = new GlideRecord('sc_cart_item');
		gr.addQuery('cart', cart.getCartID());
		gr.addQuery('cat_item', data.sys_id);
		gr.query();
		if (gr.next() && !options.isServiceWorkspace)
			data.show_wishlist_msg = true;
	}

	data.sys_properties = {
		twostep: gs.getProperty("glide.sc.sp.twostep", "true") == 'true',
		mobileNativeColor: gs.getProperty("glide.sc.mobile.primary_color", "#1f8476"),
		cartEnabled: gs.getProperty("glide.sc.cart.enabled", "false") == "true"
	};
	
	var className = data.sc_cat_item.sys_class_name;
	data.can_create_cart_item = canCreateCartItem(className) && !gs.hasRole('snc_read_only');
	
	function canCreateCartItem(className) {
		var cart_item = true;
		var list_of_class_names = gs.getProperty('glide.sc.item.not_normal_cart_item', '').split(',');
		for (var i = 0; i < list_of_class_names.length; i++) {
				if (className != 'sc_cat_item_producer' && className != 'std_change_record_producer' && className != 'sc_cat_item_producer_service' && className == 'sc_cat_item_content' && list_of_class_names[i] == className)
					cart_item = false;
		}
		return cart_item;
	}

	var athTblName = 'sc_cart_item';
	if (!new global.CatalogItemTypeProcessor().canCreateNormalCartItem(className)) {
		if (className == 'sc_cat_item_producer' || className == 'std_change_record_producer') {
				var gr = new GlideRecord(className);
				gr.get(data.sc_cat_item.sys_id);
				if (gr.isValidRecord())
					athTblName = gr.getValue('table_name');
		}
	}
	
	data._attachmentTable = athTblName;
	data.stdChg = {};
	if (className === 'std_change_record_producer') {
		//Populate scope with the porperty for two step
		data.stdChg.twoStep = false;
		var twoStepProp = new global.StdChangeUtils().getValue('two_step') + '';
		if (twoStepProp)
			data.stdChg.twoStep = twoStepProp === '1';
		var stdChgProducerGr = new GlideRecord('std_change_record_producer');
		stdChgProducerGr.get(data.sc_cat_item.sys_id);
		if (stdChgProducerGr.isValidRecord())
			data.stdChg.currentVersion = stdChgProducerGr.getValue('current_version');
	}

	if (data.sc_cat_item.sys_class_name !== 'sc_cat_item_content')
		$sp.logStat('Cat Item View', data.sc_cat_item.sys_class_name, data.sc_cat_item.sys_id, data.sc_cat_item.name, $sp.getPortalRecord().getUniqueValue());
	


	
	function getValues(sys_id) {
		var qs = new sn_sc.VariablePoolQuestionSetJS();
		qs.setCartID(sys_id);
		qs.load();
		var values = {};
		var questions = qs.getFlatQuestions();
		for (var i = 0; i < questions.length; i++) {
			var qKey = questions[i].name;
			if (typeof qKey == 'undefined' || qKey == '')
				qKey = "IO:" + questions[i].sys_id;
			values[qKey] = questions[i];
		}
		return values;
	}
	function setPrice(field, p, rp) {
		if (p != undefined)
			field.price = p;
		if (rp != undefined)
			field.recurring_price = rp;
	}
	function updatePriceForReferenceTable(field) {
		var tableName = field.refTable + '';
		if (tableName != undefined && tableName != null && tableName != '') {
			var gr = new GlideRecord(tableName);
			if (gr.isValid()) {
				if (gr.get(field.value) && gr.isValidRecord()) {
					updatePrice(gr, field);
					updateRecurringPrice(gr, field);
				}
			}
		}
	}
	function updatePriceForListCollector(field) {
		var tableName = field.refTable + '';
		if (tableName != undefined && tableName != null && tableName != '') {
			var gr = new GlideRecord(tableName);
			if (gr.isValid()) {
				var values = field.value.split(',');
				gr.addQuery('sys_id', values);
				gr.query();
				var p = 0.0;
				var rp = 0.0;
				var price_value_list = [];
				while(gr.next()) {
						var price_field = {};
						updatePrice(gr, price_field);
						updateRecurringPrice(gr, price_field);
						if (price_field.price)
							p += Number(price_field.price);
						else
							price_field.price = 0.0;
						if (price_field.recurring_price)
							rp += Number(price_field.recurring_price);
						else
							price_field.recurring_price = 0.0;
						price_value_list.push(price_field);
				}
				field.price = p;
				field.recurring_price = rp;
				field.price_value_list = price_value_list;
			}
		}
	}
	function updatePrice(gr, field) {
		if (gr.isValidField('price'))
			field.price = gr.getValue('price');
		else if (gr.isValidField('u_price'))
			field.price = gr.getValue('u_price');
	}
	function updateRecurringPrice(gr, field) {
		if (gr.isValidField('recurring_price'))
			field.recurring_price = gr.getValue('recurring_price');
		else if (gr.isValidField('u_recurring_price'))
			field.recurring_price = gr.getValue('u_recurring_price');
	}
	function updatePriceOnField(field) {
		if (field.type == 'boolean' || field.type == 'boolean_confirm') {
			if (field.value == 'true' || field.value == true)
				setPrice(field, field._pricing.price_if_checked, field._pricing.recurring_price_if_checked);
			else
				setPrice(field, 0, 0);
		} else if (field.choices) {
			field.choices.forEach( function(choice) {
				if (choice.value +'' == field.value + '')
					 setPrice(field, choice.price, choice.recurring_price);
			});
		} else if (field._pricing && field._pricing.pricing_implications === true) {
			if (field.type == 'reference') 
				updatePriceForReferenceTable(field);
			else if (field.type == 'glide_list')
				updatePriceForListCollector(field);
		}
	}
})()