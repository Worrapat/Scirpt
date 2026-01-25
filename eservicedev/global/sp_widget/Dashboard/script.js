(function () {
	data.categories = [];
	data.series = [];

	var table = options.table;
	var groupBy = options.group_by;
	var dateField = options.date_field;
	var interval = options.interval;
	var query = options.encoded_query;

	if (!table || !groupBy || !dateField) return;

	var ga = new GlideAggregate(table);
	ga.addAggregate('COUNT');
	ga.groupBy(groupBy);
	ga.addTrend(dateField, interval);

	if (query) ga.addEncodedQuery(query);

	ga.query();

	var buckets = [];
	var matrix = {};

	while (ga.next()) {
		var groupValue = ga.getDisplayValue(groupBy);
		var time = ga.getValue('timeref');
		var count = parseInt(ga.getAggregate('COUNT'), 10);

		if (buckets.indexOf(time) === -1) buckets.push(time);

		if (!matrix[groupValue]) matrix[groupValue] = {};

		matrix[groupValue][time] = count;
	}

	data.categories = buckets.sort();

	for (var key in matrix) {
		var row = { name: key, data: [] };
		data.categories.forEach(function (b) {
			row.data.push(matrix[key][b] || 0);
		});
		data.series.push(row);
	}
})();
