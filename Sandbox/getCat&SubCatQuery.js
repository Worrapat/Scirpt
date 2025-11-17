var activities = '2ab4fd29db73e8507370622fd39619ea'; // Medical Expenses(CTR : C001H02019)
var budgetHolderId = 'b332de60930e9614c111316efaba1079'; // FFM/O 2025


getSINCategoryQuery(activities, budgetHolderId);

function getBudgetHoder(budgetHolderId) {
    var gr = new GlideRecord('u_istationery_budget_holder');
    gr.addQuery('sys_id', budgetHolderId);
    gr.query();a
    if(gr.next()) {
        return gr.u_budget_holder;
    } else {
        return budgetHolderId;
    }
}

function getSINCategoryQuery(activities, budgetHolderId) {
    var budgetHolder = getBudgetHoder(budgetHolderId);
    var sinCatList = [];

    // --- STEP 1: หา SIN Category จาก Activity ---
    var grUIA = new GlideRecord('u_ist_support_activities');
    if(grUIA.get(activities)) {
        gs.info('u_activities_name: ' + grUIA.getValue('u_activities_name'));
        gs.info('grUIA.u_sin_category: ' + grUIA.u_sin_category);
        if(grUIA.u_sin_category) {
            sinCatList = (grUIA.u_sin_category + '').split(',');
        }

        if(sinCatList.length === 0) {
            gs.info('[Cat-SIN] No SIN Category found for: ' + activityName);
            return 'sys_id=null';
        }
    }
    gs.info('sinCatList: ' + sinCatList);

    // --- STEP 2: หา Category ที่ budget holder ใช้ได้ ---
    var grMap = new GlideRecord('u_map_master_item_holder');
    grMap.addEncodedQuery('u_budget_holder=' + budgetHolder + '^u_category=' + sinCatList.join(','));
    grMap.query();
    var categories = [];
    while(grMap.next()) {
        if(grMap.u_category) {
            categories.push(grMap.u_category.toString());
            gs.info('categories - ' + categories.join(','));
            return 'sys_idIN' + categories.join(',');
        } else {
            gs.info('[MAP] No mapped categories for budget holder.');
            return 'sys_id=null';
        }
    }
}

getSINSubCategoryQuery(activities, budgetHolderId);

function getSINSubCategoryQuery(activityName, budgetHolderId) {
    var budgetHolder = getBudgetHoder(budgetHolderId);
    var sinSubList = [];

    // --- STEP 1: หา SIN Category จาก Activity ---
    var grUIA = new GlideRecord('u_ist_support_activities');
    if(grUIA.get(activityName)) {
        gs.info('u_activities_name: ' + grUIA.getValue('u_activities_name'));
        if(grUIA.u_sin_sub_category) {
            sinSubList = (grUIA.u_sin_sub_category + '').split(',');
        }

        if(sinSubList.length === 0) {
            gs.info('[Sub-SIN] No SIN Sub Category found for: ' + activityName);
            return 'sys_id=null';
        }
    }

    // --- STEP 2: หา Category ที่ budget holder ใช้ได้ ---
    var grMap = new GlideRecord('u_map_master_item_holder');
    grMap.addEncodedQuery(
        'u_budget_holder=' + budgetHolder + '^u_subcategory=' + sinSubList.join(','),
    );
    grMap.query();
    var subCategories = [];
    while(grMap.next()) {
        if(grMap.u_subcategory) {
            subCategories.push(grMap.u_subcategory.toString());
            gs.info('subCategories - ' + subCategories.join(','));
            return 'sys_idIN' + subCategories.join(',');
        } else {
            gs.info('[MAP] No mapped categories for budget holder.');
            return 'sys_id=null';
        }
    }
}
