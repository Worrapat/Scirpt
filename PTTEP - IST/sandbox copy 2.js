function onCondition() {
	var user = g_user; // ใช้ g_user เพราะเป็น client-side object
	console.log('CST - Set Field Read-Only End-User (Script) ==== > On');

	var isCsdmEditor = user.hasRole('sn_cmdb_editor');
	var isCsdmReadOnly = user.isMemberOf('CSDM ReadOnly');

	console.log('isCsdmEditor: ' + isCsdmEditor);
	console.log('isCsdmReadOnly: ' + isCsdmReadOnly);

	if (isCsdmReadOnly) {
		g_form.addInfoMessage('CSDM ReadOnly user — setting fields to read-only');
		var fields = g_form.getEditableFields();
		for (var x = 0; x < fields.length; x++) {
			g_form.setReadOnly(fields[x], true);
		}
	}
}
