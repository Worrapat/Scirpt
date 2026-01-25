(function main() {
	const INTEGRATION_STATE = {
		NEW: 'new',
		PROCESSING: 'processing',
		COMPLETED: 'completed',
		FAILED: 'failed',
	};

	const CONFIG = {
		REQUEST_TYPE: 'create',
		PLATFORM: 'cart',
		INTEGRATION_TYPE: 'inbound',
		REST_MESSAGE_ID: 'c95dc67847287e109906e83a216d438b',
		HTTP_METHOD_ID: 'a1926ef893ฟ28fa1078b0b9ddfaba10dd',
		SCHEDULE_ID: '653efd02473c76509906e83a216d4397',
		MAX_RETRY: 3,
	};

	var util = new IntegrationUtility();
	var helper = new CARTIntegrationHelper();

	var recordID = util.createWebInterceptor({
		u_state: INTEGRATION_STATE.NEW,
		u_request_type: CONFIG.REQUEST_TYPE,
		u_integration_platform: CONFIG.PLATFORM,
		u_integration_type: CONFIG.INTEGRATION_TYPE,
		u_rest_message: CONFIG.REST_MESSAGE_ID,
		u_http_method: CONFIG.HTTP_METHOD_ID,
		u_schedule: CONFIG.SCHEDULE_ID,
	});

	try {
		util.updateState(recordID, INTEGRATION_STATE.PROCESSING);

		var appList = helper.executeAPIRequest('listApplicationName', 'applicationName', recordID);

		if (!Array.isArray(appList) || appList.length === 0) {
			throw 'No application data returned';
		}

		helper.attachDataToSource(data_source.sys_id, appList, recordID);
		util.updateState(recordID, INTEGRATION_STATE.COMPLETED);
	} catch (ex) {
		util.updateState(recordID, INTEGRATION_STATE.FAILED);
		util.logResponse(null, ex.toString(), recordID);
		// gs.error('[CART Integration] ' + ex);
	}
});
