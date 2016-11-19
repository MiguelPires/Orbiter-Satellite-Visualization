var dataset;
var workingDataset = new Array();
var eventDispatcher = d3.dispatch("launchVehicleEnter");
var selectedBar, selectedCircle;

eventDispatcher.on("launchVehicleEnter", function(lauchVehicle){
	if (selectedBar != null) {
		selectedBar.attr("fill", "purple");
	}

	selectedBar = d3.select("rect[title=\'"+lauchVehicle[0]+"\']");
	selectedBar.attr("fill", "red");
});

d3.csv("data.csv", function (data) {
	dataset = data;
	workingDataset = dataset;

	gen_bars();
	gen_map();
	gen_timeline();
});

function gen_bars() {
	var w = 400;
	var h = 300;
	var numberOfBars = 6;
	var svg = d3.select("#bar_chart")
	.append("svg")
	.attr("width",w)
	.attr("height",h);

	var launchVehicles = new Array();
	workingDataset.forEach(function(d){
		launchVehicles.push(d["Launch Vehicle"]);
	});

	// generates a associative array with counts for each vehicle
	vehicleCount = vehicleOccurrence(launchVehicles);
	// sorts the array by decreasing order of value	
	sortedVehicleCount = sortAssociativeArray(vehicleCount);

	var padding = 30;
	var bar_w = 10;

	var hscale = d3.scale.linear()
	//the maximum number is increased in 25 to allow some breathing room
	.domain([sortedVehicleCount[0][1] + 25,0])
	.range([padding,h-padding]);

	var xscale = d3.scale.linear()
	.domain([0, numberOfBars-1])
	.range([padding,w-padding]);

	var yaxis = d3.svg.axis().orient("left")	
	.scale(hscale);

	var xaxis = d3.svg.axis().orient("bottom")
	.scale(d3.scale.linear()
		.domain([sortedVehicleCount[0][0],sortedVehicleCount[numberOfBars-1][0]])
		.range([padding+bar_w/2,w-padding-bar_w/2]))
	.tickFormat(function(d) {return d[0];})
	.ticks(numberOfBars-1);
	//.ticks(20);

	svg.append("g")
	.attr("transform","translate(30,0)")
	.attr("class","y axis")
	.call(yaxis);

	svg.append("g")
	.attr("transform","translate(0," + (h-padding) + ")")
	.call(xaxis);

	svg.selectAll("rect")
	.data(sortedVehicleCount.slice(0, numberOfBars-1))
	.enter().append("rect")
	.attr("width",Math.floor((w-padding*3)/numberOfBars)-1)
	.attr("height",function(d) {
		return h-padding-hscale(d[1]);
	})
	.attr("fill","purple")
	.attr("x",function(d, i) {
		return xscale(i);
	})
	.attr("y",function(d) {
		return hscale(d[1]);
	})
	.attr("title", function(d) {return d[0];})
	.on("mouseover", function(d) {
		eventDispatcher.launchVehicleEnter(d, d);
	});
}

function gen_map() {
	var countries = new Array();

	workingDataset.forEach(function(d){
		countries.push(d["Country of Owner"]);
	});
	countryCount = countryOccurrence(countries);
	sortedCountryCount = sortAssociativeArray(countryCount);

	var paletteScale = d3.scale.linear()
	.domain([0,sortedCountryCount[0][1]])
			.range(["#95b7ed","#0642a3"]); // blue range

			var dataset = {};
			Object.keys(countryCount).forEach(function(country){
				var countryValue;
				countryValue = countryCount[country];

				code = countryCodePairs[country];
		dataset[code] = { value : countryValue, fillColor: paletteScale(countryValue)};
	});

	var map = new Datamap({
		element: document.getElementById('map'),
		data: dataset,
		scope: 'world', //currently supports 'usa' and 'world', however with custom map data you can specify your own
	  //  setProjection: setProjection, //returns a d3 path and projection functions
		projection: 'equirectangular', //style of projection to be used. try "mercator"
		height: null, //if not null, datamaps will grab the height of 'element'
		width: null, //if not null, datamaps will grab the width of 'element'
		responsive: false, //if true, call `resize()` on the map object when it should adjust it's size
		done: function() {}, //callback when the map is done drawing
		fills: {
		  defaultFill: 'gray' //the keys in this object map to the "fillKey" of [data] or [bubbles]
	  },
	  geographyConfig: {
			dataUrl: null, //if not null, datamaps will fetch the map JSON (currently only supports topojson)
			hideAntarctica: true,
			borderWidth: 0.5,
			borderOpacity: 1,
			borderColor: '#FDFDFD',
			popupTemplate: function(geography, data) { //this function should just return a string
				return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
			},
			popupOnHover: true, //disable the popup while hovering
			highlightOnHover: true,
			highlightFillColor: '#FC8D59',
			highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
			highlightBorderWidth: 2,
			highlightBorderOpacity: 1
		},
		bubblesConfig: {
			borderWidth: 2,
			borderOpacity: 1,
			borderColor: '#FFFFFF',
			popupOnHover: true,
			radius: null,
			popupTemplate: function(geography, data) {
				return '<div class="hoverinfo"><strong>' + data.name + '</strong></div>';
			},
			fillOpacity: 0.75,
			animate: true,
			highlightOnHover: true,
			highlightFillColor: '#FC8D59',
			highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
			highlightBorderWidth: 2,
			highlightBorderOpacity: 1,
			highlightFillOpacity: 0.85,
			exitDelay: 100,
			key: JSON.stringify
		},
		arcConfig: {
			strokeColor: '#DD1C77',
			strokeWidth: 1,
			arcSharpness: 1,
			animationSpeed: 600
		}
	});

	gen_bubbles(map);

	// Draw a legend for this map
	map.legend();
}

function gen_bubbles (map) {
	var dataset = {};
	var launchSites = Array();
	var mostOccurrences = 0;

	// gather dataset for bubbles
	workingDataset.forEach(function(item){
		var launchSite = item["Launch Site"];

		if (launchSites.hasOwnProperty(launchSite)){
			launchSites[launchSite].occurrences += 1;

			// mostOccurrences for bubble normalization
			if (launchSites[launchSite].occurrences > mostOccurrences) {
				mostOccurrences = launchSites[launchSite].occurrences;
			}
		} else {
			code = countryCodePairs[item["Country of Owner"]];
			coordinates = item["Coordinates"].split(";");
			launchSites[launchSite] = {name: launchSite, occurrences: 1, latitude: coordinates[0], longitude: coordinates[1]};
		}	
	});

	// normalize bubble size
	Object.keys(launchSites).forEach(function(site) {
		launchSites[site].radius = launchSites[site].occurrences * 50 / mostOccurrences;
	})

	// draw bubbles
	map.bubbles(Object.values(launchSites), 
	{
		popupTemplate: function(geo, data) {
			return '<div class="hoverinfo"> <b>Site name  </b>' + data.name + '<br> <b>Number of launches  </b>' + data.occurrences + ''
		}
	});
}

function gen_timeline(){
	var w = 800; 
	var h = 100;

	var dates = new Array();
	workingDataset.forEach(function(d) {
		dateText = d["Date of Launch"];
		dateParts = dateText.split("-");
		
		var year = dateParts[2] > 20 ? "19"+dateParts[2] : "20"+dateParts[2];
		var date = new Date(year, dateParts[1], dateParts[0]);
		dates.push(date);
	});

	dates.sort(function(a, b){
		return a - b;
	});

	var svg = d3.select("#timeline")
	.append("svg")
	.attr("width",w)
	.attr("height",h);

	var margin = {top: 20, right: 20, bottom: 30, left: 50};
	var width = +svg.attr("width") - margin.left - margin.right;
	var height = +svg.attr("height") - margin.top - margin.bottom;
	var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var parseTime = d3.time.format("%d-%B-%y");

	var x = d3.time.scale()
		.domain([dates[0], dates[dates.length-1]])
		.rangeRound([0, width]);

	var y = d3.scale.linear()
		.rangeRound([height, 0]);

	var line = d3.svg.line()
		.x(function(d) { console.log("In: " + d +"; Out: " + x(d)); return x(d); })
		.y(function(d, i) { console.log(y(i+1)); return y(i+1); });

	//console.log(dates);

	x.domain(d3.extent(dates, function(d) { return d; }));
	y.domain(d3.extent(dates, function(d, i) { return i+1; }));
	g.append("g")
	.attr("class", "axis axis--x")
	.attr("transform", "translate(0," + height + ")")
	.call(d3.svg.axis().scale(x).orient("bottom"));

	g.append("g")
	.attr("class", "axis axis--y")
	.call(d3.svg.axis().scale(y).orient("left").ticks(4))
	.append("text")
	.attr("fill", "#000")
	//.attr("transform", "rotate(-90)")
	.attr("y", -8)
	.attr("x", -10)
	.attr("dx", "0.71em")
	.style("text-anchor", "end")
	.text("Launches");

	g.append("path")
	.datum(dates)
	.attr("class", "line")
	.attr("d", line);
}

// sorts an associative array in decreasing order of value
function sortAssociativeArray(assocArray) {
	var sortedCount = [];
	for (var key in assocArray) sortedCount.push([key, assocArray[key]]);
	return sortedCount.sort(function(a, b) {
		a = a[1];
		b = b[1];

		return a < b ? 1 : (a > b ? -1 : 0);
	});
}

function countryOccurrence(countryArray) {
	var countryCounter = new Object();
	countryArray.forEach(function(item){
		countries = item.split(/[/]+/);

		countries.forEach(function(country) {
			if (countryCounter.hasOwnProperty(country)){
				countryCounter[country] += 1;
			} else {
				countryCounter[country] = 1;
			}	
		});
	});

	return countryCounter;
}

function vehicleOccurrence(vehicleArray) {
	var vehicleCounter = new Object();
	vehicleArray.forEach(function(d){
		parts = d.split(/[\s\.\-/]+/);
		vehicleName = parts[0];

		if (vehicleName === "Long")
			vehicleName = "Long March";

		if (vehicleCounter.hasOwnProperty(vehicleName)){
			vehicleCounter[vehicleName] += 1;
		} else {
			vehicleCounter[vehicleName] = 1;
		}
	});

	return vehicleCounter;
}
