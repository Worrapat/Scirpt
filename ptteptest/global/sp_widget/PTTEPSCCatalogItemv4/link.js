function(scope, elem){
    scope.setFocusToAttachment = function () {
		setTimeout(function () {
			var inboxArray = elem.find("a.view-attachment");
			inboxArray.focus();
		}, 100);
	}
	scope.setFocusToAttachmentButton = function () {
		elem.find('.sp-attachment-add')[0].focus();
	}
}
	