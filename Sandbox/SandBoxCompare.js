(function executeRule(current, previous /* null when async */) {
	// Configuration
	var safetyLimit = 20;

	// Helpers
	function getDeptChain(userSysId) {
		var dept = [];
		var nextUser = userSysId;
		var guard = safetyLimit;

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

	function buildQuery(field, values) {
		var parts = [field + 'ISEMPTY'];
		if (values && values.length > 0) {
			parts.push(field + '.sys_idIN' + values.join(','));
		}
		return parts.join('^OR');
	}

	// Build CSDM Query
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
		if (!fields) return null;

		var parts = [];
		for (var i = 0; i < fields.length; i++) {
			parts.push(buildQuery(fields[i], deptChain));
		}
		return parts.join('^OR');
	}

	// Main
	var userSysId = gs.getUserID();
	if (!userSysId) return;

	var sysClass = current.getTableName();
	var queries = [];

	// CI layer
	if (gs.hasRole('u_ci_manage_by_editor')) {
		var groupIds = getManagedGroupIds(userSysId);
		queries.push(buildQuery('managed_by', groupIds));
	} else if (gs.hasRole('u_ci_department_editor') || gs.hasRole('u_ci_department_read_only')) {
		var deptChain = getDeptChain(userSysId);
		queries.push(buildQuery('department', deptChain));
	}

	// ----- CSDM OWNER LAYER -----
	if (gs.hasRole('u_csdm_owner_read') || gs.hasRole('u_csdm_owner_editor')) {
		var deptChain2 = getDeptChain(userSysId);
		var csdmQuery = buildCsdmQueryByClass(sysClass, deptChain2);

		if (csdmQuery) {
			queries.push(csdmQuery);
		}
	}

	// Apply final query
	current.addEncodedQuery(queries.length > 0 ? queries.join('^OR') : 'departmentISEMPTY');

	gs.info(
		'[BR] CMDB Visibility' +
			'\nTable : ' +
			current.getTableName() +
			'\nUser : ' +
			userSysId +
			// '\nQueries : ' + JSON.stringify(queries) +
			'\nFinal EncodedQuery : ' +
			current.getEncodedQuery(),
	);
})(current, previous);
