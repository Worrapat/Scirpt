//#region Constants & Config
const STATE = 'new';
const REQUEST_TYPE = 'create';
const PLATFORM = 'cart';
const INGEGRATION_TYPE = 'inbound';
const REST_MES_ID = 'c95dc67847287e109906e83a216d438b'; // CART Integration
const HTTP_METHODS_ID = 'a1926ef89328fa1078b0b9ddfaba10dd'; // listApplicationName
const MAX_RETRY = 3;
const HEADERS = JSON.parse(gs.getProperty('cart_request_header'));
const REQUEST_BODY = JSON.parse(gs.getProperty('cart_req_body'));
// Generate current date/time
var gdt = new GlideDateTime();
var currentDate = gdt.getDisplayValue(); // format: "YYYY-MM-DD HH:mm:ss"
// Add currentDate into REQUEST_BODY
REQUEST_BODY.requestDate = currentDate;
// gs.info('Updated REQUEST_BODY: ' + JSON.stringify(REQUEST_BODY));
// #endregion

//#region Utility Functions
function updateIntegrationState(recordID, state, retryCount, inc_logger) {
	if (!recordID) return;
	const gr = new GlideRecord('u_web_interceptor_config');
	if (gr.get(recordID)) {
		if (retryCount !== undefined) gr.u_retry_count = retryCount;
		gr.u_state = state;
		gr.u_logger_record = inc_logger;
		gr.update();
	}
}

/**
 * Execute REST API call with retry and logging
 */
function executeAPIRequest(actionName, arrayKey, recordID) {
	let attempt = 0;
	let lastError = null;

	while (attempt < MAX_RETRY) {
		try {
			attempt++;
			updateIntegrationState(recordID, 'processing', attempt - 1);

			const r = new sn_ws.RESTMessageV2('CART Integration', actionName);
			Object.keys(HEADERS).forEach((h) => r.setRequestHeader(h, HEADERS[h]));
			r.setRequestBody(JSON.stringify(REQUEST_BODY));

			const response = r.execute();
			const status = response.getStatusCode();
			const body = response.getBody();

			if (status === 200) {
				const parsed = JSON.parse(body || '{}');
				const dataArray = parsed[arrayKey] || [];
				const count = Array.isArray(dataArray) ? dataArray.length : 0;

				var logRecord = new IntegrationUtility().createLogResponse(
					response,
					`[CART] ${actionName} completed successfully. Returned ${count} record(s).`,
					recordID,
				);

				updateIntegrationState(recordID, 'completed', attempt - 1, logRecord);
				return dataArray;

				// Test 1 Record
				// const parsed = JSON.parse(body || "{}");
				// const dataArray = parsed[arrayKey] || [];
				// const normalizedData = Array.isArray(dataArray) ? dataArray : [dataArray];
				// const limitedData = normalizedData.slice(0, 1); // Limit only 1 record

				// gs.info("limitedData : " + JSON.stringify(limitedData));

				// var logRecord = new IntegrationUtility().createLogResponse(response, `[CART] ${actionName} completed successfully. Returned ${limitedData.length} record(s).`, recordID);

				// updateIntegrationState(recordID, 'completed', attempt - 1, logRecord);
				// return limitedData;
			}

			lastError = `[Attempt ${attempt}] HTTP ${status}`;
			// gs.warn(`[CART] ${actionName} failed attempt ${attempt}: ${status}`);
		} catch (err) {
			lastError = `[Attempt ${attempt}] ${err.message}`;
			new IntegrationUtility().createLogResponse(
				{ statusCode: '500', statusMessage: err.message },
				err,
				recordID,
			);
			// gs.error(`[CART] ${actionName} error attempt ${attempt}: ${err.message}`);
		}

		// ถ้าไม่สำเร็จ ให้พักก่อน retry รอบต่อไป
		if (attempt < MAX_RETRY) gs.sleep(2000);
	}

	updateIntegrationState(recordID, 'failed', MAX_RETRY);
	new IntegrationUtility().createLogResponse(
		{ statusCode: '500', statusMessage: lastError || 'Unknown error after retries' },
		lastError,
		recordID,
	);
	return [];
}

//#region Main Process
(function main() {
	const recordID = new IntegrationUtility().createWebInterceptor(
		STATE,
		REQUEST_TYPE,
		PLATFORM,
		INGEGRATION_TYPE,
		REST_MES_ID,
		HTTP_METHODS_ID,
	);

	const appList = executeAPIRequest('listApplicationName', 'applicationName', recordID);

	// gs.info('[DEBUG] Data returned from API: ' + JSON.stringify(appList));

	if (!Array.isArray(appList) || appList.length === 0) {
		// gs.warn('[CART] No data returned, skip CSV attachment.');
		updateIntegrationState(recordID, 'failed');
		return;
	}

	new CARTIntegrationHelper().attachDataToSource(data_source.sys_id, appList, recordID);
	updateIntegrationState(recordID, 'completed');
})();
//#endregion
