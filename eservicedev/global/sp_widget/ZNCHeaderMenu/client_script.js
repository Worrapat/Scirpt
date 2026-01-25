api.controller = function ($scope, spUtil, $rootScope, $timeout, spAriaUtil, spGtd, $window, i18n) {
	var KEY_ENTER = 13;
	$scope.collapse = function () {
		$rootScope.$emit('sp-navbar-collapse');
	};
	$scope.loadingIndicator = $rootScope.loadingIndicator;
	$scope.cartItemCount = 0;
	$scope.wishlistItemCount = 0;
	$scope.toursTooltipEnabled = true;
	$scope.currentTour = spGtd.getCurrentTour();
	$scope.accessibilityEnabled = spAriaUtil.g_accessibility === 'true';
	$scope.isMobile = spUtil.isMobile();
	var isCartCountSetAtleastOnce = false;
	var cancelTooltipPromise;
	$scope.$on('$sp.service_catalog.cart.count', function ($evt, count) {
		var previousCount = $scope.cartItemCount;
		$scope.cartItemCount = count;
		if (previousCount >= $scope.cartItemCount) return;
		if (!isCartCountSetAtleastOnce) {
			isCartCountSetAtleastOnce = true;
			return;
		}
		$timeout.cancel(cancelTooltipPromise);
		$timeout(function () {
			setCartTooltipVisibility(true);
		});
		cancelTooltipPromise = $timeout(function () {
			setCartTooltipVisibility(false);
		}, 3000);
	});
	$scope.$on('$sp.service_catalog.wishlist.count', function ($evt, count) {
		// console.log('wishlist count', count);
		$scope.wishlistItemCount = count;
	});
	$scope.$on('sp_loading_indicator', function (e, value) {
		$scope.loadingIndicator = value;
	});
	function setCartTooltipVisibility(value) {
		$('#cart-dropdown').tooltip(value ? 'show' : 'hide');
	}
	$scope.toggleTours = function () {
		var action = $scope.toursTooltipEnabled ? 'disable' : 'enable';
		$scope.toursTooltipEnabled = $scope.toursTooltipEnabled ? false : true;
		$('[data-toggle-second="tooltip"]').tooltip(action);
		if (action == 'disable') $('[data-toggle-second="tooltip"]').tooltip('hide');
		$scope.currentTour = spGtd.getCurrentTour();
	};
	$scope.endTour = function () {
		spGtd.endTour();
	};
	$scope.endTourByKeyDown = function (e) {
		if (e.which === KEY_ENTER) {
			spGtd.endTour();
		}
	};
	$scope.onToursItemBlur = function () {
		$('[data-toggle-second="tooltip"]').tooltip('enable');
		$scope.toursTooltipEnabled = true;
	};
	// PRB1108244: visibleItems array is used to improve keyboard nav
	// in menu, refresh it as needed
	$scope.$watch(
		'data.menu.items',
		function () {
			$scope.visibleItems = [];
			if ($scope.data.menu.items) {
				for (var i in $scope.data.menu.items) {
					var item = $scope.data.menu.items[i];
					if (item.items || (item.scriptedItems && item.scriptedItems.count != 0))
						$scope.visibleItems.push(item);
				}
			}
		},
		true,
	);
	$scope.$on('sp-tour-ended', function () {
		$timeout(function () {
			$scope.currentTour = null;
		});
		$timeout(function () {
			$('.dropdown-menu a:visible', $('.gtd-dropdown-container')).first().focus();
		}, 5);
	});
	$scope.$on('sp-menu-update-tours', function (event, tours) {
		$scope.data.showTours = $scope.data.showTours && !spUtil.isMobile();
		if ($scope.data.showTours === false) {
			$scope.data.guidedTours = null;
			return;
		}
		var guidedToursLabel = 'Guided Tours';
		$scope.data.guidedTours = {
			label: guidedToursLabel,
			collection: [],
		};
		$scope.tooltipTours =
			tours.length === 1
				? i18n.getMessage('This page currently has 1 tour')
				: i18n.getMessage('This page currently has {0} tours').withValues([tours.length]);
		if (tours.length > 0) {
			$scope.data.guidedTours.collection = tours.map(function (t) {
				return {
					title: t.name,
					id: t.id,
					clicked: function () {
						spGtd.launch(t.id);
					},
				};
			});
		}
	});
	// Get list of record watchers
	var record_watchers = [];
	if ($scope.data.menu.items) {
		for (var i in $scope.data.menu.items) {
			var item = $scope.data.menu.items[i];
			if (item.type == 'scripted') {
				if (item.scriptedItems.record_watchers)
					record_watchers = record_watchers.concat(item.scriptedItems.record_watchers);
			}
			if (item.type == 'filtered') {
				record_watchers.push({ table: item.table, filter: item.filter });
			}
		}
	}
	// Init record watchers
	for (var y in record_watchers) {
		var watcher = record_watchers[y];
		spUtil.recordWatch($scope, watcher.table, watcher.filter);
	}
	$rootScope.$broadcast('sp-header-loaded');
};
