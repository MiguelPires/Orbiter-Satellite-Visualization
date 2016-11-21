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
//	test();
	gen_sunburst();
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
		.x(function(d) { /*console.log("In: " + d +"; Out: " + x(d));*/ return x(d); })
		.y(function(d, i) { /*console.log(y(i+1));*/ return y(i+1); });

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

function gen_sunburst() {

	var width = 960,
	    height = 700,
	    radius = Math.min(width, height) / 2;

	var x = d3.scale.linear()
	    .range([0, 2 * Math.PI]);

	var y = d3.scale.sqrt()
	    .range([0, radius]);

	var color = d3.scale.category20c();

	var svg = d3.select("body").append("svg")
	    .attr("width", width)
	    .attr("height", height)
	  .append("g")
	    .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

	var partition = d3.layout.partition()
	    .sort(null)
	    .value(function(d) { return d.size; });

	var arc = d3.svg.arc()
	    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
	    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
	    .innerRadius(function(d) { return Math.max(0, y(d.y)); })
	    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

	// Keep track of the node that is currently being displayed as the root.
	var usersJson = {};
	usersJson.name = "users";
	usersJson.children = [];
	workingDataset.forEach(function(d) {
		var userText = d["Users"];
		var users = userText.split("/");
		var purposeText = d["Purpose"];
		var purposes = purposeText.split("/");
		
		users.forEach(function(user){
			var foundUser = false;
			for(i = 0; i < usersJson.children.length; ++i) {
				if (usersJson.children[i].name === user) {
					foundUser = true;
					
					purposes.forEach( function(purpose) {
						var foundPurpose = false;
						for(j = 0; j < usersJson.children[i].children.length; ++j) {
							if (usersJson.children[i].children[j].name === purpose) {
								usersJson.children[i].children[j].size++;
								
								foundPurpose = true;
							}
						}

						if (!foundPurpose) {
							usersJson.children[i].children.push({name: purpose, size: 1});
						}
					});
				}
			}

			if (!foundUser) {
				usersJson.children.push({name: user, children : []});
				
				for(var j = 0; j < usersJson.children.length; j++){
					if (usersJson.children[j].name === user){
						purposes.forEach( function(purpose) {
							usersJson.children[j].children.push({name: purpose, size: 1});
						});	
					}
				}
			}
		});
	});
	
	console.log(JSON.stringify(usersJson));

	// trocar isto para os nossos dados e po-los em json
	var node = usersJson;
	  var g = svg.selectAll("g")
      .data(partition.nodes(node))
    .enter().append("g");

	var path = svg.datum(node).selectAll("path")
	  .data(partition.nodes)
	.enter().append("path")
	  .attr("d", arc)
      .style("fill", function(d) { /*console.log((d.children ? d : d).name); */return color((d.children ? d : d).name); })
	  .on("click", click)
	  .each(stash);

 	var text = g.append("text")
	    .attr("transform", function(d) { return "rotate(" + computeTextRotation(d) + ")"; })
	    .attr("x", function(d) { return y(d.y); })
	    .attr("dx", "6") // margin
	    .attr("dy", ".35em") // vertical-align
	    .text(function(d) { console.log("Name: "+d.name);return d.name; });

	d3.selectAll("input").on("change", function change() {
	var value = this.value === "count"
	    ? function() { return 1; }
	    : function(d) { return d.size; };

	path
	    .data(partition.value(value).nodes)
	  .transition()
	    .duration(1000)
	    .attrTween("d", arcTweenData);
	});


	function click(d) {
		node = d;
		path.transition()
		  .duration(1000)
		  .attrTween("d", arcTweenZoom(d));
	}

	d3.select(self.frameElement).style("height", height + "px");

	function computeTextRotation(d) {
  		return (x(d.x + d.dx / 2) - Math.PI / 2) / Math.PI * 180;
	}

	// Setup for switching data: stash the old values for transition.
	function stash(d) {
	  d.x0 = d.x;
	  d.dx0 = d.dx;
	}

	// When switching data: interpolate the arcs in data space.
	function arcTweenData(a, i) {
	  var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
	  function tween(t) {
	    var b = oi(t);
	    a.x0 = b.x;
	    a.dx0 = b.dx;
	    return arc(b);
	  }
	  if (i == 0) {
	   // If we are on the first arc, adjust the x domain to match the root node
	   // at the current zoom level. (We only need to do this once.)
	    var xd = d3.interpolate(x.domain(), [node.x, node.x + node.dx]);
	    return function(t) {
	      x.domain(xd(t));
	      return tween(t);
	    };
	  } else {
	    return tween;
	  }
	}

	// When zooming: interpolate the scales.
	function arcTweenZoom(d) {
	  var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
	      yd = d3.interpolate(y.domain(), [d.y, 1]),
	      yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
	  return function(d, i) {
	    return i
	        ? function(t) { return arc(d); }
	        : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
	  };
	}
}


/*
function test(){
	var random = d3.random.normal(0, 0.2),
    sqrt3 = Math.sqrt(3),
    points0 = d3.range(300).map(function() { return [random() + sqrt3, random() + 1, 0]; }),
    points1 = d3.range(300).map(function() { return [random() - sqrt3, random() + 1, 1]; }),
    points2 = d3.range(300).map(function() { return [random(), random() - 1, 2]; }),
    points = d3.merge([points0, points1, points2]);

    var width = 960;
    var height = 600;
	var svg = d3.select("#test")
	.append("svg")
	.attr("width",width)
	.attr("height",height);

	var k = height / width,
	    x0 = [-4.5, 4.5],
	    y0 = [-4.5 * k, 4.5 * k],
	    x = d3.scale.linear().domain(x0).range([0, width]),
	    y = d3.scale.linear().domain(y0).range([height, 0]),
	    z = d3.scale.ordinal(d3.schemeCategory10);

	var xAxis = d3.svg.axis().scale(x).orient("top").ticks(12),
	    yAxis = d3.svg.axis().scale(y).orient("right").ticks(12 * height / width);

var brush = d3.svg.brush()
    .extent([[0, 0], [width, height]])
    .x(x)
    .on("brush", brushed);

	//var brush = d3.svg.brush().on("end", brushended);
	var idleTimeout;
	var idleDelay = 350;

	svg.selectAll("circle")
	  .data(points)
	  .enter().append("circle")
	    .attr("cx", function(d) { return x(d[0]); })
	    .attr("cy", function(d) { return y(d[1]); })
	    .attr("r", 2.5)
	    .attr("fill", function(d) { return z(d[2]); });

	svg.append("g")
	    .attr("class", "axis axis--x")
	    .attr("transform", "translate(0," + (height - 10) + ")")
	    .call(xAxis);

	svg.append("g")
	    .attr("class", "axis axis--y")
	    .attr("transform", "translate(10,0)")
	    .call(yAxis);

	svg.selectAll(".domain")
	    .style("display", "none");

	svg.append("g")
	    .attr("class", "brush")
	    .call(brush);

	function brushended() {
	  var s = d3.event.selection;
	  if (!s) {
	    if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
	    x.domain(x0);
	    y.domain(y0);
	  } else {
	    x.domain([s[0][0], s[1][0]].map(x.invert, x));
	    y.domain([s[1][1], s[0][1]].map(y.invert, y));
	    svg.select(".brush").call(brush.move, null);
	  }
	  zoom();
	}

	function idled() {
	  idleTimeout = null;
	}

	function zoom() {
	  var t = svg.transition().duration(750);
	  svg.select(".axis--x").transition(t).call(xAxis);
	  svg.select(".axis--y").transition(t).call(yAxis);
	  svg.selectAll("circle").transition(t)
	      .attr("cx", function(d) { return x(d[0]); })
	      .attr("cy", function(d) { return y(d[1]); });
	}
}
function brushed() {
  x.domain(brush.empty() ? x2.domain() : brush.extent());
  focus.select(".x.axis").call(xAxis);
  mydots.selectAll(".circle")
   .attr("cx", xMap)
   .attr("cy", yMap);
  console.log(brush.extent())
}
*/
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
