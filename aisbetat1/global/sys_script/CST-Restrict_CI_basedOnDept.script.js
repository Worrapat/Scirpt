(function executeRule(current, previous /* null when async */) {
	// ---------------- CONFIG ----------------
	var SAFETY_LIMIT = 20;

	// ---------------- HELPERS ----------------
	function uniqueArray(arr) {
		return Array.from(new Set(arr));
	}

	function getDeptChain(userSysId) {
		var dept = [];
		var nextUser = userSysId;
		var guard = SAFETY_LIMIT;

		while (nextUser && guard-- > 0) {
			var u = new GlideRecord('sys_user');
			if (!u.get(nextUser)) break;

			var d = u.department ? u.department.toString().trim() : null;
			if (d && !dept.includes(d)) dept.push(d);

			var title = u.title + '';
			if (
				title.startsWith('Head of ') ||
				title.startsWith('Acting Head of ') ||
				title.startsWith('Chief Executive Officer ') ||
				title.startsWith('Chairman of ') ||
				u.manager.nil()
			)
				break;

			nextUser = u.manager ? u.manager.toString() : null;
		}
		return uniqueArray(dept);
	}

	function getManagedGroupIds(userSysId) {
		var ids = [];
		var gr = new GlideRecord('sys_user_grmember');
		gr.addQuery('user', userSysId);
		gr.query();
		while (gr.next()) {
			var m = gr.group.manager ? gr.group.manager.toString().trim() : null;
			if (m) ids.push(m);
		}
		return uniqueArray(ids);
	}

	function buildQueryEqualOr(field, values) {
		if (!values || values.length === 0) return '';
		var filtered = uniqueArray(values).filter(function (v) { return v && v.trim() !== ''; });
		if (filtered.length === 0) return '';
		return filtered.map(function (v) { return field + '=' + v; }).join('^OR');
	}

	function buildCsdmQueryByClass(className, deptChain) {
		var classMap = {
			u_cmdb_ci_component_pii: ['u_business_application.u_operation_department', 'u_business_application.department'],
			u_cmdb_ci_component_software: ['u_business_application.u_operation_department', 'u_business_application.department'],
			cmdb_ci_service_auto: ['u_l2_department', 'u_l3_department'],
			cmdb_ci_business_app: ['u_operation_department', 'department']
		};

		var fields = classMap[className];
		if (!fields || fields.length === 0) return '';

		var parts = [];
		fields.forEach(function (f) {
			var q = buildQueryEqualOr(f, deptChain);
			if (q) parts.push(q);
		});

		return parts.join('^OR');
	}

	// ---------------- MAIN ----------------
	var userSysId = gs.getUserID();
	if (!userSysId) return;

	var sysClass = current.getTableName();
	var finalQueryParts = [];

	// ----- CI LAYER -----
	if (gs.hasRole('u_ci_manage_by_editor')) {
		var groupIds = getManagedGroupIds(userSysId);
		if (groupIds.length > 0)
			finalQueryParts.push(buildQueryEqualOr('managed_by', groupIds));
	} else if (gs.hasRole('u_ci_department_editor') || gs.hasRole('u_ci_department_read_only')) {
		var deptChain = getDeptChain(userSysId);
		if (deptChain.length > 0)
			finalQueryParts.push(buildQueryEqualOr('department', deptChain));
	}

	// ----- CSDM LAYER -----
	if (gs.hasRole('u_csdm_owner_read') || gs.hasRole('u_csdm_owner_editor')) {
		var deptChain2 = getDeptChain(userSysId);
		var csdmQuery = buildCsdmQueryByClass(sysClass, deptChain2);

		// remove duplicate with finalQueryParts
		if (csdmQuery && !finalQueryParts.includes(csdmQuery))
			finalQueryParts.push(csdmQuery);
	}

	// ----- ADD departmentISEMPTY only if no other filter -----
	if (finalQueryParts.length === 0) finalQueryParts.push('departmentISEMPTY');

	current.addEncodedQuery(finalQueryParts.join('^OR'));

	// ----- DEBUG INFO -----
	gs.info(
		'[BR] CMDB Visibility' +
		'\nTable : ' + current.getTableName() +
		'\nUser : ' + userSysId +
		'\nFinal EncodedQuery : ' + current.getEncodedQuery()
	);
})(current, previous);
