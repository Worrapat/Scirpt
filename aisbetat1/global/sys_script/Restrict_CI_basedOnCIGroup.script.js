(function executeRule(current, previous /*null when async*/) {

	var userSysId = gs.getUserID();

	// ---------------------------------------------------------
	// Rule 1: Restrict CI based on CI Group (with Special Group Exception)
	// ---------------------------------------------------------
	var isSpecialGroup = false;
	var gr = new GlideRecord('sys_user_grmember');
	gr.addEncodedQuery("user=" + userSysId + "^group=550add7693157550ee66784e1dba109b^ORgroup=87e66d0e474539105c46b0d4116d4346^ORgroup=e85f59be93157550ee66784e1dba1053^ORgroup=537d113e93157550ee66784e1dba1020^ORgroup=c111a1f293557550ee66784e1dba10c4^ORgroup=a2e12d3693557550ee66784e1dba10f6^ORgroup.nameENDSWITHL1");
	gr.query();
	if (gr.next()) {
		// User is in a special group, skip Group-based restriction
	} else {
		var grpArray = '';
		var grm = new GlideRecord('sys_user_grmember');
		grm.addQuery('user', userSysId);
		grm.query();
		while (grm.next()) {
			grpArray = grpArray + ',' + grm.group;
		}
		if (current.getTableName() == "u_imported_r_files")/* for r_file table*/ {
			current.addEncodedQuery("u_ci_hostname.u_l2_support_group.sys_idIN" + grpArray.substring(1));
		}
		else {
			current.addEncodedQuery("u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^ORcmdb_ci.u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^ORnic.cmdb_ci.u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^ORcomputer.u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^ORhost.u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^ORu_l2_support_groupISEMPTY");
			// current.addEncodedQuery("u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^ORcmdb_ci.u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^OResx_server.u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^ORnic.cmdb_ci.u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^ORcomputer.u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^ORhost.u_l2_support_group.sys_idIN" + grpArray.substring(1) + "^ORu_l2_support_groupISEMPTY");
		}
		gs.log("Restrict_CI (EncodedQuery)" + current.getEncodedQuery());
		gs.log("Restrict_CI (Table) :  " + current.getTableName());
	}

	// ---------------------------------------------------------
	// Rule 2: Restrict based on Department
	// ---------------------------------------------------------
	var userDept = getUserDepartment(userSysId);

	if (!userDept) {
		current.addEncodedQuery("sys_idISEMPTY");
		return;
	}

	// --- Find parent + child department ---
	var relatedDepts = getParentAndChildDepartments(userDept);
	// gs.info("[BR] Related Departments: " + relatedDepts.join(", "));

	if (relatedDepts.length > 0) {

		// --- Create encoded query string ---
		var encodedQuery = relatedDepts
			.map(function (id) {
				return "u_comp_id.u_operation_department=" + id + "^ORu_comp_id.department=" + id;
			})
			.join("^OR");
		current.addEncodedQuery(encodedQuery);
		// gs.info("[BR] Query applied: " + encodedQuery);
	}

	// -----------------------
	//  Helper Functions 
	// -----------------------

	function getUserDepartment(userSysId) {
		var userGR = new GlideRecord("sys_user");
		if (userGR.get(userSysId)) {
			return userGR.department ? userGR.department.toString() : "";
		}
		return "";
	}

	function getParentAndChildDepartments(deptSysId) {
		var deptList = [];

		var deptGR = new GlideRecord("cmn_department");
		if (!deptGR.get(deptSysId)) return deptList;

		// Current dept
		deptList.push(deptGR.getUniqueValue());

		// Parent dept
		if (deptGR.parent) {
			deptList.push(deptGR.parent.toString());
		}

		// Child dept(s)
		var childGR = new GlideRecord("cmn_department");
		childGR.addQuery("parent", deptSysId);
		childGR.query();
		while (childGR.next()) {
			deptList.push(childGR.getUniqueValue());
		}

		return deptList;
	}

})(current, previous);
