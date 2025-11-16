var activities = "34dbf0c8933ededc1b43b27efaba1095";
var budgetHolderId = "b332de60930e9614c111316efaba1079";

getSINCategoryQuery(activities, budgetHolderId);

function getSINCategoryQuery(activityName, budgetHolderId) {

	// --- STEP 1: หา SIN Category จาก Activity ---
	var grAct = new GlideRecord('u_ist_support_activities');
	grAct.addQuery('u_activities_name', activityName);
	grAct.query();

	var sinList = [];
	if (grAct.next()) {
		if (grAct.u_sin_category) {
			sinList = (grAct.u_sin_category + "").split(',');
		}
	}

	if (sinList.length === 0) {
		gs.info("[SIN] No SIN Category found for: " + activityName);
		return "sys_id=null";
	}


	// --- STEP 2: หา Category ที่ budget holder ใช้ได้ ---
	var grMap = new GlideRecord('u_map_master_item_holder');
	grMap.addEncodedQuery("u_budget_holder.u_budget_holder=" + budgetHolderId + " ^u_category=" + sinList.join(','));
	grMap.query();

	var categories = [];
	while (grMap.next()) {
		if (grMap.u_category) {
			categories.push(grMap.u_category.toString());
		}
	}

	if (categories.length === 0) {
		gs.info("[MAP] No mapped categories for budget holder.");
		return "sys_id=null";
	}

	console.log("sys_idIN : " + categories.join(','));
	return "sys_idIN" + categories.join(',');
}

getSINSubCategoryQuery(activities, budgetHolderId);
function getSINSubCategoryQuery(activityName, budgetHolderId) {
	// --- STEP 1: หา SIN Sub Category จาก Activity ---
	var grAct = new GlideRecord('u_ist_support_activities');
	grAct.addQuery('u_activities_name', activityName);
	grAct.query();

	var sinSubList = [];
	if (grAct.next()) {
		if (grAct.u_sin_sub_category) {
			sinSubList = (grAct.u_sin_sub_category + '').split(',');
		}
	}

	if (sinSubList.length === 0) {
		gs.info('[Sub-SIN] No SIN Sub Category found for: ' + activityName);
		return 'sys_id=null';
	}

	// --- STEP 2: หา SubCategory ที่ Budget Holder ใช้ได้ ---
	var grMap = new GlideRecord('u_map_master_item_holder');
	console.log("sinSubList.join(',') " + sinSubList.join(','));
	grMap.addEncodedQuery("u_budget_holder.u_budget_holder=" + budgetHolderId + " ^u_subcategory=" + sinSubList.join(','));
	grMap.query();

	var mappedSub = [];
	while (grMap.next()) {
		if (grMap.u_subcategory) {
			mappedSub.push(grMap.u_subcategory.toString());
		}
	}

	if (mappedSub.length === 0) {
		gs.info('[MAP] No mapped sub-category for budget holder.');
		return 'sys_id=null';
	}

	return 'sys_idIN' + mappedSub.join(',');
}
