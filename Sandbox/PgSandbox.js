var IntegrationUtility = Class.create();
IntegrationUtility.prototype = {
	initialize: function () { },

	/**
	 * Create web interceptor record
	 * @param {Object} payload - Configuration object
	 * @return {String} sys_id of created record
	 */
	createWebInterceptor: function (payload) {
		var gr = new GlideRecord('u_web_interceptor_config');
		gr.initialize();

		for (var field in payload) {
			if (
				payload.hasOwnProperty(field) &&
				payload[field] !== undefined &&
				payload[field] !== null
			) {
				gr.setValue(field, payload[field]);
			}
		}

		var sysId = gr.insert();
		return sysId;
	},

	/**
	 * Update state of web interceptor record
	 * @param {String} sysId - Record sys_id
	 * @param {String} state - New state value
	 * @param {Number} retryCount - Optional retry count
	 * @param {String} loggerSysId - Optional logger record sys_id
	 */
	updateState: function (sysId, state, retryCount, loggerSysId) {
		if (!sysId) return;

		var gr = new GlideRecord('u_web_interceptor_config');
		if (gr.get(sysId)) {
			gr.u_state = state;
			if (retryCount !== undefined) gr.u_retry_count = retryCount;
			if (loggerSysId) gr.u_logger_record = loggerSysId;
			gr.update();
		}
	},

	/**
	 * Creates a new INC Logger record for a REST integration response.
	 *
	 * @param {Object} response - The RESTMessageV2 response object (or simulated response).
	 * @param {String} message - Optional message or additional context to log.
	 * @param {String} recordID - The related Web Interceptor record sys_id.
	 * @returns {String} sys_id - The sys_id of the created log record.
	 */
	createLogResponse: function (response, message, recordID) {
		const logger = new GlideRecord('u_inc_logger');
		logger.initialize();

		const isRestResponse = response && typeof response.getStatusCode === 'function';

		const statusCode = isRestResponse ? response.getStatusCode() : response?.statusCode || 'N/A';
		const endpoint = isRestResponse ? response.getEndpoint() : response?.endpoint || '';
		const errorMsg = isRestResponse ? response.getErrorMessage() : response?.statusMessage || '';

		let body = '';
		if (isRestResponse) {
			body = response.getBody() || '';
		} else {
			body = JSON.stringify(response || {});
		}

		logger.u_integrated_record = recordID;
		
		logger.u_status_code = statusCode;
		logger.u_request_payload = endpoint || message;
		logger.u_response_payload = body;
		logger.u_error_message = errorMsg;

		return logger.insert();
	},

	Number LOG0003213
    Integrated Record WEBINT0001927
    Status Code N/A
    Request Payload No response for ECC message request with sysid=d295ab1b93aa3ed078b0b9ddfaba10a3 after waiting for 30 seconds in ECC Queue
    Response Payload {"statusMessage":"No response for ECC message request with sysid=d295ab1b93aa3ed078b0b9ddfaba10a3 after waiting for 30 seconds in ECC Queue"} 
	Error Message No response for ECC message request with sysid=d295ab1b93aa3ed078b0b9ddfaba10a3 after waiting for 30 seconds in ECC Queue


    เเก้ Status Code กับ Request Payload To Be 
    Status Code HTTP Status
    Request Payload End Point API


	type: 'IntegrationUtility',
};


executeAPIRequest: function (options) {
		var attempt = 0;
		var lastError;
		var util = new IntegrationUtility();

		this._injectRequestDate();

		while (attempt < this.MAX_RETRY) {
			attempt++;

			try {
				util.updateState(options.recordID, 'processing', attempt - 1);

				var r = new sn_ws.RESTMessageV2(options.restMessageName, options.actionName);
				this._applyHeaders(r);
				r.setRequestBody(JSON.stringify(this.REQUEST_BODY));

				var response = r.execute();
				var status = response.getStatusCode();

				if (status === 200) {
					var data = this._extractArray(response.getBody(), options.arrayKey);

					var logId = util.createLogResponse(
						response,
						`[CART] ${options.actionName} success (${data.length})`,
						options.recordID
					);

					util.updateState(options.recordID, 'completed', attempt - 1, logId);

					return { success: true, data: data };
				}

				util.createLogResponse(
					response,
					`[CART] ${options.actionName} failed (HTTP ${status})`,
					options.recordID
				);

				lastError = `HTTP ${status}`;


			} catch (e) {
				lastError = e.message;
				util.createLogResponse(
					{ statusCode: status, statusMessage: e.message },
					e.message,
					options.recordID
				);
			}

			if (attempt < this.MAX_RETRY) gs.sleep(2000);
		}

		util.updateState(options.recordID, 'failed', this.MAX_RETRY);
		util.log({
			type: 'FAILED',
			recordID: options.recordID,
			message: lastError,
		});

		return [];
	},

	/* ---------------- private helpers ---------------- */

	_applyHeaders: function (restMsg) {
		Object.keys(this.HEADERS).forEach(function (h) {
			restMsg.setRequestHeader(h, this.HEADERS[h]);
		}, this);
	},

	_extractArray: function (body, key) {
		var parsed = JSON.parse(body || '{}');
		var arr = parsed[key] || [];
		return Array.isArray(arr) ? arr : [arr];
	},

	_injectRequestDate: function () {
		this.REQUEST_BODY.requestDate = new GlideDateTime().getDisplayValue();
	},


    (function main() {

	const STATE = {
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
		HTTP_METHOD_ID: 'a1926ef89328fa1078b0b9ddfaba10dd',
		SCHEDULE_ID: '653efd02473c76509906e83a216d4397',
	};

	const util = new IntegrationUtility();
	const helper = new CARTIntegrationHelper();

	// 1. Create interceptor record
	const recordID = util.createWebInterceptor({
		u_state: STATE.NEW,
		u_request_type: CONFIG.REQUEST_TYPE,
		u_integration_platform: CONFIG.PLATFORM,
		u_integration_type: CONFIG.INTEGRATION_TYPE,
		u_rest_message: CONFIG.REST_MESSAGE_ID,
		u_http_method: CONFIG.HTTP_METHOD_ID,
		u_schedule: CONFIG.SCHEDULE_ID,
	});

	try {
		// 2. Call CART API ผ่าน Helper
		const appList = helper.executeAPIRequest({
			restMessageName: 'CART Integration',
			actionName: 'listApplicationName',
			arrayKey: 'applicationName',
			recordID: recordID,
		});

		if (!appList.success) {
			// ไม่ต้อง log อีก — log ไปแล้วใน helper
			util.updateState(recordID, STATE.FAILED);
			return;
		}

		if (appList.data.length === 0) {
			// business failure (optional log แบบ business)
			util.updateState(recordID, STATE.FAILED);
			return;
		}

		helper.attachDataToSource(data_source.sys_id, result.data, recordID);
		util.updateState(recordID, STATE.COMPLETED);

	} catch (ex) {
		util.createLogResponse(
			{ statusCode: '500', statusMessage: ex.message },
			ex.message,
			recordID
		);
		util.updateState(recordID, STATE.FAILED);
	}
})();
