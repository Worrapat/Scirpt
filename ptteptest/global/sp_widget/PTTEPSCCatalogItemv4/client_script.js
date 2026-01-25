function ($scope, $http, spScUtil, spUtil, nowAttachmentHandler, $rootScope, $sanitize, $window, $sce, i18n, $timeout, $log, spAriaUtil, $document, spModal, $q, spAtf, $location, spAriaFocusManager, spSCNavStateManager, cabrillo) {
	var c = this;
	
	//console.log('-------------' + JSON.stringify(c.data.sc_cat_item));
	
	//alert('customer link: ' + JSON.stringify(c.data.sc_cat_item));
	
	if (c.data.sc_cat_item && $scope.data.hasOwnProperty("_generatedItemGUID")) {
		c.data.sc_cat_item._attachmentGUID = $scope.data._generatedItemGUID;
	}

	$scope.getFocus = function(field) {
		var focusVar = (field.type == "reference") ? "sp_formfield_reference_" : "sp_formfield_";
		focusVar += (field.name.startsWith("IO:") ? field._children[0]:field.name);
		document.getElementById(focusVar).focus();
	}

	c.quantity = c.data.quantity ? c.data.quantity + "" : "1";
	c.mandatory = [];
	$scope.stickyHeaderTop = '0px';
	c.widget._debugContextMenu = [
		[ i18n.getMessage("Open") + " sc_cat_item", function() {
			var item = c.data.sc_cat_item;
			$window.open("/sp_config?id=form&table=" + item.table + "&sys_id=" + item.sys_id); }]
	];
	
 spUtil.recordWatch($scope, "sys_attachment", "table_sys_id=" + $scope.data._generatedItemGUID, function(response, data) {
		$scope.attachmentHandler.getAttachmentList();
			if (response.data) {
				var options = {};
				options.operation = response.data.operation;
				options.filename = response.data.display_value;
				options.state = (response.data.record && response.data.record.state) ? response.data.record.state.value : "";
			if (options.operation === 'update' && options.state === 'not_available')
				$rootScope.$broadcast("$$uiNotification", {type: 'error', message: i18n.getMessage('Upload file scan failed').withValues([options.filename])});
		}
	});
	
	$rootScope.$on('spModel.gForm.rendered', function() {
		$timeout(function() {
							spAtf.init().then(function(atf) {
								$scope._atf = atf;
								atf.expose('catalog_util', catalogUtil);
							});
		}, 10);
	});
	
	//	ATF helper object
	var catalogUtil = {
		updateGform: function() {
			$scope._atf.expose('g_form', spAtf.augmentForm(g_form));
		},
		
		addRow: function(fieldId, timeoutInMS) {
			if (timeoutInMS <= 0)
				timeoutInMS = 1000;
			var deferred = $q.defer();
			$scope.$broadcast("$sp.sc_multi_row.create_row", fieldId, $scope.data.sc_cat_item.sys_id);
			$scope.$on('spModel.gForm.initialized', function(e, gFormInstance) {
				if (gFormInstance.getSysId() == fieldId)
					deferred.resolve();
			});
			$timeout(function() {
				deferred.reject();
			}, timeoutInMS);
			return deferred.promise;
		},
		
		submit: function (timeout) {
			var deferred = $q.defer();
			$scope.triggerOnSubmit(timeout);
			var cleanup = $scope.$on('$sp.service_catalog.form_submit_failed', function() {
					cleanup();
					deferred.reject("Can't submit form");
			});
			if (g_form) {
					g_form.$private.events.on('submitted', function() {
			var cleanUp = $scope.$on('$sp.sc_cat_item.submitted', function(o, result) {
						$timeout(function() {
							cleanUp();
							deferred.resolve(result);
						}, 10);
					});
				});
			}
			else
				deferred.reject('g_form not initialized');
			
			return deferred.promise;
		},
		
		addToCart: function(timeout) {
			var defer = $q.defer();
			$scope.triggerAddToCart(timeout);
			var cleanup = $scope.$on('$sp.service_catalog.form_submit_failed', function() {
					cleanup();
					defer.reject("Can't submit form");
			});
			if (g_form) {
				g_form.$private.events.on('submitted', function() {
						var cleanup = $scope.$on('$sp.sc_cat_item.add_to_cart', function(o, result) {
						$timeout(function() {
							cleanup();
							defer.resolve(result);
						}, 10);
					});
				});
			}
			else
				defer.reject('g_form not initialized');			
			return defer.promise;
		},
		
		submitCatItem: function(timeout) {
			var defer = $q.defer();
			$scope.triggerOnSubmit(timeout);
			var cleanup = $scope.$on('$sp.service_catalog.form_submit_failed', function() {
					cleanup();
					defer.reject("Can't submit form");
			});
			if (g_form) {
				g_form.$private.events.on('submitted', function() {
				if ($scope.data.sys_properties.twostep && $scope.data.sc_cat_item.request_method != "submit") {
					defer.resolve();
				}
				else{
					var cleanUp = $scope.$on('$sp.sc_cat_item.submitted', function(o, result) {
						$timeout(function() {
							cleanUp();
							result.single_step = true;
							defer.resolve(result);
						}, 10);
					});
				}
				});
			}
			else
				defer.reject('g_form not initialized');
			return defer.promise;
		},
		
		setQuantity: function(quantity) {
			if ($scope.c.data.sc_cat_item.sys_class_name !== "sc_cat_item_producer" && $scope.c.data.sc_cat_item.sys_class_name !== "std_change_record_producer") {
				$scope.c.quantity = quantity;
				$scope.$apply();
			}
		},
		
		getQuantity: function() {
			return $scope.c.quantity;
		},
		
		getPrice: function() {
			var obj = {};
			obj.price = $scope.data.sc_cat_item.price_display;
			obj.recurring_price = $scope.data.sc_cat_item.recurring_price_display;
			obj.recurring_frequency = $scope.data.sc_cat_item.recurring_frequency;
			return obj;
		}
	}
	
	if (cabrillo.isNative())
		cabrillo.viewLayout.setTitle('');
	
	c.showAddCartBtn = function() {
		return !$scope.submitted &&
		  c.options.show_add_cart_button &&
			c.data.sc_cat_item.sys_class_name !== "sc_cat_item_producer" &&
			c.data.sc_cat_item.sys_class_name !== "std_change_record_producer" &&
			!c.data.sc_cat_item.no_cart && !c.data.is_cart_item;
	}
	
	c.showQuantitySelector = function() {
		// Following if block is code for hard-setting an aria-label on the quantity select box
		// for displaying the label "quantity"
		if($('#catItemQuantity') != null) {
			var quantityElement = $('#catItemQuantity');
			quantityElement.prev().find(".select2-offscreen").removeAttr("aria-labelledby").attr("aria-label","Quantity " + c.quantity);
		}
		
		return c.data.sc_cat_item.sys_class_name !== "sc_cat_item_producer" &&
			c.data.sc_cat_item.sys_class_name !== "std_change_record_producer" &&
			!c.data.sc_cat_item.no_quantity &&
			(c.data.sc_cat_item.cart_guide === undefined || c.data.sc_cat_item.cart_guide === null)&&
			(!c.data.sc_cat_item.no_order_now || !c.data.sc_cat_item.no_cart);
	}
	c.showOrderNowButton = function() {
		return !$scope.data.is_cart_item && (c.data.sc_cat_item.use_sc_layout || !c.data.sc_cat_item.no_order_now);
	}
	c.showAddToWishlist = function () {
		return !$scope.submitted  && 
			(c.data.showWishlist && 
			 !c.data.sc_cat_item.no_wishlist && 
			 !c.data.is_cart_item && 
			 c.options.show_add_to_wishlist_button === 'true');
	}
	c.allowOrder = function() {
		if (c.data.sc_cat_item.use_sc_layout)
			return true;
		if (c.data.sc_cat_item.no_order)
			return false;
		if (c.data.sc_cat_item.no_order_now && c.data.sc_cat_item.no_cart)
			return false;
		return true;
	}
	
	c.hideCartMsg = function () {
		$scope.data.showMsg = false;
	}

	c.showAttachments = function() {
		return !$scope.submitted &&
			!c.data.sc_cat_item.no_attachments &&
			c.data.sc_cat_item.sys_class_name !== "std_change_record_producer";
	};
	$scope.$on('dialog.upload_too_large.show', function(e){
		$log.error($scope.m.largeAttachmentMsg);
		spUtil.addErrorMessage($scope.m.largeAttachmentMsg);
	});
	$scope.m = $scope.data.msgs;
	var ah = $scope.attachmentHandler = new nowAttachmentHandler(setAttachments, appendError);
	function appendError(error) {
		spUtil.addErrorMessage(error.msg + error.fileName);
	}
	ah.setParams($scope.data._attachmentTable, $scope.data._generatedItemGUID, 1024 * 1024 * $scope.data.maxAttachmentSize);
	function setAttachments(attachments, action) {
		$scope.attachments = attachments;
		if (action === "added") {
			$scope.setFocusToAttachment();
			if ($scope.attachments.length > 0)
			 $scope.data.sc_cat_item.attachment_submitted = true;
		}
		if (action === "renamed")
			spAriaUtil.sendLiveMessage($scope.m.renameSuccessMsg);
		if (action === "deleted") {
			spAriaUtil.sendLiveMessage($scope.m.deleteSuccessMsg);
			if ($scope.attachments.length == 0)
				$scope.data.sc_cat_item.attachment_submitted = false;
		}
		spUtil.get($scope,{action:"from_attachment"});
	}
	$scope.attachmentHandler.getAttachmentList();
	$scope.confirmDeleteAttachment = function(attachment) {
		if (cabrillo.isNative()) {
			if (confirm($scope.data.msgs.delete_attachment)) {
				$scope.attachmentHandler.deleteAttachment(attachment);
				$scope.setFocusToAttachmentButton();
			}			
		} else {
			spModal.confirm($scope.data.msgs.delete_attachment).then(function() {
				$scope.attachmentHandler.deleteAttachment(attachment);
				$scope.setFocusToAttachmentButton();
			});
		}
	}
	$scope.dismissWishListMessage = function() {
		$scope.is_update_wishlist = false;
	}
	
  if ($scope.data.sc_cat_item) {
		$scope.data.sc_cat_item.description = $sce.trustAsHtml($scope.data.sc_cat_item.description);
		if (angular.equals($scope.data.sc_cat_item._fields, {}))
				$scope.data.no_fields = true;
		if ($scope.data.sc_cat_item.sys_class_name !== "sc_cat_item_producer" && 
				$scope.data.sc_cat_item.sys_class_name !== "std_change_record_producer") {	
			if ($scope.data.sc_cat_item.request_method == "request")
				$scope.submitButtonMsg = $scope.m.requestMsg;
			else if ($scope.data.sc_cat_item.request_method == "submit")
				$scope.submitButtonMsg = $scope.m.submitMsg;
		else
				$scope.submitButtonMsg = $scope.m.orderNowMsg;
		} else
			$scope.submitButtonMsg = $scope.m.submitMsg;
		
		// Breadcrumbs
		if (!$scope.data.categories)
			$scope.data.categories = [];
		$scope.data.categories.forEach(function(category, index, categories) {
			categories[index].url = category.url + '&catalog_id=' + $scope.data.catalog_id;
		});
		if ($scope.data.is_wishlist_item) {
			$scope.data.categories.unshift({label: $scope.m.wishlistMsg, url: '?id=sc_wishlist'});
			$scope.data.categories.push({label: $scope.data.sc_cat_item.name, url: '#'});
		}
		else if ($scope.data.is_cart_item) {
			$scope.data.categories.unshift({label: $scope.m.cartMsg, url: '?id=sc_cart'});
			$scope.data.categories.push({label: $scope.data.sc_cat_item.name, url: '#'});
		}
		else if ($scope.data.categories.length > 0) {
			$scope.data.categories.unshift({label: $scope.data.sc_catalog || $scope.page.title, url: '?id=' + $scope.data.sc_category_page + "&catalog_id=" + $scope.data.catalog_id});
			$scope.data.categories.push({label: $scope.data.sc_cat_item.name, url: '#'});
			if ($scope.data.all_catalog_msg) {
				$scope.data.categories.unshift({label: $scope.data.all_catalog_msg, url: '?id=' + $scope.data.sc_category_page + "&catalog_id=-1"});
			}
		}
		else {
			$scope.data.categories.push({label: $scope.data.sc_cat_item.name, url: '#'});
		}
		
		$timeout(function() {
			$scope.$emit('sp.update.breadcrumbs', $scope.data.categories);
		});
		spUtil.setSearchPage('sc');
	} else {
		var notFoundBC = [{label: $scope.page.title, url: '?id=' + $scope.data.sc_catalog_page}];
		$timeout(function() {
			$scope.$emit('sp.update.breadcrumbs', notFoundBC);
		});
		spUtil.setSearchPage('sc');
	}
	c.getItemId = function () {
		return $scope.data.sc_cat_item ? $scope.data.sc_cat_item.sys_id : -1;
	};
	
	function showNativeMobileButtons(){
		if ($scope.options.native_mobile == 'true' && cabrillo.isNative()) {
			cabrillo.viewLayout.setTitle($scope.data.sc_cat_item.name);			
			if ($scope.data.sc_cat_item.sys_class_name == "sc_cat_item_producer" || $scope.data.sc_cat_item.sys_class_name == "std_change_record_producer")
				addRPButton();
			else if ($scope.data.is_cart_item)
				addUpdateButton();
			else
				addOrderButtons();
		}
	}
	
	function nativeGoBackToCart() {
		cabrillo.viewLayout.setNavigationBarButtons();
		var button = [{
			imageName: 'back',
			buttonStyle: cabrillo.viewLayout.REPLACE_BACK_BUTTON_STYLE,
			enabled: true
		}];

		cabrillo.viewLayout.setNavigationBarButtons(button, function() {
			$location.search('id=sc_cart');
		});
	}
	
	function displayNativeButtons() {
		if (cabrillo.isNative() && !$scope.orderConfirmation) {
			cabrillo.viewLayout.setTitle($scope.data.sc_cat_item.name);
			showNativeMobileButtons();
			cabrillo.viewLayout.showBackButton();

			if ($scope.data.is_cart_item) {
				cabrillo.viewLayout.hideBackButton();
				cabrillo.viewLayout.setNavigationBarButtons();
				nativeGoBackToCart();
			}
		}
	}
	
	var mespClosePopupUnregister = $rootScope.$on("mesp.popup.close", function() {
		// Timeout is to give a better user experience otherwise when this popup opens,
		// the cabrillo buttons will be displayed immediately giving a bad user experience.
		$timeout(function(){
			displayNativeButtons();
		});
	});
	
	var mespOpenPopupUnregister = $rootScope.$on("mesp.popup.open", function() {
		// Timeout is to give a better user experience otherwise when this popup opens,
		// the cabrillo buttons will be displayed immediately giving a bad user experience.
		$timeout(function(){
			removeCabrilloButtons();
		});
	});
	
	var g_form;	
	$scope.$on('spModel.gForm.initialized', function(e, gFormInstance){
		if (gFormInstance.getSysId() != -1 && gFormInstance.getSysId() != c.getItemId())
			return;
		g_form = gFormInstance;
		spSCNavStateManager.register(g_form);
		if ($scope.options.native_mobile == 'true' && cabrillo.isNative()) {
			cabrillo.viewLayout.setTitle($scope.data.sc_cat_item.name);
			$rootScope.$on('spModel.gForm.showNativeMobileButtons', displayNativeButtons);
		}
		$timeout(function() {
			$rootScope.$emit('spModel.gForm.rendered', g_form);
			showNativeMobileButtons();
		}, 175);

		// This runs after all onSubmit scripts have executed
		g_form.$private.events.on('submitted', function(){
			cleanFailedSubmit();
			$scope.submitting = true;
			if ($scope.data.sc_cat_item.item_action === "order")
				getOne();
			else if ($scope.data.sc_cat_item.item_action === "add_to_cart")
				addToCart();
			else if ($scope.data.sc_cat_item.item_action == "update_cart")
				updateCart();
		});
	});
	function getVarData(fields) {
		var reqData = {};
		for(var obj in fields)
			reqData[fields[obj].name] = fields[obj].value;
		return reqData;
	}
	function addLink(url, msg) {
		return "<a class='link alert-link' href=" + url + ">" + msg + "</a>";
	}
	
    //New Draft Function
    function newAddDraft(itemId, quantity, variables, newRecordID, draftID) {
        return $http.post("/api/sn_sc/v1/servicecatalog/" + "items/" + itemId + "/create_draft", {
            'sysparm_quantity': quantity,
            'variables': variables,
            'sysparm_item_guid': newRecordID,
            'draft_id': draftID
        })
    };
	function getValidatedVarData(fields) {
		//Filtering out invalid masked variables, to avoid adding them to wishlist
		var validFields = Object.values(fields).filter(function(field) { return !(field.type == 'masked' && field.useConfirmation && field.value != field.confirmPassword); });
		return getVarData(validFields);
	}	
	
	$scope.addToWishlist = function() {
		$scope.submitting = true;
		$scope.m.actionMsg = $scope.data.is_wishlist_item ? $scope.m.wishlistUpdateMsg : $scope.m.wishlistAddMsg;
		$scope.m.actionMsg += addLink('?id=sc_wishlist', $scope.m.viewWishListMsg);
		$scope.m.actionMsg += '<i class="fa fa-close pull-right pointer close-notification" aria-label="${Close Notification}" tabindex="0" ng-click="c.hideCartMsg()"/>';
		$scope.m.actionMsg = $sce.trustAsHtml($scope.m.actionMsg);
		$scope.is_update_wishlist = false;
		
		var draftID = $scope.data.draft_id;
        newAddDraft($scope.data.sc_cat_item.sys_id, c.quantity, getValidatedVarData($scope.data.sc_cat_item._fields), $scope.data._generatedItemGUID, draftID).then(function(response) {		
		//spScUtil.addToWishlist($scope.data.sc_cat_item.sys_id, c.quantity, getVarData($scope.data.sc_cat_item._fields), $scope.data._generatedItemGUID).then(function(response){
			var cartItemId = "";
			for (var i=0; i<response.data.result.items.length; i++) {
				var item = response.data.result.items[i];
				if (item.catalog_item_id === $scope.data.sc_cat_item.sys_id) {
					cartItemId = item.cart_item_id;
					break;
				}
			}
					if ($scope.data.draft_id == null) {
                $scope.data.draft_id = response.data.result.cart_id;
            }
					
			$rootScope.$broadcast("$sp.service_catalog.wishlist.add_item");
			$rootScope.$broadcast("$sp.service_catalog.wishlist.update", cartItemId);
			g_form.$private.userState.clearModifiedFields();
			$scope.data.showMsg = $scope.is_update_wishlist = true;
			$scope.data.is_wishlist_item = true;
			$scope.data.show_wishlist_msg = false;
			$scope.submitting = false;
			spUtil.scrollTo('#sc_cat_item', 300);
		}, function(response) {
			if (response.data.result && response.data.result.errMsg)
				spUtil.addErrorMessage(response.data.result.errMsg);

			$scope.submitting = false;
			return $q.reject(response);
		});
	}
	function getAlsoRequestForValue(fields) {
        if ($scope.data.sc_cat_item.requested_for_variable_name)
            return fields[$scope.data.sc_cat_item.requested_for_variable_name].also_request_for_value;
    }
	
	$scope.triggerAddToWishlist = function() {
        $scope.submitting = true;
        var alsoRequestFor = getAlsoRequestForValue($scope.data.sc_cat_item._fields);
        if (alsoRequestFor) {
            spModal.confirm($scope.m.addToWishlistConfirmMsg).then(addToWishlist, function() {
                $scope.submitting = false;
            });
        } else
            addToWishlist();
    }

	$scope.triggerAddToCart = function(timeout) {
		$scope.data.sc_cat_item.item_action = "add_to_cart";
		$scope.data.sc_cat_item.quantity = c.quantity;
		$scope.$evalAsync(function (){
			if (g_form) {
				$scope.submitting = true;
				if (!spScUtil.isRegexDone($scope.data.sc_cat_item._fields)) {
					$scope.submitting = false;
					$scope.validating = true;
				} else if (!g_form.submit()) {
					timeout = timeout || 1000;
					$timeout(function () {
						$scope.$broadcast('$sp.service_catalog.form_submit_failed', {action_name: 'submit'});
					}, timeout);
				}
			}
		})
	}

	$scope.triggerUpdateCart = function(timeout) {
		$scope.data.sc_cat_item.item_action = "update_cart";
		$scope.data.sc_cat_item.quantity = c.quantity;
		$scope.$evalAsync(function (){
			if (g_form) {
				$scope.submitting = true;
				if (!spScUtil.isRegexDone($scope.data.sc_cat_item._fields)) {
					$scope.submitting = false;
					$scope.validating = true;
				} else if (!g_form.submit()) {
					timeout = timeout || 1000;
					$timeout(function () {
						$scope.$broadcast('$sp.service_catalog.form_submit_failed', {action_name: 'submit'});
					}, timeout);
				}
			}
			
		})
		return false;
	}

	$scope.triggerOnSubmit = function(timeout) {
		if ($scope.options.isServiceWorkspace && $window.frameElement) {
			var workspaceParams = {};
			workspaceParams.sysparm_parent_table = $window.frameElement.getAttribute('parent-table');
			workspaceParams.sysparm_parent_sys_id = $window.frameElement.getAttribute('parent-sys-id');
			$scope.data.workspaceParams = workspaceParams;
		}
		$scope.data.sc_cat_item.item_action = "order";
		$scope.data.sc_cat_item.quantity = c.quantity;
		$scope.$evalAsync(function () {
			if (g_form) {
				$scope.submitting = true;
				if (!spScUtil.isRegexDone($scope.data.sc_cat_item._fields)) {
					$scope.submitting = false;
					$scope.validating = true;
				} else if (!g_form.submit()) {
					timeout = timeout || 1000;
					$timeout(function () {
						$scope.$broadcast('$sp.service_catalog.form_submit_failed', {action_name: 'submit'});
					}, timeout);
				}
			}
		})
		return false;
	}
	
	function setFieldsReadonly() {
		var allFields = g_form.getFieldNames();
		for (var fieldName in allFields) {
			g_form.setReadonly(allFields[fieldName], true);
		}
	}
	// order / create request
	function getOne() {
		$scope.server.get({
			action: 'log_request',
			itemDetails: {
				sys_id: $scope.data.sc_cat_item.sys_id,
										name: $scope.data.sc_cat_item.name,
				sys_class_name: $scope.data.sc_cat_item.sys_class_name
			}
		});
		//Required to pass as payload for usage as embeddedWidget
		var embeddedWidgetOptions = {
			"auto_redirect" : "true",
			"requested_for_id" : "",
			"requested_for_display" : ""
		};
		if ($scope.data.sc_cat_item.sys_class_name != "sc_cat_item_producer" && $scope.data.sc_cat_item.sys_class_name != "std_change_record_producer") {
			if ($scope.data.sys_properties.twostep && $scope.data.sc_cat_item.request_method != "submit") {
				var payload = {
					cart: 'cart_' + $scope.data.sc_cat_item.sys_id,
					itemDetails: {
						sys_id: $scope.data.sc_cat_item.sys_id, 
						quantity: $scope.data.sc_cat_item.quantity, 
						fields: getVarData($scope.data.sc_cat_item._fields), 
						newRecordID: $scope.data._generatedItemGUID,
						request_method : $scope.data.sc_cat_item.request_method
					},
					action: $scope.data.is_wishlist_item ? "order_wishlist_item" : "order_item",
					workspaceParams: $scope.data.workspaceParams
				};
				for (var embeddedOption in embeddedWidgetOptions) {
					payload[embeddedOption] = c.options[embeddedOption] || embeddedWidgetOptions[embeddedOption];
				}
				$scope.server.get(payload).then(function(response) {
					var orderItemModalCtrl;
					var unregister = $scope.$on('$sp.service_catalog.cart.cancel_order', function() {
						$scope.submitting = false;
						$scope.orderConfirmation = false;
						$timeout(function () {
							orderItemModalCtrl.close();
							displayNativeButtons();
						});
					});
					var closeModalOnSubmit = $scope.$on('$sp.service_catalog.cart.submitted', function(){
						orderItemModalCtrl.close();
						setFieldsReadonly();
						$scope.submitted = true;
					});
					var orderItemModal = angular.copy(response.data.orderItemModal);
					orderItemModal.options.afterOpen = function(ctrl){
						orderItemModalCtrl = ctrl;
					};
					orderItemModal.options.afterClose = function() {
							unregister();
							closeModalOnSubmit();
							c.orderItemModal = null;
							orderItemModalCtrl = null;
						};
						c.orderItemModal = orderItemModal;
					});
				$scope.orderConfirmation = true;
			} else {
				var additionalParms = {};
				if ($scope.data.workspaceParams) {
					additionalParms.sysparm_parent_sys_id = $scope.data.workspaceParams.sysparm_parent_sys_id;
					additionalParms.sysparm_parent_table = $scope.data.workspaceParams.sysparm_parent_table;
				}
				$scope.submitting = true;
				showPageLoader();
				addOrderButtons();
				if ($scope.data.is_wishlist_item) {

					spScUtil.orderWishlistedItem($scope.data.sc_cat_item.sys_id, $scope.data.sc_cat_item.quantity, getVarData($scope.data.sc_cat_item._fields), $scope.data._generatedItemGUID, additionalParms).then(function(response) {
						var a = response.data.result;
						$scope.$emit("$$uiNotification", a.$$uiNotification);
						$scope.$emit("$sp.sc_cat_item.submitted", a);
						$rootScope.$broadcast("$sp.service_catalog.wishlist.update");
						if (c.options.auto_redirect == 'false') {
							setFieldsReadonly();
							$scope.submitting = false;
							$scope.submitted = true;
							$rootScope.$broadcast("$sp.service_catalog.cart.submitted", true);
							spUtil.addInfoMessage($scope.m.requestSubmitted);
							return;
						} else {
							if ($scope.portal.url_suffix.toString().toLowerCase() == 'pttep') {
								$location.search('id=my_request');
							}
							else {
								$location.search('id=my_request_external');
							}
							
							//	$location.search('id=sc_request&is_new_order=true&table=sc_request&sys_id=' + a.sys_id);
						}
						
					});
				}
				else {
					spScUtil.orderNow($scope.data.sc_cat_item.sys_id, $scope.data.sc_cat_item.quantity, getVarData($scope.data.sc_cat_item._fields), $scope.data._generatedItemGUID, additionalParms).then(function(response) {
							var a = response.data.result;
							$scope.$emit("$$uiNotification", a.$$uiNotification);
							$scope.$emit("$sp.sc_cat_item.submitted", a);
							if (c.options.auto_redirect == 'false') {
								setFieldsReadonly();
								$scope.submitting = false;
								$scope.submitted = true;
								$rootScope.$broadcast("$sp.service_catalog.cart.submitted", true);
								spUtil.addInfoMessage($scope.m.requestSubmitted);
								return;
							} else if (!$scope._atf) {
								removeCabrilloButtons();
									if ($scope.portal.url_suffix.toString().toLowerCase() == 'pttep') {
										$location.search('id=my_request');
										//$location.search('id=sc_category&catalog_id=eb988957db10bb00ca57f0eb0c9619d4&sys_id=ece62ff29756f510c4ea79b71153aff1');
									}
									else {
										$location.search('id=my_request_external');
									}
								//$location.search('id=sc_request&is_new_order=true&table=sc_request&sys_id=' + a.sys_id);
							}
					}, function(response) {
						if (response.data.result && response.data.result.errMsg)
							spUtil.addErrorMessage(response.data.result.errMsg);
					});
				}
			}
		} else {
			postCatalogFormRequest().then(function(response) {
				var a = response.data.result;
				if (!$scope.options.isServiceWorkspace)
					$scope.$emit("$$uiNotification", a.$$uiNotification);
				$scope.$emit("$sp.sc_cat_item.submitted", a);
				if ($scope.data.is_wishlist_item)
					$rootScope.$broadcast("$sp.service_catalog.wishlist.update");
				if (c.options.auto_redirect == 'false') {
					setFieldsReadonly();
					$scope.submitted = true;
				$scope.submitting = false;
				$scope.submitButtonMsg = $scope.m.submittedMsg;
				} else if (!$scope._atf)
						handleRedirect(a.number, a.table, a.sys_id, a.redirect_to, a.redirect_portal_url);
				
			});
		}
	}

	function addToCart() {
		$scope.server.get({
			action: 'log_request',
			itemDetails: {sys_id: $scope.data.sc_cat_item.sys_id, 
										name: $scope.data.sc_cat_item.name,
										sys_class_name: $scope.data.sc_cat_item.sys_class_name}
		});
		
		postCatalogFormRequest().then(function(response) {
			$rootScope.$broadcast("$sp.service_catalog.cart.add_item");
			$rootScope.$broadcast("$sp.service_catalog.cart.update");
			$scope.$emit("$sp.sc_cat_item.add_to_cart", $scope.data._generatedItemGUID);
			if ($scope.data.is_wishlist_item) {
				$rootScope.$broadcast("$sp.service_catalog.wishlist.update");
				$scope.data.is_wishlist_item = false;
				if ($location.$$search.edit === "wishlist") {
					$location.search("id=sc_wishlist");
					return;
				}
			}
			g_form.$private.userState.clearModifiedFields();
			c.status = i18n.getMessage("Added item to shopping cart");
			var cartResponse = response;
			$scope.server.get({action: 'init_item'}).then(function(response) {
				$scope.data._generatedItemGUID = response.data._generatedItemGUID;
				ah.setParams($scope.data._attachmentTable, $scope.data._generatedItemGUID, 1024 * 1024 * $scope.data.maxAttachmentSize);
				$scope.attachmentHandler.getAttachmentList();
				if (!cabrillo.isNative()) {
					$scope.m.actionMsg = $scope.m.cartAddMsg + addLink('?id=sc_cart', $scope.m.viewCartMsg);
					$scope.m.actionMsg += '<i class="fa fa-close pull-right pointer close-notification" aria-label="${Close Notification}" tabindex="0" ng-click="c.hideCartMsg()"/>';
					$scope.m.actionMsg = $sce.trustAsHtml($scope.m.actionMsg);
					$scope.data.showMsg = true;
				} else {
						cabrillo.message.showMessage(cabrillo.message.SUCCESS_MESSAGE_STYLE, c.status);
						if (cartResponse && cartResponse.data && cartResponse.data.result) {
								var items = cartResponse.data.result.items || [];
								$scope.showCabrilloCart = true;
								$scope.cartItemCount = items.length;
								showCartButton();
						}
				}
				$scope.submitting = false;
				hidePageLoader();
				cleanFailedSubmit = $scope.$on('$sp.service_catalog.form_submit_failed', function() { $scope.submitting = false; });
				spUtil.scrollTo('#sc_cat_item', 300);
			});
		});
	}
	function updateCart() {
		postCatalogFormRequest().then(function(response) {
			g_form.$private.userState.clearModifiedFields();
			c.status = i18n.getMessage("Updated Item to shopping cart.");
			removeCabrilloButtons();
			$location.search('id=sc_cart');
		})
	}
	function postCatalogFormRequest() {
		$scope.submitting = true;
		showPageLoader();
		if ($scope.data.sc_cat_item.item_action !== "add_to_cart")
			addOrderButtons();
		
		if ($scope.data.is_wishlist_item) {
			$scope.is_update_wishlist = false;
			$scope.data.show_wishlist_msg = false;
			if ($scope.data.sc_cat_item.sys_class_name === "sc_cat_item_producer")
				return spScUtil.submitWishlistedProducer($scope.data.sc_cat_item.sys_id, getVarData($scope.data.sc_cat_item._fields), $scope.data._generatedItemGUID, $scope.data.workspaceParams);
			else if ($scope.data.sc_cat_item.item_action === "add_to_cart")
				return spScUtil.addWishlistedItemToCart($scope.data.sc_cat_item.sys_id, $scope.data.sc_cat_item.quantity, getVarData($scope.data.sc_cat_item._fields), $scope.data._generatedItemGUID).then(null, function(response) {
				if (response.data.result && response.data.result.errMsg)
					spUtil.addErrorMessage(response.data.result.errMsg);

				$scope.submitting = false;	
				return $q.reject(response);
			});
		}
		else if ($scope.data.is_cart_item) {
			return spScUtil.updateCart($scope.data._generatedItemGUID, $scope.data.sc_cat_item.quantity, getVarData($scope.data.sc_cat_item._fields));
		}
		else if ($scope.data.sc_cat_item.sys_class_name === "sc_cat_item_producer") {
			return spScUtil.submitProducer($scope.data.sc_cat_item.sys_id, getVarData($scope.data.sc_cat_item._fields), $scope.data._generatedItemGUID, $scope.data.workspaceParams).then(null, function(response) {
				if (response.data.result && response.data.result.errMsg) 
					spUtil.addErrorMessage(response.data.result.errMsg);

				$scope.submitting = false;
				return $q.reject(response);
			});
		}
		else if ($scope.data.sc_cat_item.sys_class_name === "std_change_record_producer") {
				return spScUtil.submitStdChgProducer($scope.data.sc_cat_item.sys_id, $scope.data.stdChg.twoStep, $scope.data.stdChg.currentVersion, $scope.data._generatedItemGUID, $scope.portal.url_suffix);
		}
		else if ($scope.data.sc_cat_item.item_action === "add_to_cart") {
			return spScUtil.addToCart($scope.data.sc_cat_item.sys_id, $scope.data.sc_cat_item.quantity, getVarData($scope.data.sc_cat_item._fields), $scope.data._generatedItemGUID).then(null, function(response) {
				if (response.data.result && response.data.result.errMsg)
					spUtil.addErrorMessage(response.data.result.errMsg);

				$scope.submitting = false;
				return $q.reject(response);
			});
		}
	}
	// spModel populates mandatory - hasMandatory is called by the submit button
	$scope.hasMandatory = function() {
		return c.mandatory && c.mandatory.length > 0;
	};
	
	//	Listeners
	var cleanFailedSubmit = $scope.$on('$sp.service_catalog.form_submit_failed', function() { $scope.submitting = false; });
	var validationComplete = $rootScope.$on('$sp.service_catalog.form_validation_complete', function() { 
															$scope.validating = false;
														});
	$scope.$on("$sp.sc_cat_item.submitted", function() {
		g_form.$private.userState.clearModifiedFields();
	});
	$scope.$on("$sp.service_catalog.wishlist.update", function(evt, item) {
		if (item === $scope.data.sys_id)
			$scope.data.show_wishlist_msg = false;
	});
	// switch catalog items
	var unregister = $scope.$on('$sp.list.click', onListClick);
	$scope.$on("$destroy", function() {
		$rootScope.$broadcast("$sp.service_catalog.item.close");
		unregister();
		mespClosePopupUnregister();
		mespOpenPopupUnregister();
		validationComplete();
	});
	function onListClick(evt, arg) {
		$scope.data.sys_id = arg.sys_id;
		spUtil.update($scope);
	}
	
	function formatRedirectUrl(page, table, sys_id) {
		var url;
		var paramObj = {page: page, table: table, sys_id: sys_id};
		url = spUtil.format(c.options.url, paramObj);
		
		//return url;
		if ($scope.portal.url_suffix.toString().toLowerCase() == 'pttep') {
			
			if (c.data.sc_cat_item.custom_url && c.data.sc_cat_item.custom_url != '') {
				return c.data.sc_cat_item.custom_url.toString();
			} else {
			return 'id=my_request';
			}
			//return 'id=sc_category&catalog_id=eb988957db10bb00ca57f0eb0c9619d4&sys_id=ece62ff29756f510c4ea79b71153aff1';
			//return 'id=mail_delivery_task';
		}
		else {
			return 'id=my_request_external';
		}
	}
	
	function handleRedirect(n, table, sys_id, redirectTo, redirectUrl) {

		var page = 'form';
		if (table == 'sc_request')
			page = 'sc_request';
		else if (n)
			page = 'ticket';
		
		if (redirectTo == 'catalog_home') 
			page = 'sc_home';

		//For Standard change, always direct to form if not in Workspace
		if ($scope.data.sc_cat_item.sys_class_name === "std_change_record_producer") {
			if ($scope.options.isServiceWorkspace == 'true') {
				var params = {};
				params.msg = 'TARGET_RECORD_SELECTED';
				params.target_table = table;
				params.target_sys_id = -1;
				if (sys_id)
					params.target_sys_id = sys_id;

				if ($scope.data.stdChg.twoStep)
					params.target_query = 'type=standard^std_change_producer_version=' + $scope.data.stdChg.currentVersion;

				window.postMessage(params, location.origin);
				return;
			} else
				page = 'form';
		}
		removeCabrilloButtons();
		if (c.options.page) {page = c.options.page;}
		if (c.options.table) {table = c.options.table;}
		var url = formatRedirectUrl(page, table, sys_id);
		if ($scope.data.sc_cat_item.sys_class_name === "sc_cat_item_producer" || $scope.data.sc_cat_item.sys_class_name === "std_change_record_producer" || $scope.data.sc_cat_item.sys_class_name === "sc_req_item") {
			if (redirectUrl) {
				$window.location.href = redirectUrl;
				
			} else {
				var newURL = $location.search(url);
		    spAriaFocusManager.navigateToLink(newURL.url());
			}
			return;
		}
		$location.search(formatRedirectUrl('sc_request', 'sc_request', sys_id));
		return;
	}
    
    $timeout(function() {
        if ($document[0].getElementsByClassName('sc-sticky-item-header').length > 0) {
            var titleHeight = $document[0].getElementsByClassName('sc-sticky-item-header')[0].clientHeight;
            $scope.stickyHeaderTop = '-' + (titleHeight - 20 - $document[0].getElementsByClassName('sc-cat-item-short-description')[0].clientHeight) + 'px;';
        }
    });
		
	function addOrderButtons() {
		if (!cabrillo.isNative()) return;
		showCartButton();
		var buttons = [];
		if ($scope.c.data.sys_properties.cartEnabled && $scope.c.showAddCartBtn()) {
			buttons.push({
				title: $scope.m.addToCart,
				enabled: true,
				backgroundColor: '#f7f7f7',
				textColor: '#000000'
			});
		}
		buttons.push({
			title: $scope.submitting? $scope.m.submittingMsg : $scope.submitButtonMsg,
			enabled: !$scope.submitting,
			backgroundColor: $scope.data.sys_properties.mobileNativeColor,
			textColor: '#FFFFFF'
		});
		cabrillo.viewLayout.setBottomButtons(buttons, function(buttonIndex) {
			if ($scope.c.data.sys_properties.cartEnabled && $scope.c.showAddCartBtn()) {
				if (buttonIndex == 0) {
					$timeout(function() {	
						$scope.triggerAddToCart();
					},500);					
				}
				else {
					$timeout(function() {	
						$scope.triggerOnSubmit();
					},500);
				}			
			}
			else {
				$timeout(function() {	
					$scope.triggerOnSubmit();
				},500);
			}
		});
	}
	
	function addRPButton() {
		if (!cabrillo.isNative()) return;
		var buttons = [
			{
				title: $scope.submitButtonMsg,
				enabled: true,
				backgroundColor: $scope.data.sys_properties.mobileNativeColor,
				textColor: '#FFFFFF'
			}
		];

		cabrillo.viewLayout.setBottomButtons(buttons, function(buttonIndex) {
			$timeout(function() {	
				$scope.triggerOnSubmit();
			},500);
		});
	}
	
	function showCartButton() {
		if (!cabrillo.isNative() || !$scope.showCabrilloCart) return;

		var button = [{
				imageName: 'cart',
				badgeCount: $scope.cartItemCount,
				backgroundColor: '#2ff5f9',
				textColor: '#FFFFFF',
				enabled: true
				}];

		cabrillo.viewLayout.setNavigationBarButtons(button, function(index) {
				$location.search('id=sc_cart');
			});

	}
	
	function addUpdateButton() {
		if (!cabrillo.isNative()) return;
		var buttons = [
			{
				title: $scope.m.updateCart,
				enabled: true,
				backgroundColor: $scope.data.sys_properties.mobileNativeColor,
				textColor: '#FFFFFF'
			}
		];

		cabrillo.viewLayout.setBottomButtons(buttons, function(buttonIndex) {
			$timeout(function() {	
				$scope.triggerUpdateCart();
			},500);
		});
		nativeGoBackToCart();
	}
	
	function removeCabrilloButtons() {
			if (!cabrillo.isNative()) return;
			cabrillo.viewLayout.setBottomButtons();
	}
	
	function showPageLoader() {
		if (!cabrillo.isNative()) return;
		cabrillo.viewLayout.showSpinner();
	}
	
	function hidePageLoader() {
		if (!cabrillo.isNative()) return;
		cabrillo.viewLayout.hideSpinner();
	}
}