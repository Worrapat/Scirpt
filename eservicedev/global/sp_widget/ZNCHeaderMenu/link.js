function link(scope, elem) {
	function isMDScreenSize() {
		return window.matchMedia('(max-width: 992px)').matches;
	}

	var KEY = {
		TAB: 9,
		ENTER: 13,
		ESC: 27,
		SPACE_BAR: 32,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
	};

	$('.navbar').on('keydown', '[id="sp-nav-bar"]:visible', function (e) {
		var mdScreenSize = isMDScreenSize();
		var target = e.target;
		if (target.localName == 'a') {
			var currentMenuItem = $(target).parents('li').first();
			var parentUL = currentMenuItem.parents('ul').first();

			var menuItem = currentMenuItem;
			var targetInSubmenu = !currentMenuItem.is('.header-menu-item');
			if (targetInSubmenu) {
				menuItem = $(target).parents('li.header-menu-item').first();
			}

			if (mdScreenSize && e.keyCode == KEY.RIGHT) {
				if ($(target).is('.dropdown-toggle') || $(target).is('[data-toggle="dropdown"]')) {
					// Target is a main menu item with sub-menu
					e.preventDefault();
					e.stopPropagation();
					currentMenuItem.addClass('open');
					$('> a:visible', menuItem).attr('aria-expanded', 'true');
					currentMenuItem.find('.dropdown-menu a:visible').first().focus();
				}
			} else if (mdScreenSize && e.keyCode == KEY.LEFT) {
				if (parentUL.is('.dropdown-menu')) {
					// Target is a sub-menu item
					parentUL
						.parents('.header-menu-item')
						.first()
						.removeClass('open')
						.find('> a:visible')
						.first()
						.focus();
					setAriaExpandedFalse(menuItem);
				}
			} else if (
				(mdScreenSize && e.keyCode == KEY.UP) ||
				(!mdScreenSize && e.keyCode == KEY.LEFT)
			) {
				handleFocus(false, e, mdScreenSize, menuItem, currentMenuItem, parentUL, targetInSubmenu);
			} else if (
				(mdScreenSize && e.keyCode == KEY.DOWN) ||
				(!mdScreenSize && e.keyCode == KEY.RIGHT)
			) {
				handleFocus(true, e, mdScreenSize, menuItem, currentMenuItem, parentUL, targetInSubmenu);
			}
			if (e.keyCode == KEY.TAB) {
				if ($(target).parents('li').hasClass('open')) $(target).dropdown('toggle');
				setAriaExpandedFalse(menuItem);
			}
		}
	});

	function setAriaExpandedFalse(menuItem) {
		if (menuItem.is('.dropdown')) $('> a:visible', menuItem).attr('aria-expanded', 'false');
	}

	function handleFocus(
		next,
		event,
		mdScreenSize,
		menuItem,
		currentMenuItem,
		parentUL,
		targetInSubmenu
	) {
		event.preventDefault();

		if (targetInSubmenu) {
			var itemsInSubmenu = parentUL.find('li.visible');
			var firstSubmenuItem = itemsInSubmenu.first();
			var lastSubmenuItem = itemsInSubmenu.last();
		}
		var allMenuItems = $('li.header-menu-item:visible', '.navbar');
		var firstMenuItem = allMenuItems.first();
		var lastMenuItem = allMenuItems.last();

		if (!mdScreenSize) {
			currentMenuItem.removeClass('open');
			setAriaExpandedFalse(menuItem);

			if (targetInSubmenu) menuItem.removeClass('open');
		} else {
			event.stopPropagation();
			if (!targetInSubmenu) {
				menuItem.removeClass('open');
				setAriaExpandedFalse(menuItem);
			}
		}

		var indexMenuItem = allMenuItems.index(menuItem);
		var targetMenuItem = next
			? allMenuItems.eq(indexMenuItem + 1)
			: allMenuItems.eq(indexMenuItem - 1);
		var menuItemToFocus = targetMenuItem.length
			? targetMenuItem
			: next
			? firstMenuItem
			: lastMenuItem; //enable circular navigation

		if (mdScreenSize && targetInSubmenu) {
			targetMenuItem = next
				? currentMenuItem.nextAll('li:visible').first()
				: currentMenuItem.prevAll('li:visible').first();
			menuItemToFocus = targetMenuItem.length
				? targetMenuItem
				: next
				? firstSubmenuItem
				: lastSubmenuItem; //enable circular navigation
		}
		menuItemToFocus.find('a').focus();
	}

	$(elem).on('click', '[data-toggle="dropdown"]', function (e) {
		var $target = $(e.target);
		setTimeout(function () {
			$('.dropdown-menu a:visible', $target.parents('.header-menu-item')).first().focus();
		}, 0);
	});

	setTimeout(function () {
		$('[data-toggle-second="tooltip"]').tooltip();
		bsDropdownTooltipShim('#cart-dropdown', '#cart-dropdown-wrapper');
		bsDropdownTooltipShim('#wishlist-menu', '#wishlist-menu-wrapper');
	});

	function bsDropdownTooltipShim(tooltipTrigger, dropdownParent) {
		if ($(dropdownParent).length) {
			$(tooltipTrigger).tooltip();
			$(dropdownParent).on('shown.bs.dropdown', function () {
				$(tooltipTrigger).tooltip('disable');
				$(tooltipTrigger).tooltip('hide');
			});
			$(dropdownParent).on('hidden.bs.dropdown', function () {
				$(tooltipTrigger).tooltip('enable');
			});
		}
	}
}
