(function executeRule(current, previous /* null when async */) {
	// Configuration
	var SAFETY_LIMIT = 20;

	// Helpers
	function getDeptChain(userSysId) {
		var dept = [];
		var nextUser = userSysId;
		var guard = SAFETY_LIMIT;

		while (nextUser && guard-- > 0) {
			var u = new GlideRecord('sys_user');
			if (!u.get(nextUser)) break;

			if (u.department && !dept.includes(u.department.toString())) {
				dept.push(u.department.toString());
			}

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
		return dept;
	}

	function getManagedGroupIds(userSysId) {
		var ids = [];
		var gr = new GlideRecord('sys_user_grmember');
		gr.addQuery('user', userSysId);
		gr.query();
		while (gr.next()) {
			if (gr.group.manager) ids.push(gr.group.manager.toString());
		}
		return ids;
	}

	function buildQueryEqualOr(field, values) {
		if (!values || values.length === 0) return '';
		return values.map((v) => field + '=' + v).join('^OR');
	}

	// CSDM query แยกออก
	function buildCsdmQueryByClass(className, deptChain) {
		var classMap = {
			u_cmdb_ci_component_pii: [
				'u_business_application.u_operation_department',
				'u_business_application.department',
			],
			u_cmdb_ci_component_software: [
				'u_business_application.u_operation_department',
				'u_business_application.department',
			],
			cmdb_ci_service_auto: ['u_l2_department', 'u_l3_department'],
			cmdb_ci_business_app: ['u_operation_department', 'department'],
		};

		var fields = classMap[className];
		if (!fields) return '';

		var parts = [];
		for (var i = 0; i < fields.length; i++) {
			var q = buildQueryEqualOr(fields[i], deptChain);
			if (q) parts.push(q);
		}
		return parts.join('^OR');
	}

	// Main
	var userSysId = gs.getUserID();
	if (!userSysId) return;

	var sysClass = current.getTableName();

	// ---------------- CI LAYER ----------------
	var ciQueries = [];
	if (gs.hasRole('u_ci_manage_by_editor')) {
		var groupIds = getManagedGroupIds(userSysId);
		var q = buildQueryEqualOr('managed_by', groupIds);
		if (q) ciQueries.push(q);
	} else if (gs.hasRole('u_ci_department_editor') || gs.hasRole('u_ci_department_read_only')) {
		var deptChain = getDeptChain(userSysId);
		var q = buildQueryEqualOr('department', deptChain);
		if (q) ciQueries.push(q);
	}

	// ---------------- CSDM LAYER ----------------
	var csdmQueries = [];
	if (gs.hasRole('u_csdm_owner_read') || gs.hasRole('u_csdm_owner_editor')) {
		var deptChain2 = getDeptChain(userSysId);
		var csdmQuery = buildCsdmQueryByClass(sysClass, deptChain2);
		if (csdmQuery) csdmQueries.push(csdmQuery);
	}

	// ---------------- FINAL QUERY ----------------
	var finalQuery = [];

	var ciQueryStr = ciQueries.filter((q) => q && q.trim() !== '').join('^OR');
	if (ciQueryStr) finalQuery.push(ciQueryStr);

	var csdmQueryStr = csdmQueries.filter((q) => q && q.trim() !== '').join('^OR');
	if (csdmQueryStr) finalQuery.push(csdmQueryStr);

	var encodedQuery = finalQuery.length > 0 ? finalQuery.join('^OR') : '';

	if (encodedQuery) {
		current.addEncodedQuery(encodedQuery);
	} else {
		// fallback ถ้าจำเป็นจริง ๆ
		current.addEncodedQuery('departmentISEMPTY');
	}

	gs.info(
		'[BR] CMDB Visibility' +
			'\nTable : ' +
			current.getTableName() +
			'\nUser : ' +
			userSysId +
			'\nFinal EncodedQuery : ' +
			current.getEncodedQuery(),
	);
})(current, previous);
