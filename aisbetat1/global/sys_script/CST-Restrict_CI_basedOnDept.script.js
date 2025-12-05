(function executeRule(current, previous) {
	// ---------------- CONFIG ----------------
	var SAFETY_LIMIT = 20;

	// ---------------- UTILITIES ----------------

	function unique(arr) {
		return Array.from(new Set(arr)).filter(Boolean);
	}

	function safeGet(str) {
		return (str + '').trim();
	}

	// ---------------- DEPARTMENT CHAIN ----------------

	function getDeptChain(userSysId) {
		var result = [];
		var nextUser = userSysId;
		var guard = SAFETY_LIMIT;

		while (nextUser && guard-- > 0) {
			var u = new GlideRecord('sys_user');
			if (!u.get(nextUser)) break;

			var d = safeGet(u.department);
			if (d) result.push(d);

			var title = safeGet(u.title);
			var stop = /^(Head of |Acting Head of |Chief Executive Officer |Chairman of )/.test(title);

			if (stop || u.manager.nil()) break;

			nextUser = safeGet(u.manager);
		}

		return unique(result);
	}

	// ---------------- GROUP MANAGED (CI LAYER) ----------------

	function getManagedGroupIds(userSysId) {
		var ids = [];
		var gr = new GlideRecord('sys_user_grmember');
		gr.addQuery('user', userSysId);
		gr.query();

		while (gr.next()) {
			var g = safeGet(gr.group.manager);
			if (g) ids.push(g);
		}

		return unique(ids);
	}

	// ---------------- QUERY BUILDERS ----------------

	function orEqual(field, list) {
		var filtered = unique(list);
		if (!filtered.length) return '';
		return filtered
			.map(function (v) {
				return field + '=' + v;
			})
			.join('^OR');
	}

	// ---------------- CI LAYER QUERY ----------------

	function buildCILayerQuery(userSysId) {
		var queries = [];

		if (gs.hasRole('u_ci_manage_by_editor')) {
			var groupIds = getManagedGroupIds(userSysId);
			if (groupIds.length) queries.push(orEqual('managed_by', groupIds));
			queries.push('managed_byISEMPTY');
		} else if (gs.hasRole('u_ci_department_editor') || gs.hasRole('u_ci_department_read_only')) {
			var deptChain = getDeptChain(userSysId);
			if (deptChain.length) queries.push(orEqual('department', deptChain));
			queries.push('departmentISEMPTY');
		}

		return unique(queries);
	}

	// ---------------- CSDM CLASS MAPPING ----------------

	var CSDM_CLASS_MAP = {
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

	function buildCSDMLayerQuery(sysClass, userSysId) {
		// ไม่มี role → ไม่มีสิทธิ์
		if (!(gs.hasRole('u_csdm_owner_read') || gs.hasRole('u_csdm_owner_editor'))) return [];

		var deptChain = getDeptChain(userSysId);
		if (!deptChain.length) return [];

		var fields = CSDM_CLASS_MAP[sysClass];
		if (!fields) return [];

		var queries = fields
			.map(function (field) {
				return orEqual(field, deptChain);
			})
			.filter(Boolean);

		return unique(queries);
	}

	// ---------------- MAIN ----------------

	var userSysId = gs.getUserID();
	if (!userSysId) return;

	var sysClass = current.getTableName();

	var finalParts = []
		.concat(buildCILayerQuery(userSysId))
		.concat(buildCSDMLayerQuery(sysClass, userSysId))
		.filter(Boolean);

	if (finalParts.length) current.addEncodedQuery(finalParts.join('^OR'));

	gs.info(
		'[BR] CMDB Visibility' +
			'\nTable : ' +
			sysClass +
			'\nUser : ' +
			userSysId +
			' (' +
			gs.getUserName() +
			')' +
			'\nFinal Query : ' +
			current.getEncodedQuery(),
	);
})(current, previous);
