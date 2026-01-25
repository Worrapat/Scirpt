api.controller = function ($scope, $timeout) {
	var c = this;

	function render() {
		if (!c.data.series || !c.data.series.length) return;

		$timeout(function () {
			Highcharts.chart('incidentChart', {
				chart: { type: c.options.chart_type },
				title: { text: c.options.title },
				xAxis: { categories: c.data.categories },
				yAxis: { title: { text: 'Count' } },
				plotOptions: {
					series: { stacking: 'normal' },
				},
				series: c.data.series,
			});
		});
	}

	$scope.$watch('c.data.series', render, true);
};
