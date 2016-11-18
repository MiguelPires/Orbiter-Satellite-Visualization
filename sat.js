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
});

function gen_bars() {
	var w = 400;
	var h = 300;
	var numberOfBars = 6;
	var svg = d3.select("#the_chart")
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

	console.log(sortedCountryCount);

	var map = new Datamap({
        element: document.getElementById('map'),
        fills: {
            HIGH: '#afafaf',
            LOW: '#123456',
            MEDIUM: 'blue',
            UNKNOWN: 'rgb(0,0,0)',
            defaultFill: 'green'
        },
        data: {
            IRL: {
                fillKey: 'LOW',
                numberOfThings: 2002
            },
            USA: {
                fillKey: 'MEDIUM',
                numberOfThings: 10381
            }
        }
    });

    // Draw a legend for this map
    map.legend();
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
