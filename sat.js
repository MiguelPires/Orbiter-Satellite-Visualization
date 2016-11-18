
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

/*eventDispatcher.on("launchVehicleEnter.scatterplot", function(lauchVehicle){
	if (selectedCircle != null) {
		selectedCircle.attr("fill", "purple");
	}

	selectedCircle = d3.select("circle[title=\'"+lauchVehicle[0]+"\']");
	selectedCircle.attr("fill", "red");
});*/

d3.csv("data.csv", function (data)  {
	/*data.forEach(function(d){
	console.log(d["Name of Satellite, Alternate Names"]);
})*/
	dataset = data;
	workingDataset = dataset;

	gen_bars();
	gen_map();
	gen_scatterplot();

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

	// generates a hash tables with counts for each vehicle
	vehicleCount = vehicleOccurrence(launchVehicles);

	// sorts the tuples in decreasing order of value
	var sortedVehicleCount = [];
	for (var key in vehicleCount) sortedVehicleCount.push([key, vehicleCount[key]]);
	sortedVehicleCount = sortedVehicleCount.sort(function(a, b) {
	    a = a[1];
	    b = b[1];

	    return a < b ? 1 : (a > b ? -1 : 0);
	});
	//console.log(sortedVehicleCount);

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

function vehicleOccurrence(vehicleArray) {
	var vehicleCounter = new Object();
	vehicleArray.forEach(function(d){
		parts = d.split(/[\s\.\-/]+/);
		vehicleName = parts[0];

		if (vehicleName === "Long")
			vehicleName = "Long March";

		//console.log("FIRST: "+vehicleName);
		if (vehicleCounter.hasOwnProperty(vehicleName)){
			vehicleCounter[vehicleName] += 1;
		} else {
			vehicleCounter[vehicleName] = 1;
		}
	});

	return vehicleCounter;
}

function gen_map() {
	//var map = new d3.geoMercator();
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

function gen_scatterplot() {
	/*var w = 600;
	var h = 300;

	var svg = d3.select("#the_chart")
	.append("svg")
	.attr("width",w)
	.attr("height",h)
	.attr("fill", "blue");


	var padding = 30;
	var bar_w = 15;
	var r = 5;

	var hscale = d3.scaleLinear()
	.domain([10,0])
	.range([padding,h-padding]);

	var xscale = d3.scaleLinear()
	.domain([0.5,d3.max(dataset, function(d) {
		return d.budget;})/1000000])
		.range([padding,w-padding]);

		var yaxis = d3.axisLeft()
		.scale(hscale);

		var xaxis = d3.axisBottom()
		.scale(xscale)
		.ticks(dataset.length/2);

		var cscale = d3.scaleLinear()
		.domain([d3.min(dataset, function(d) { return  d.year;}),
			d3.max(dataset, function(d) { return d.year;})])
			.range(["red", "blue"]);


			gY = svg.append("g")
			.attr("transform","translate(30,0)")
			.attr("class","y axis")
			.call(yaxis);


			gX = svg.append("g")
			.attr("transform","translate(0," + (h-padding) + ")")
			.call(xaxis);

			svg.selectAll("circle")
			.data(dataset)
			.enter().append("circle")
			.attr("r",r)
			.attr("fill","purple")
			.attr("cx",function(d, i) {
				if (d.budget_adj == 0) {return padding;}
				return  xscale(d.budget_adj/1000000);
			})
			.attr("cy",function(d) {
				return hscale(d.rating);
			})
			.attr("title", function(d) {return d.title;})
			.on("mouseover", function(d) {
				dispatch.call("launchVehicleEnter", d, d);
			});




*/

		}
