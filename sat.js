var dataset;
var workingDataset = new Array();
var eventDispatcherIn = d3.dispatch("launchVehicleEnter");
var eventDispatcherOut = d3.dispatch("launchVehicleExit");

var selectedBar, selectedCircle;
var map;

eventDispatcherIn.on("launchVehicleEnter", function(lauchVehicle){
	selectedBar = d3.select("rect[title=\'"+lauchVehicle[0]+"\']");
	selectedBar.attr("fill", "#0642a3"); // same value as top range in map's saturation
});

eventDispatcherOut.on("launchVehicleExit", function(lauchVehicle){
	if (selectedBar != null) {
		selectedBar.attr("fill", "steelblue");
	}
});

d3.csv("data.csv", function (data) {
	dataset = data;
	workingDataset = dataset;

	gen_bars();
	gen_map();
	gen_timeline();
	gen_sunburst();
});

function gen_bars() {
	var w = parseInt(d3.select("#bar_chart").style("width"));
	var h = parseInt(d3.select("#bar_chart").style("height"));

	var numberOfBars = 6;
	var svg = d3.select("#bar_chart")
	.append("svg");

	svg.attr("width",w)
	.attr("height",h);

	var launchVehicles = new Array();
	workingDataset.forEach(function(d){
		launchVehicles.push(d["Launch Vehicle"]);
	});

	// generates a associative array with counts for each vehicle
	vehicleCount = vehicleOccurrence(launchVehicles);
	// sorts the array by decreasing order of value	
	sortedVehicleCount = sortAssociativeArray(vehicleCount);

	var padding = 35;
	var bar_w = -10;

	var hscale = d3.scale.linear()
	//the maximum number is increased in 25 to allow some breathing room
	.domain([sortedVehicleCount[0][1] + 25,0])
	.range([padding,h-padding]);

	var xscale = d3.scale.linear()
	.domain([0, numberOfBars-1])
	.range([padding,w-padding]);

	var yaxis = d3.svg.axis().orient("left")	
	.scale(hscale).ticks(4);

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

	// Define 'div' for tooltips
	var div = d3.select("body")
	.append("div")  // declare the tooltip div 
	.attr("class", "hoverinfo tooltip")              // apply the 'tooltip' class
	.style("opacity", 0);                  // set the opacity to nil

	svg.append("g").attr("id", "barContainer").selectAll("rect")
	.data(sortedVehicleCount.slice(0, numberOfBars-1))
	.enter().append("rect")
	.attr("width", function (d) {
		return Math.floor((w-padding*3)/numberOfBars)-1;})
	.attr("height",function(d) {
		return h-padding-hscale(d[1]);
	})
	.attr("fill","steelblue")
	.attr("x",function(d, i) {
		return xscale(i);
	})
	.attr("y",function(d) {
		return hscale(d[1]);
	})
	.attr("title", function(d) {return d[0];})
	.on("mouseover", function(d) {
		 div.transition()
				.duration(500)	
				.style("opacity", 0);

		div.transition()
			.duration(200)	
			.style("opacity", .9);	

		div.html('<b>Vehicle </b>'+d[0]+'<br><b>Launches </b> '+d[1])	 
			.style("left", (d3.event.pageX) + "px")			 
			.style("top", (d3.event.pageY - 28) + "px");
	
		eventDispatcherIn.launchVehicleEnter(d, d);
	}).on("mouseout", function(d) {
		div.transition()		
		.duration(500)		
		.style("opacity", 0);
		
		eventDispatcherOut.launchVehicleExit(d, d);
	}).select("#barContainer").append("text")
		.attr("opacity", 1.0)
		.attr("width", "50px")
		.attr("height", "70px")
		.attr("x", function(d, i) {
			return xscale(i);
		})
		.attr("y", function(d) {
			return hscale(i+1) + h-padding-hscale(i+1) + 30;
		})
		.text(function(d) {return i;})
		.style("font-size","18px");

	sortedVehicleCount.slice(0, numberOfBars-1).forEach( function(d, i) {

		svg.select("#barContainer").append("text")
		.attr("opacity", 1.0)
		.attr("x", xscale(i))
		.attr("y", hscale(i) + h-padding-hscale(i) + 30	)
		.text(d[0])
		.style("font-size","18px")
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

	var countriesDataset = {};
	Object.keys(countryCount).forEach(function(country){
		var countryValue = countryCount[country];
		code = countryCodePairs[country];
		countriesDataset[code] = { value : countryValue, fillColor: paletteScale(countryValue)};
	});

	map = new Datamap({
		element: document.getElementById('map'),
		data: countriesDataset,
		scope: 'world', //currently supports 'usa' and 'world', however with custom map data you can specify your own
	  //  setProjection: setProjection, //returns a d3 path and projection functions
		projection: 'equirectangular', //style of projection to be used. try "mercator"
		height: null, //if not null, datamaps will grab the height of 'element'
		width: null, //if not null, datamaps will grab the width of 'element'
		responsive: false, //if true, call `resize()` on the map object when it should adjust it's size
		done: function(geography) {
            geography.svg.selectAll('.datamaps-subunit').on('click', function(geography) {
	            workingDataset = dataset.filter( function(row) {

		  			console.log('country: ' + geography.properties.name + " -> " + countryNamePairs[geography.properties.name]);
		  		//	console.log('row: ' + row["Country of Owner"]);
		  			
		  			countries = row["Country of Owner"].split(/[/]+/);

					for (i = 0; i < countries.length; ++i) {
						if (countries[i] === countryNamePairs[geography.properties.name])
							return true;
					}

					return false;
	  			});

				if (workingDataset.length > 0) {
					gen_sunburst();
					update_map();
				}
            });
        }, //callback when the map is done drawing
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
				if (data != null && data != undefined && data.value != undefined)
					return '<div class="hoverinfo"><b>Country  </b>' + geography.properties.name + '<br><b>Launches </b> ' + data.value + '';
				else
					return '<div class="hoverinfo"><b>Country  </b>' + geography.properties.name + '<br><b>Launches </b> 0';
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
				return '<div class="hoverinfo"><b>Site name  </b>' + data.name + '<br><b>Launches </b> ' + data.occurrences + ''
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

	gen_bubbles();

	// Draw a legend for this map
	map.legend();
}

function update_map(){
	var countriesDataset = {};

	if (workingDataset.length > 0) {
		countries = [];
		workingDataset.forEach(function(d){
			countries.push(d["Country of Owner"]);
		});

		countryCount = countryOccurrence(countries);
		sortedCountryCount = sortAssociativeArray(countryCount);

		var paletteScale = d3.scale.linear()
			.domain([0,sortedCountryCount[0][1]])
			.range(["#95b7ed","#0642a3"]); // blue range

		Object.keys(countryCount).forEach(function(country){
			var countryValue = countryCount[country];
			code = countryCodePairs[country];
			countriesDataset[code] = { value : countryValue, fillColor: paletteScale(countryValue)};
		});					
	} 
	map.updateChoropleth(countriesDataset, {reset: true});
	gen_bubbles();
}

function gen_bubbles () {
	var launchSites = Array();

	// gather dataset for bubbles
	workingDataset.forEach(function(item){
		var launchSite = item["Launch Site"];

		if (launchSites.hasOwnProperty(launchSite)){
			launchSites[launchSite].occurrences += 1;
		} else {
			code = countryCodePairs[item["Country of Owner"]];
			coordinates = item["Coordinates"].split(";");
			launchSites[launchSite] = {name: launchSite, occurrences: 1, latitude: coordinates[0], longitude: coordinates[1]};
		}	
	});

	// normalize bubble size
	Object.keys(launchSites).forEach(function(site) {
		launchSites[site].radius = Math.round(Math.log(launchSites[site].occurrences))*5;
	});

	// draw bubbles
	map.bubbles(Object.values(launchSites));
}

function gen_timeline(){
	var w = d3.select("#map").select("svg").attr("width"); 
	var h = 200;

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

/*	var line = d3.svg.line()
		.x(function(d) { console.log("In: " + d +"; Out: " + x(d)); return x(d); })
		.y(function(d, i) { console.log(y(i+1)); return y(i+1); });*/

	var area = d3.svg.area()
	.interpolate("monotone")
	.x(function (d) { return x(d); })
	.y0(height)
	.y1(function (d, i) { return y(i+1); });

	x.domain(d3.extent(dates, function(d) { return d; }));
	y.domain(d3.extent(dates, function(d, i) { return i+1; }));
	g.append("g")
	.attr("class", "axis axis--x")
	.attr("transform", "translate(0," + height + ")")
	.call(d3.svg.axis().scale(x).orient("bottom"));

	var xAxis = d3.svg.axis().scale(y).orient("left").ticks(4);
	g.append("g")
	.attr("class", "axis axis--y")
	.call(xAxis)
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
	.attr("class", "area")
	.attr("d", area);

	/*g.append("path")
	.datum(dates)
	.attr("class", "line")
	.attr("d", line);*/

	var context = svg.append("g")
	.attr("class", "context")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var brush = d3.svg.brush()
	.x(x)
	.on("brush", brushed);

	context.append("g")
	.attr("class", "x brush")
	.call(brush)
	.selectAll("rect")
	.attr("y", -6)
	.attr("height", height + 7);

	context.selectAll(".extent")
		.append("a")
		.attr("class", "boxclose");

    function brushed() {
		if (!d3.event.sourceEvent) return; // Only transition after input.
	  	if (!brush.extent()) return; // Ignore empty selections.

	  	//FIX :  already changed the brush snapping settings and its not working
	  	var d0 = brush.extent().map(x.invert),
	  	d1 = d0.map(d3.time.year.round);

	  	var startYear = brush.extent()[0].getFullYear();
	  	var endYear = brush.extent()[1].getFullYear();

	  	workingDataset = dataset.filter( function(row) {
	  		dateText = row["Date of Launch"];
	  		dateParts = dateText.split("-");

	  		var year = dateParts[2] > 20 ? "19"+dateParts[2] : "20"+dateParts[2];

	  		if(year >= startYear && year <= endYear){
	  			return true;
	  		}
	  		else {
	  			return false;
	  		}
	  	});

		update_map();
		gen_sunburst();

	  	// If empty when rounded, use floor & ceil instead.
	  	if (d1[0] >= d1[1]) {	
	  		d1[0] = d3.time.day.floor(d0[0]);
	  		d1[1] = d3.time.day.offset(d1[0]);
	  	}

	  	context.selectAll("a")//append("div")
	  		//.html("<a class=\"boxclose\">X</a>")//.attr("transform","translate("+context.select(".extent").attr("x")+","+context.select(".extent").attr("y")+")");
	  		.attr("x", context.select(".extent").attr("x"))
	  		.attr("y", context.select(".extent").attr("y"));
  		//d3.select(this).transition().call(d3.event.target.move, d1.map(x));
  	}
}

function gen_sunburst() {
  	var width = d3.select("#container_sunburst").style("width").split("px")[0],
  	height = d3.select("#container_sunburst").style("height").split("px")[0],
  	radius = Math.min(width, height) / 2;

  	var x = d3.scale.linear()
  	.range([0, 2 * Math.PI]);

  	var y = d3.scale.sqrt()
  	.range([0, radius]);

  	var color = d3.scale.category20c();

  	var svg = d3.select("#sunburst")
  	.attr("id", "sunburst")
  	.attr("width", width)
  	.attr("height", height)
  	.select("g")
  	.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  	var partition = d3.layout.partition()
    //.sort(null)   // sort(null) to ignore order
    .value(function(d) { return d.size; });

    var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, y(d.y)); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

	var node = createJsonDataset();	

	var g =  svg.selectAll("g")
		.data(partition.nodes(node));

	g.exit().remove();
	g.selectAll("path").remove();
	g.selectAll("text").remove();

	g.enter().append("g");

	var path = g
	.append("path")
	.attr("d", arc)
	.style("fill", function(d) { return color(d.name); })
	.on("click", click)
	.each(stash);

    d3.selectAll("#sunburst").on("change", function change() {
	    var value = this.value === "count"
	        ? function() { return 1; }
	        : function(d) { return d.size; };

	    path
	        .data(partition.value(value).nodes)
	    	.transition()
	        .duration(1000)
	        .attrTween("d", arcTweenData);
  	});

	var div;
    if (d3.select("#tooltip").empty()) {
	    	// Define the div for the tooltip
	  	div = d3.select("body").append("div")
	  		.attr("id", "tooltip")
	  		.attr("class", "hoverinfo tooltip")				
	  		.style("opacity", 0);
    } else {
    	div = d3.select("#tooltip");
    }
  	

	path.on("mouseover", function(d) {
		if (typeof d.name === "undefined" || d.name === "") return;

		div.transition()		
		.duration(200)		
		.style("opacity", .9);		
	})					
	.on("mouseout", function(d) {		
		div.transition()		
		.duration(500)		
		.style("opacity", 0);
	})
	.on("mousemove", function(d) {

		if (typeof d.name === "undefined" || d.name === "") return;	

		div.html("")
		.style("left", (d3.event.pageX - 34) + "px")
		.style("top", (d3.event.pageY - 12) + "px");

		if (typeof d.size === "undefined"){
			var sumSize = 0;
			d.children.forEach(function(purpose) {
				sumSize += purpose.size;
			});

			div.html("<b>Users</b> "+d.name+ "<br><b>Launches</b> " + sumSize);
		} else {
			div.html("<b>Purpose</b> " + d.name + "<br><b>Launches</b> " + d.size);
		}
	});	

	d3.select(self.frameElement).style("height", height + "px");

	var text = g.append("text");

	function click(d) {
		// fade out all text elements
		text.transition().attr("opacity", 0);

		path.transition()
		.duration(750)
		.attrTween("d", arcTweenZoom(d))
		.each("end", function(e, i) {
			if (typeof d.children === "undefined" && e.parent === d.parent) {

				// check if the animated element's data e lies within the visible angle span given in d
				if (e.x >= d.x && e.x < (d.x + d.dx)) {
					// get a selection of the associated text element
					var arcText = d3.select(this.parentNode).select("text");

					arcText.text(function(d) { return d.name; });
					// fade in the text element and recalculate positions
					arcText.transition().duration(750)
					.attr("opacity", 1)
					.attr("x", function(d) { return y(d.y) + 10; })
					.attr("y", function(d) { return (d.y) + 10; })
					.style("font-size","18px");

					arcText.append("tspan").transition().duration(750)
					.attr("opacity", 1)
					.attr("dy", "1.4em") // offest by 1.2 em
					.attr("x", function(d) { return y(d.y) + 12; })
					.text(function(d) {return  "Launches: " + d.size;})
					.style("font-size","18px");
				}	
			}  
		});


		var datasetInUse;
		if (typeof d.name === "undefined" || d.name === ""){
			datasetInUse = dataset;
  		}else {
  			datasetInUse = workingDataset;
  		}
		
		workingDataset = datasetInUse.filter( function(row) {
	  		if (typeof d.name === "undefined" || d.name === ""){
	  			return true; //if center is on center, reset
	  		}

			if (typeof d.size === "undefined"){
				var users = row["Users"].split("/");
				for (i = 0; i < users.length; ++i) {
					if (users[i] === d.name)
						return true;
				}

				return false;
			} else {
				var foundIt = false;
				var users = row["Users"].split("/");
				for (i = 0; i < users.length; ++i) {
					if (users[i] === d.parent.name) {
						foundIt = true;
						break;
					}
				}

				if (!foundIt)
					return false;

				var purposes = row["Purpose"].split("/");
				for (i = 0; i < purposes.length; ++i) {
					if (purposes[i] === d.name)
						return true;
				}

				return false;
			}
		});

		if (workingDataset.length > 0) {
			update_map();

			if (typeof d.name === "undefined" || d.name === ""){
	  			gen_sunburst(); //if center is on center, reset
	  		}
		}
	}

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

function createJsonDataset() {
	// Keep track of the node that is currently being displayed as the root.
	var usersJson = {};
	// Use this to write stuff in the middle
	usersJson.name = "";
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
	return usersJson;
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
