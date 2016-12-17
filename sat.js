var dataset;
var workingDataset = new Array();
var eventDispatcherIn = d3.dispatch("launchVehicleEnter");
var eventDispatcherOut = d3.dispatch("launchVehicleExit");
var selectedBar, selectedCircle;
var clickedCountry = false;
var clickedBar = false;
var clickedSunburst = false;
var clickedOrbit = false;
var map;
var countrySelection, userSelection,
	purposeSelection, vehicleSelection,
	firstDateSelection, lastDateSelection,
	orbitSelection;

var updateSunburst;
var brushSelection = false;
var transitioning = false;

eventDispatcherIn.on("launchVehicleEnter", function(lauchVehicle) {
	selectedBar = d3.select("rect[title=\'" + lauchVehicle[0] + "\']");
	selectedBar.attr("fill", "#0642a3"); // same value as top range in map's saturation
});

eventDispatcherOut.on("launchVehicleExit", function(lauchVehicle) {
	if (selectedBar != null) {
		selectedBar.attr("fill", "steelblue");
	}
});

d3.csv("data.csv", function(data) {

	dataset = data//.splice(0, 100);
	workingDataset = dataset;

	// Define 'div' for tooltips
	var div = d3.select("body")
		.append("div") // declare the tooltip div 
		.attr("class", "hoverinfo tooltip") // apply the 'tooltip' class
		.style("opacity", 0); // set the opacity to nil

	genBars();
	genMap();
	genTimeline();
	genSunburst();
	genOrbiter();

	applySelection();
});

var updateBars;
var insertingBars = false;
function genBars() {
	var margin = {top: 20, right: 20, bottom: 20, left: 60},
	    width = parseInt(d3.select("#bar_chart").style("width")) - margin.left - margin.right,
	    height = parseInt(d3.select("#bar_chart").style("height")) - margin.top - margin.bottom;
	var pendingSelection = false;

	// D3 scales = just math
	// x is a function that transforms from "domain" (data) into "range" (usual pixels)
	// domain gets set after the data loads
	var x = d3.scale.ordinal()
	    .rangeRoundBands([0, width], .1);

	var y = d3.scale.linear()
	    .range([height, 0]);

	// D3 Axis - renders a d3 scale in SVG
	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom");

	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left")
	    .ticks(5);

	// create an SVG element (appended to body)
	// set size
	// add a "g" element (think "group")
	// annoying d3 gotcha - the 'svg' variable here is a 'g' element
	// the final line sets the transform on <g>, not on <svg>
	var svg = d3.select("#bar_chart").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	svg.append("g")
	    .attr("class", "x axis")
	    .attr("transform", "translate(0," + height + ")")

	svg.append("g")
	    .attr("class", "y axis")
	  	.append("text") // just for the title (ticks are automatic)
	    .attr("dy", ".71em")
	    .style("text-anchor", "end")
	    .text("Launches")
	    .attr("y", -20);

	function type(d) {
		// + coerces to a Number from a String (or anything)
		d.frequency = +d.frequency;
		return d;
	}

	function replay() {
		var launchVehicles = new Array();
		workingDataset.forEach(function(d) {
			launchVehicles.push(d["Launch Vehicle"]);
		});

		// generates a associative array with counts for each vehicle
		vehicleCount = vehicleOccurrence(launchVehicles);
		// sorts the array by decreasing order of value	
		data = sortAssociativeArray(vehicleCount).slice(0,12);

		var slices = [];
		for (var i = 0; i < data.length; i++) {
			slices.push(data.slice(0, i+1));
		}

		var lastTimeout;
		slices.forEach(function(slice, index){
			insertingBars = true;
			setTimeout(function(){
			  	draw(slice);
			}, index * 300);
			lastTimeout = index * 300;
		});

		setTimeout(function (argument) {
			insertingBars = false;
			if (pendingSelection) {
				updateBars();
				pendingSelection = false;
			}
		}, lastTimeout);
	}

	function draw(data) {
		// measure the domain (for x, unique letters) (for y [0,maxFrequency])
		// now the scales are finished and usable
		x.domain(data.map(function(d) { return d[0]; }));
		y.domain([0, d3.max(data, function(d) { return d[1]; })]);

		// another g element, this time to move the origin to the bottom of the svg element
		// someSelection.call(thing) is roughly equivalent to thing(someSelection[i])
		//   for everything in the selection\
		// the end result is g populated with text and lines!
		svg.select('.x.axis').transition().duration(300).call(xAxis);

		// same for yAxis but with more transform and a title
		svg.select(".y.axis").transition().duration(300).call(yAxis)

		var tooltip = d3.select("body").select("div.tooltip");
		
		d3.select("#bar_chart").select("svg").on("click", function() {
			console.log("Clicked bar chart"+clickedBar);

			if (clickedBar) {
				clickedBar = false;
			} else if (vehicleSelection != undefined) {
				vehicleSelection = undefined;
				applySelection();
			}
		});

		var bars = svg.selectAll(".bar")
			.data(data, function(d) { return d[0]; }) // (data) is an array/iterable thing, second argument is an ID generator function
			.on("mouseover", function(d) {
				tooltip.transition()
					.duration(500)
					.style("opacity", 0);

				tooltip.transition()
					.duration(200)
					.style("opacity", .9);

				tooltip.html('<b>Vehicle </b>' + d[0] + '<br><b>Launches </b> ' + d[1])
					.style("left", (d3.event.pageX) + "px")
					.style("top", (d3.event.pageY - 28) + "px");

			console.log(d[0]+"; "+d[1]);
			eventDispatcherIn.launchVehicleEnter(d, d);
		}).on("mouseout", function(d) {
			tooltip.transition()
				.duration(500)
				.style("opacity", 0);

			eventDispatcherOut.launchVehicleExit(d, d);
		}).on("click", function(d){
			clickedBar = true;
			console.log(d[0]);
			vehicleSelection = d[0];
			applySelection();
		});

		bars.exit()
		.transition()
		  .duration(300)
		.attr("y", y(0))
		.attr("height", height - y(0))
		//.style('fill-opacity', 1e-6)
		.remove();

		// data that needs DOM = enter() (a set/selection, not an event!)
		bars.enter().append("rect")
		.attr("class", "bar")
		.attr("y", y(0))
		.attr("height", height - y(0));

		// the "UPDATE" set:
		bars.transition().duration(300).attr("x", function(d) { return x(d[0]); }) // (d) is one item from the data array, x is the scale object from above
		.attr("width", x.rangeBand()) // constant, so no callback function(d) here
		.attr("y", function(d) { return y(d[1]); })
		.attr("height", function(d) { return height - y(d[1]); }); // flip the height, because y's domain is bottom up, but SVG renders top down
	}

	updateBars = function () {
		if (!insertingBars)
			replay(workingDataset);
		else {
			pendingSelection = true;
		}
	}
}

function genMap() {
	var countries = new Array();

	workingDataset.forEach(function(d) {
		countries.push(d["Country of Owner"]);
	});
	var countryCount = countryOccurrence(countries);
	sortedCountryCount = sortAssociativeArray(countryCount);

	var input = document.getElementById("input");
	var comboplete  = new Awesomplete('input.dropdown-input', {
		minChars: 0,
		sort : function(a, b){
		    if(a < b) return -1;
	    	if(a > b) return 1;
	    	return 0;
		}
	});
	Awesomplete.$('.dropdown-btn').addEventListener("click", function() {
		if (comboplete.ul.childNodes.length === 0) {
			comboplete.minChars = 0;
			comboplete.evaluate();
		} else if (comboplete.ul.hasAttribute('hidden')) {
			comboplete.open();
		} else {
			comboplete.close();
		}
	});
	comboplete.list = Object.keys(countryCount);

	window.addEventListener("awesomplete-selectcomplete", function(e){
		clickedCountry = true;
		countrySelection = countryNamePairs[e.text.label];
		applySelection();
	}, false);

	d3.select("input").on('search', function (e) {
		if (input.value === "" && countrySelection != undefined) {
			countrySelection = undefined;
			applySelection();
		}
	});

	var paletteScale = d3.scale.linear()
		.domain([0, sortedCountryCount[0][1]])
		.range(["#95b7ed", "#0642a3"]); // blue range

	var countriesDataset = {};
	Object.keys(countryCount).forEach(function(country) {
		var countryValue = countryCount[country];
		code = countryCodePairs[country];
		countriesDataset[code] = {
			value: countryValue,
			fillColor: paletteScale(countryValue)
		};
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
		fills: {
            HIGH: '#0642a3',
            LOW: '#95b7ed',
            MEDIUM: '#698dc7',
            UNKNOWN: 'rgb(0,0,0)',
            defaultFill: 'green'
        },
		done: function(geography) {
			geography.svg.selectAll('.datamaps-subunit').on('click', function(geography) {
				clickedCountry = true;
				console.log('country: ' + geography.properties.name + " -> " + countryNamePairs[geography.properties.name]);
				countrySelection = countryNamePairs[geography.properties.name];
				input.value = countrySelection;
				applySelection();
			});

			d3.select("#map").select("svg").on('click', function() {
				if (clickedCountry) {
					clickedCountry = false;
				} else if (countrySelection != undefined) {
					countrySelection = undefined;
					input.value = "";
					applySelection();
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
			highlightFillColor: 'brown',
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
			highlightFillColor: 'brown',
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
}

function updateMap() {
	var countriesDataset = {};

	if (workingDataset.length > 0) {
		countries = [];
		workingDataset.forEach(function(d) {
			countries.push(d["Country of Owner"]);
		});

		countryCount = countryOccurrence(countries);
		sortedCountryCount = sortAssociativeArray(countryCount);

		var paletteScale = d3.scale.linear()
			.domain([0, sortedCountryCount[0][1]])
			.range(["#95b7ed", "#0642a3"]); // blue range

		Object.keys(countryCount).forEach(function(country) {
			var countryValue = countryCount[country];
			code = countryCodePairs[country];
			countriesDataset[code] = {
				value: countryValue,
				fillColor: paletteScale(countryValue)
			};
		});
	}
	map.updateChoropleth(countriesDataset, {
		reset: true
	});
	gen_bubbles();
}

function gen_bubbles() {
	var launchSites = Array();

	// gather dataset for bubbles
	workingDataset.forEach(function(item) {
		var launchSite = item["Launch Site"];

		if (launchSites.hasOwnProperty(launchSite)) {
			launchSites[launchSite].occurrences += 1;
		} else {
			code = countryCodePairs[item["Country of Owner"]];
			coordinates = item["Coordinates"].split(";");
			launchSites[launchSite] = {
				name: launchSite,
				occurrences: 1,
				latitude: coordinates[0],
				longitude: coordinates[1]
			};
		}
	});

	// normalize bubble size
	Object.keys(launchSites).forEach(function(site) {
		launchSites[site].radius = Math.round(Math.log(launchSites[site].occurrences)) * 5;
	});

	// draw bubbles
	map.bubbles(Object.values(launchSites));

	// TODO - adds the arcs upon bubble selection
	/*d3.select("#map").selectAll("circle.datamaps-bubble").on("click", function() {
		
	})*/
}

function genTimeline() {
	var w = parseInt(d3.select("#map").select("svg").attr("width"));
	var h = parseInt(d3.select("#timeline").style("height"));

	var dates = new Array();
	workingDataset.forEach(function(d) {
		dateText = d["Date of Launch"];
		dateParts = dateText.split("-");

		var year = dateParts[2] > 20 ? "19" + dateParts[2] : "20" + dateParts[2];
		var date = new Date(year, dateParts[1], dateParts[0]);
		dates.push(date);
	});

	dates.sort(function(a, b) {
		return a - b;
	});

	var svg = d3.select("#timeline")
		.append("svg")
		.attr("width", w)
		.attr("height", h);

	var margin = {
		top: 20,
		right: 20,
		bottom: 30,
		left: 60
	};
	var width = +svg.attr("width") - margin.left - margin.right;
	var height = +svg.attr("height") - margin.top - margin.bottom;
	var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")").attr("id", "chartAxis");

	var parseTime = d3.time.format("%d-%B-%y");

	var x = d3.time.scale()
		.domain([dates[0], dates[dates.length - 1]])
		.rangeRound([0, width]);

	var y = d3.scale.linear()
		.rangeRound([height, 0]);

	var area = d3.svg.area()
		.interpolate("monotone")
		.x(function(d) {
			return x(d);
		})
		.y0(height)
		.y1(function(d, i) {
			return y(i + 1);
		});

	x.domain(d3.extent(dates, function(d) {
		return d;
	}));
	y.domain(d3.extent(dates, function(d, i) {
		return i + 1;
	}));
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

	var context = svg.append("g")
		.attr("class", "context")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var brush = d3.svg.brush()
		.x(x)
		.on("brushend", brushed);

	context.append("g")
		.attr("class", "x brush")
		.call(brush)
		.selectAll("rect")
		.attr("y", -6)
		.attr("height", height + 7);

	function brushed() {
		if (!d3.event.sourceEvent) return; // Only transition after input.

		if (brush.extent()[0].getTime() != brush.extent()[1].getTime()) {
			firstDateSelection = brush.extent()[0].getFullYear();
			lastDateSelection = brush.extent()[1].getFullYear();
			applySelection();
		} else if (firstDateSelection != undefined && lastDateSelection != undefined) {
			firstDateSelection = undefined;
			lastDateSelection = undefined;
			applySelection();
		}
	}
}
function genSunburst() {
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
		.value(function(d) {
			return d.size;
		});

	var arc = d3.svg.arc()
		.startAngle(function(d) {
			return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
		})
		.endAngle(function(d) {
			return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
		})
		.innerRadius(function(d) {
			return Math.max(0, y(d.y));
		})
		.outerRadius(function(d) {
			return Math.max(0, y(d.y + d.dy));
		});

	function computeTextRotation(d) {
		var angle = x(d.x + d.dx / 2) - Math.PI / 2;
		return angle / Math.PI * 180;
	}

	function arcTween(d) {
		var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
			yd = d3.interpolate(y.domain(), [d.y, 1]),
			yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
		return function(d, i) {
			return i ? function(t) {
				return arc(d);
			} : function(t) {
				x.domain(xd(t));
				y.domain(yd(t)).range(yr(t));
				return arc(d);
			};
		};
	}

	function arcTweenUpdate(a) {
		console.log(path);
		var _self = this;
		var i = d3.interpolate({
			x: this.x0,
			dx: this.dx0
		}, a);
		return function(t) {
			var b = i(t);
			console.log(window);
			_self.x0 = b.x;
			_self.dx0 = b.dx;
			return arc(b);
		};
	}

	updateSunburst = function() {
		if (clickedSunburst) {
			clickedSunburst = false;
			return;
		}

		var root = createJsonDataset();
		// DATA JOIN - Join new data with old elements, if any.
		var gs = svg.selectAll("g").data(partition.nodes(root));

		// ENTER
		var g = gs.enter().append("g").on("click", click);

		// UPDATE
		var path = g.append("path");

		gs.select('path')
			.style("fill", function(d) {
				return color(d.name);
			})
			.on("click", click)
			.each(function(d) {
				this.x0 = d.x;
				this.dx0 = d.dx;
			})
			.transition().duration(500)
			.attr("d", arc);

		var text = g.append("text");

		gs.select('text')
			.attr("x", function(d) {
				return y(d.y);
			})
			.attr("dx", "6") // margin
			.attr("dy", ".35em") // vertical-align
			.attr("transform", function(d) {
				return "rotate(" + computeTextRotation(d) + ")";
			})
			.text(function(d) {
				return d.name;
			})
			.style("fill", "white");


		function click(d) {
			clickedSunburst = true;
			// fade out all text elements
			/*if (d.size !== undefined) {
			  d.size += 100;
			};*/

			text.transition().attr("opacity", 0);

			for (var i = 0; i < path[0].length; ++i) {
				if (path[0][i] === undefined || path[0][i] === null) {
					path[0].splice(i, 1);
					--i;
				}
			}

			path.transition()
				.duration(750)
				.attrTween("d", arcTween(d))
				.each("end", function(e, i) {
					// check if the animated element's data e lies within the visible angle span given in d
					if (e.x >= d.x && e.x < (d.x + d.dx)) {
						// get a selection of the associated text element
						var arcText = d3.select(this.parentNode).select("text");
						// fade in the text element and recalculate positions
						arcText.transition().duration(750)
							.attr("opacity", 1)
							.attr("transform", function() {
								return "rotate(" + computeTextRotation(e) + ")"
							})
							.attr("x", function(d) {
								return y(d.y);
							});
					}
				});

			userSelection = undefined;
			purposeSelection = undefined;

			// TODO: alterar para ele ter em conta a hierarquia da selecao corrente
			// para so sair de uma hierarquia
			if (typeof d.name != "undefined" && d.name != "") {
				if (typeof d.size === "undefined") {
					userSelection = d.name;
					purposeSelection = undefined;
				} else {
					userSelection = d.parent.name;
					purposeSelection = d.name;
				}
			} else {
				// if only the user was selected, back out to no selection
				if (purposeSelection === undefined && userSelection != undefined) {
					userSelection = undefined;
					// if both the user and the purpose were selected, back out to just user selection
				} else if (purposeSelection != undefined && userSelection != undefined) {
					purposeSelection = undefined;
				}
			}

			applySelection();
		}

		// EXIT - Remove old elements as needed.
		gs.exit().transition().duration(500).style("fill-opacity", 1e-6).remove();
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

		users.forEach(function(user) {
			var foundUser = false;
			for (i = 0; i < usersJson.children.length; ++i) {
				if (usersJson.children[i].name === user) {
					foundUser = true;

					purposes.forEach(function(purpose) {
						var foundPurpose = false;
						for (j = 0; j < usersJson.children[i].children.length; ++j) {
							if (usersJson.children[i].children[j].name === purpose) {
								usersJson.children[i].children[j].size++;

								foundPurpose = true;
							}
						}

						if (!foundPurpose) {
							usersJson.children[i].children.push({
								name: purpose,
								size: 1
							});
						}
					});
				}
			}

			if (!foundUser) {
				usersJson.children.push({
					name: user,
					children: []
				});

				for (var j = 0; j < usersJson.children.length; j++) {
					if (usersJson.children[j].name === user) {
						purposes.forEach(function(purpose) {
							usersJson.children[j].children.push({
								name: purpose,
								size: 1
							});
						});
					}
				}
			}
		});
	});
	return usersJson;
}

function genOrbiter() {
	var orbitTypes = ["LEO", "MEO", "GEO", "Elliptical"];
	var jsonDataset = [];
	var numSatsOrbits = [];
	var minRand = -12.5;
	var maxRand = 12.5;

	var iteration = 0;
	while (iteration < orbitTypes.length) {
		var counter = 0;
		workingDataset.forEach(function(d) {
			var index = orbitTypes.indexOf(d["Class of Orbit"]);

			if (index === iteration) {
				var countries = d["Country of Owner"].split(/[/]+/);
				var country;
				if (countries.length > 1) {
					country = countries[0] + ", " + countries[1] + ", ...";
				} else {
					country = countries[0];
				}

				jsonDataset.push({
					key: d["Name of Satellite, Alternate Names"],
					orbital_period: "0.9408467",
					radius: "2439",
					randX: Math.floor(Math.random() * (maxRand - minRand + 1)) + minRand,
					randY: Math.floor(Math.random() * (maxRand - minRand + 1)) + minRand,
					country: country,
					user: d["Users"],
					purpose: d["Purpose"],
					orbit: d["Class of Orbit"]

				});
				counter++;
			}
		});
		numSatsOrbits[iteration] = counter;
		++iteration;
	}

	drawOrbit(jsonDataset, numSatsOrbits);
}

function drawOrbit(_data, numSatsOrbits) {
	var width = parseInt(d3.select("#orbiter").style("width"));
	var height = parseInt(d3.select("#orbiter").style("height"));

	var svg = d3.select("#orbiter").append("svg")
		.attr("width", width)
		.attr("height", height);

	orbitScale = d3.scale.linear().domain([1, 3]).range([3.8, 1.5]).clamp(true);
	radiusScale = d3.scale.linear().domain([210.64, 2500, 10000, 71492.68]).range([2, 4, 8, 16]);

	colors = d3.scale.category20b();

	//TODO - changed this from width, height to height, height
	orbit = d3.layout.orbit().size([height, height])
		.children(function(d) {
			return d.values
		})
		.revolution(function(d) {
			return 1 / d.orbital_period
		})
		.orbitSize(function(d) {
			return orbitScale(d.depth)
		})
		.speed(1)
		.mode(numSatsOrbits)
		.nodes(_data);

	svg.on("click", function() {
		if (clickedOrbit) {
			clickedOrbit = false;
		} else if (orbitSelection != undefined) {
			orbitSelection = undefined;
			applySelection();
		}
	});

	svg.append("g")
		.attr("class", "viz")
		.selectAll("g.node").data(orbit.nodes())
		.enter()
		.append("g")
		.attr("class", "node")
		.attr("transform", function(d) {
			var rX, rY;
			if (d.randX === undefined || d.randY === undefined) {
				rX = 0;
				rY = 0;
			} else {
				rX = d.randX;
				rY = d.randY;
			}

			return "translate(" + (d.x + rX) + "," + (d.y + rY) + ")"
		})
		.on("mouseover", nodeOver)
		.on("mouseout", nodeOut)
		.on("click", click);
	
	svg.select("g.viz").attr("transform", "translate(" + (width - height)/2 + "," + 0 + ")");

	svg.selectAll("g.node")
		.append("circle")
		.attr("r", function(d) {
			return d.radius ? radiusScale(d.radius) : 20
		})
		.style("fill", function(d) {
			if (d.key === "root") return "green";
			else if (d.key === "dummy") return "none";
			else if (d.orbit === "LEO") return "steelblue";
			else if (d.orbit === "MEO") return "#74c476";
			else if (d.orbit === "GEO") return "#e6550d";
			else return "#756bb1";
		})
		
	svg.selectAll("g.node").attr("class", function (d) {

			if (d.key == "root") return "node earth";
			else return "node satellite";
		});

	svg.selectAll("g.earth").append("text")
				.style("font-size", "24")
				.style("fill", "white")
				.style("font-weight", "bold")
	    		.style("text-anchor", "middle")
	    		.style("dominant-baseline", "central")
	    		.text("+");

	d3.select("g.viz")
		.selectAll("circle.ring")
		.data(orbit.orbitalRings())
		.enter()
		.insert("circle", "g")
		.attr("class", "ring")
		.attr("r", function(d) {
			return d.r
		})
		.attr("cx", function(d) {
			return d.x
		})
		.attr("cy", function(d) {
			return d.y
		})

	orbit.on("tick", function() {
		d3.selectAll("g.node").attr("transform", function(d) {
			var rX, rY;
			if (d.randX === undefined || d.randY === undefined) {
				rX = 0;
				rY = 0;
			} else {
				rX = d.randX;
				rY = d.randY;
			}

			return "translate(" + (d.x + rX) + "," + (d.y + rY) + ")";
		});

		d3.selectAll("circle.ring")
			.attr("cx", function(d) {
				return d.x
			})
			.attr("cy", function(d) {
				return d.y
			});
	});

	orbit.start();
}

function nodeOver(d) {
	if (d.key != "root")
		orbit.stop();

	d3.select(this).select("circle").style("stroke", "brown").style("stroke-width", 3);

	var div = d3.select("body")
		.select("div.tooltip");

	div.transition()
		.duration(500)
		.style("opacity", 0);

	div.transition()
		.duration(200)
		.style("opacity", .9);

	if (d.key === "root") {
		if (aggregateSatellites) {
			div.html('<b>Click to expand satellites</b>')
				.style("left", (d3.event.pageX) + "px")
				.style("top", (d3.event.pageY - 28) + "px");	
		} else {
			div.html('<b>Click to aggregate satellites</b>')
				.style("left", (d3.event.pageX) + "px")
				.style("top", (d3.event.pageY - 28) + "px");	
		}		
	} else {
		div.html('<b>Satellite </b>' + d.key +(d.frequency != 1 ? " ("+d.frequency+" satellites)" : "") +
			'<br><b>User & Purpose </b> ' + d.user + ' - ' + d.purpose +
			'<br><b>Country </b> ' + d.country +
			'<br><b>Orbit Class </b> ' + d.orbit)
		.style("left", (d3.event.pageX + 15) + "px")
		.style("top", (d3.event.pageY + 15) + "px");		
	}
}

function nodeOut(d) {
	if (d.key != "root")
		orbit.start();

	d3.select(this).select("circle").style("stroke-width", 0);

	var div = d3.select("body")
		.select("div.tooltip");

	div.transition()
		.duration(500)
		.style("opacity", 0);
}

var aggregateSatellites = true;
function click(d) {
			clickedOrbit = true;

	if (d.key === "root") {
		aggregateSatellites = (aggregateSatellites ? false : true);

		if (aggregateSatellites) {
			d3.select(this).select("circle");
			d3.select(this).select("text").text("+");
		} else {
			d3.select(this).select("circle");
			d3.select(this).select("text").text("-");
		}
	
		updateOrbiter();
	} else {
		orbitSelection = d.orbit;
		applySelection();
	}
}
function newMode(_mode, _data) {
	orbit.mode(_mode)
		.nodes(_data);

	d3.select("g.viz")
		.selectAll("circle.ring")
		.data(orbit.orbitalRings())
		.exit()
		.transition()
		.duration(500)
		.style("stroke-opacity", 0)
		.style("stroke-width", 3)
		.remove();

	d3.select("g.viz")
		.selectAll("circle.ring")
		.data(orbit.orbitalRings())
		.enter()
		.insert("circle", "g")
		.attr("class", "ring");

	d3.selectAll("circle.ring")
		.attr("r", function(d) {
			return d.r
		})
		.attr("cx", function(d) {
			return d.x
		})
		.attr("cy", function(d) {
			return d.y
		});
}

function updateOrbiter() {
	var orbitTypes = ["LEO", "MEO", "GEO"];
	var jsonDataset = [];
	var numSatsOrbits = [];
	var minRand = -12.5;
	var maxRand = 12.5;

	var svg = d3.select("#orbiter").select("svg");
	var countriesHash = {};

	var iteration = 0;
	while (iteration < 4) {
		var counter = 0;
		workingDataset.forEach(function(d) {
			var index = orbitTypes.indexOf(d["Class of Orbit"]);

			if (index === iteration || (iteration === 3 && index === -1)) {
				var countries = d["Country of Owner"].split(/[/]+/);
				var country;
				if (countries.length > 1) {
					country = countries[0] + ", " + countries[1] + ", ...";
				} else {
					country = countries[0];
				}

				if (aggregateSatellites) {
					var nameParts = d["Name of Satellite, Alternate Names"].split(/[\s-]+/);
					if (countriesHash[nameParts[0]] === undefined) {
						countriesHash[nameParts[0]] = true;
						jsonDataset.push({
							key: nameParts[0],
							orbital_period: "0.9408467",
							radius: "2039",
							randX: Math.floor(Math.random() * (maxRand - minRand + 1)) + minRand,
							randY: Math.floor(Math.random() * (maxRand - minRand + 1)) + minRand,
							country: country,
							user: d["Users"],
							purpose: d["Purpose"],
							orbit: d["Class of Orbit"],
							frequency: 1
						});
						counter++;
					} else {
						for (var key in jsonDataset) {
							var jsonValue = jsonDataset[key];
							if (jsonValue.key === nameParts[0] && jsonDataset[key].radius < 40000) {
								jsonDataset[key].frequency += 1;
								jsonDataset[key].radius = parseInt(jsonDataset[key].radius) + 800;
								break;
							}
						}
					}
				} else {
					jsonDataset.push({
						key: d["Name of Satellite, Alternate Names"],
						orbital_period: "0.9408467",
						radius: "2039",
						randX: Math.floor(Math.random() * (maxRand - minRand + 1)) + minRand,
						randY: Math.floor(Math.random() * (maxRand - minRand + 1)) + minRand,
						country: country,
						user: d["Users"],
						purpose: d["Purpose"],
						orbit: d["Class of Orbit"],
						frequency: 1
					});
					counter++;
				}

			}
		});

		if (counter === 0) {
			jsonDataset.push({
				key: "dummy",
				orbital_period: "0.9408467",
				radius: "1",
				randX: 0,
				randY: 0,
				country: "",
				user: "",
				purpose: "",
				orbit: "dummy"
			});
			counter++;
		}

		numSatsOrbits[iteration] = counter;
		++iteration;
	}
	
	orbit.mode(numSatsOrbits).nodes(jsonDataset);

	var gs = svg.select("g.viz")
		.selectAll("g.node").filter(function(d) {return d.key != "root"})
		.data(jsonDataset);

	gs.enter().append("g").attr('opacity', 0)
		.attr("class", "node")
		.attr("randX", function() {
			return 100 * Math.random();
		})
		.attr("randY", function() {
			return 100 * Math.random();
		})
		.attr("transform", function(d) {
			var rX, rY;
			if (d.randX === undefined || d.randY === undefined) {
				rX = 0;
				rY = 0;
			} else {
				rX = d.randX;
				rY = d.randY;
			}
			return "translate(" + (d.x + rX) + "," + (d.y + rY) + ")"
		})
		.on("mouseover", nodeOver)
		.on("mouseout", nodeOut)
		.on("click", click)
		.append('circle');

		svg.select("g.viz")
		.selectAll("g.node").filter(function(d) {return d.key != "root"})
		.transition().duration(200).style('opacity', 0)
		.transition().duration(700).style('opacity', 1);

	gs.select("circle")
		.attr("r", function(d) {
			return d.radius ? radiusScale(d.radius) : 20
		})
		.style("fill", function(d) {
			if (d.key === "root") return "green";
			else if (d.key === "dummy") return "none";
			else if (d.orbit === "LEO") return "steelblue";
			else if (d.orbit === "MEO") return "#74c476";
			else if (d.orbit === "GEO") return "#e6550d";
			else return "#756bb1";
		});

	gs.exit().transition().duration(500).style('opacity', 0).remove()//.opacity(0);
}

function applySelection() {
	// TODO: change this to happen in the map if possible
	var oldDataset = workingDataset;
	workingDataset = dataset.filter(function(row) {
		if (filterGeneric(row, "Users", userSelection) &&
			filterGeneric(row, "Purpose", purposeSelection) &&
			filterGeneric(row, "Country of Owner", countrySelection) &&
			filterGeneric(row, "Class of Orbit", orbitSelection) &&
			filterVehicle(row) &&
			filterDate(row)) {
			return true;
		} else {
			return false;
		}
	});

	if (workingDataset.length <= 0) {
		workingDataset = oldDataset;
		return;
	}

	updateSunburst();
	updateMap();
	updateOrbiter();
	updateBars();

	//TODO - if this is useless remove the code for timeline update
	//updateTimeline();
}

// returns true if the row contains the selection; false otherwise
function filterGeneric(row, column, selection) {
	if (selection === undefined)
		return true;

	var parts = row[column].split("/");
	for (i = 0; i < parts.length; ++i) {
		if (parts[i] === selection)
			return true;
	}

	return false;
}

function filterDate(row) {
	if (firstDateSelection === undefined || lastDateSelection === undefined)
		return true;

	dateText = row["Date of Launch"];
	dateParts = dateText.split("-");

	var year = dateParts[2] > 20 ? "19" + dateParts[2] : "20" + dateParts[2];

	if (year >= firstDateSelection && year <= lastDateSelection) {
		return true;
	} else {
		return false;
	}
}

function filterVehicle(row) {
	if (vehicleSelection === undefined)
		return true;

	var vehicle = row["Launch Vehicle"];
	var vehicleParts = vehicle.split(/[\s\.\-/]+/);
	var	vehicleName = vehicleParts[0];

	if (vehicleName === "Long")
		vehicleName = "Long March";

	if (vehicleName === vehicleSelection)
		return true;
	else 
		return false;
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
	countryArray.forEach(function(item) {
		countries = item.split(/[/]+/);

		countries.forEach(function(country) {
			if (countryCounter.hasOwnProperty(country)) {
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
	vehicleArray.forEach(function(d) {
		parts = d.split(/[\s\.\-/]+/);
		vehicleName = parts[0];

		if (vehicleName === "Long")
			vehicleName = "Long March";

		if (vehicleCounter.hasOwnProperty(vehicleName)) {
			vehicleCounter[vehicleName] += 1;
		} else {
			vehicleCounter[vehicleName] = 1;
		}
	});

	return vehicleCounter;
}