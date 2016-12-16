var dataset;
var workingDataset = new Array();
var eventDispatcherIn = d3.dispatch("launchVehicleEnter");
var eventDispatcherOut = d3.dispatch("launchVehicleExit");
var selectedBar, selectedCircle;
var clickedCountry = false;
var map;
var countrySelection, userSelection,
	purposeSelection, vehicleSelection,
	firstDateSelection, lastDateSelection;
var sunburstClick;
var updateSunburst3;

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

	dataset = data.splice(0, 100);
	workingDataset = dataset;

	// Define 'div' for tooltips
	var div = d3.select("body")
		.append("div") // declare the tooltip div 
		.attr("class", "hoverinfo tooltip") // apply the 'tooltip' class
		.style("opacity", 0); // set the opacity to nil

	//gen_bars();
	gen_map();
	gen_timeline();
	genSunburst2();
	gen_orbiter();

	applySelection();
});

function gen_bars() {
	var w = parseInt(d3.select("#bar_chart").style("width"));
	var h = parseInt(d3.select("#bar_chart").style("height"));

	// TODO: increment this
	var numberOfBars = 3;
	var svg = d3.select("#bar_chart")
		.append("svg");

	svg.attr("width", w)
		.attr("height", h);

	var launchVehicles = new Array();
	workingDataset.forEach(function(d) {
		launchVehicles.push(d["Launch Vehicle"]);
	});

	// generates a associative array with counts for each vehicle
	vehicleCount = vehicleOccurrence(launchVehicles);
	// sorts the array by decreasing order of value	
	sortedVehicleCount = sortAssociativeArray(vehicleCount);
	console.log(sortedVehicleCount);

	var padding = 35;
	var bar_w = -10;

	var hscale = d3.scale.linear()
		//the maximum number is increased in 25 to allow some breathing room
		.domain([sortedVehicleCount[0][1] + 25, 0])
		.range([padding, h - padding]);

	var xscale = d3.scale.linear()
		.domain([0, numberOfBars - 1])
		.range([padding, w - padding]);

	var yaxis = d3.svg.axis().orient("left")
		.scale(hscale).ticks(4);

	var xaxis = d3.svg.axis().orient("bottom")
		.scale(d3.scale.linear()
			.domain([sortedVehicleCount[0][0], sortedVehicleCount[numberOfBars - 1][0]])
			.range([padding + bar_w / 2, w - padding - bar_w / 2]))
		.tickFormat(function(d) {
			return d[0];
		})
		.ticks(numberOfBars - 1);
	//.ticks(20);

	svg.append("g")
		.attr("transform", "translate(30,0)")
		.attr("class", "y axis")
		.call(yaxis);

	var div = d3.select("body").select("div.tooltip");

	svg.append("g").attr("id", "barContainer").selectAll("rect")
		.data(sortedVehicleCount.slice(0, numberOfBars - 1))
		.enter().append("rect")
		.attr("width", function(d) {
			return Math.floor((w - padding * 3) / numberOfBars) - 1;
		})
		.attr("height", function(d) {
			return h - padding - hscale(d[1]);
		})
		.attr("fill", "steelblue")
		.attr("x", function(d, i) {
			return xscale(i);
		})
		.attr("y", function(d) {
			return hscale(d[1]);
		})
		.attr("title", function(d) {
			return d[0];
		})
		.on("mouseover", function(d) {
			div.transition()
				.duration(500)
				.style("opacity", 0);

			div.transition()
				.duration(200)
				.style("opacity", .9);

			div.html('<b>Vehicle </b>' + d[0] + '<br><b>Launches </b> ' + d[1])
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
			return hscale(i + 1) + h - padding - hscale(i + 1) + 30;
		})
		.text(function(d) {
			return i;
		})
		.style("font-size", "18px");

	sortedVehicleCount.slice(0, numberOfBars - 1).forEach(function(d, i) {

		var svgText = svg.select("#barContainer").append("text")
			.attr("opacity", 1.0)
			.attr("y", hscale(i) + h - padding - hscale(i) + 25)
			.text(d[0])
			.style("font-size", "18px");

		var textWidth = parseInt(svgText.style("width"));
		var barWidth = Math.floor((w - padding * 3) / numberOfBars) - 1;

		var diff = (barWidth - textWidth) / 2;
		svgText.attr("x", xscale(i) + diff);
	});
}

function gen_map() {
	var countries = new Array();

	workingDataset.forEach(function(d) {
		countries.push(d["Country of Owner"]);
	});
	countryCount = countryOccurrence(countries);
	sortedCountryCount = sortAssociativeArray(countryCount);

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
		done: function(geography) {
			geography.svg.selectAll('.datamaps-subunit').on('click', function(geography) {
				/*console.log(geography);
            	clickedCountry = true;
            	var code = countryCodePairs[geography.properties.name];
				if (countriesDataset[code].value <= 0) {
					console.log("empty");
					return;
				} else {
					console.log("non empty");
				}*/
				clickedCountry = true;

				console.log('country: ' + geography.properties.name + " -> " + countryNamePairs[geography.properties.name]);
				countrySelection = countryNamePairs[geography.properties.name];
				applySelection();

			});

			d3.select("#map").select("svg").on('click', function() {
				if (clickedCountry) {
					clickedCountry = false;
				} else {
					countrySelection = undefined;
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

function update_map() {
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
}

function gen_timeline() {
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
	var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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

		if (brush.extent()[0].getTime() === brush.extent()[1].getTime()) {
			firstDateSelection = undefined;
			lastDateSelection = undefined;
		} else {
			firstDateSelection = brush.extent()[0].getFullYear();
			lastDateSelection = brush.extent()[1].getFullYear();
		}

		applySelection();
	}
}

var svgSunburst;
var pathSunburst;

function gen_sunburst() {
	var width = d3.select("#container_sunburst").style("width").split("px")[0],
		height = d3.select("#container_sunburst").style("height").split("px")[0],
		radius = Math.min(width, height) / 2;

	var x = d3.scale.linear()
		.range([0, 2 * Math.PI]);

	var y = d3.scale.sqrt()
		.range([0, radius]);

	var color = d3.scale.category20c();

	svgSunburst = d3.select("#sunburst")
		.attr("id", "sunburst")
		.attr("width", width)
		.attr("height", height)
		.select("g")
		.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

	var partition = d3.layout.partition()
		//.sort(null)   // sort(null) to ignore order
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

	var node = createJsonDataset();

	var g = svgSunburst.selectAll("g")
		.data(partition.nodes(node));

	g.exit().remove();
	g.selectAll("path").remove();
	//g.selectAll("text").remove();

	g.enter().append("g");

	pathSunburst = g
		.append("path")
		.attr("d", arc)
		.style("fill", function(d) {
			return color(d.name);
		})
		.on("click", click)
		.each(stash);

	d3.selectAll("#sunburst").on("change", function change() {
		var value = this.value === "count" ? function() {
			return 1;
		} : function(d) {
			return d.size;
		};

		pathSunburst
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

	pathSunburst.on("mouseover", function(d) {
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

			if (typeof d.size === "undefined") {
				var sumSize = 0;
				d.children.forEach(function(purpose) {
					sumSize += purpose.size;
				});

				div.html("<b>Users</b> " + d.name + "<br><b>Launches</b> " + sumSize);
			} else {
				div.html("<b>Purpose</b> " + d.name + "<br><b>Launches</b> " + d.size);
			}
		});

	d3.select(self.frameElement).style("height", height + "px");

	var text = g.append("text");

	function click(d) {
		sunburstClick = true;
		// fade out all text elements
		text.transition().attr("opacity", 0);

		pathSunburst.transition()
			.duration(750)
			.attrTween("d", arcTweenZoom(d))
			.each("end", function(e, i) {
				if (typeof d.children === "undefined" && e.parent === d.parent) {

					// check if the animated element's data e lies within the visible angle span given in d
					if (e.x >= d.x && e.x < (d.x + d.dx)) {
						// get a selection of the associated text element
						var arcText = d3.select(this.parentNode).select("text");

						arcText.text(function(d) {
							return d.name;
						});
						// fade in the text element and recalculate positions
						arcText.transition().duration(750)
							.attr("opacity", 1)
							.attr("x", function(d) {
								return y(d.y) + 10;
							})
							.attr("y", function(d) {
								return (d.y) + 10;
							})
							.style("font-size", "18px");

						arcText.append("tspan").transition().duration(750)
							.attr("opacity", 1)
							.attr("dy", "1.4em") // offest by 1.2 em
							.attr("x", function(d) {
								return y(d.y) + 12;
							})
							.text(function(d) {
								return "Launches: " + d.size;
							})
							.style("font-size", "18px");
					}
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
		var oi = d3.interpolate({
			x: a.x0,
			dx: a.dx0
		}, a);

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
			return i ? function(t) {
				return arc(d);
			} : function(t) {
				x.domain(xd(t));
				y.domain(yd(t)).range(yr(t));
				return arc(d);
			};
		};
	}
}

function genSunburst2() {
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

	updateSunburst3 = function() {
		if (sunburstClick) {
			sunburstClick = false;
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
			sunburstClick = true;
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

function gen_orbiter() {
	var orbitTypes = ["LEO", "MEO", "GEO"];
	var jsonDataset = [];
	var numSatsOrbits = [];
	var minRand = -25;
	var maxRand = 25;

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

				jsonDataset.push({
					key: d["Name of Satellite, Alternate Names"],
					orbital_period: "0.9408467",
					radius: "20439",
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

	orbit = d3.layout.orbit().size([width, height])
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

	svg.append("g")
		.attr("class", "viz")
		.attr("transform", "translate(50,50)")
		.selectAll("g.node").data(orbit.nodes())
		.enter()
		.append("g")
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
		.on("mouseout", nodeOut);

	svg.selectAll("g.node")
		.append("circle")
		.attr("r", function(d) {
			return d.radius ? radiusScale(d.radius) : 20
		})
		.style("fill", function(d) {
			if (d.key === "root") return "green";
			else if (d.key === "dummy") return "none";
			else if (d.orbit === "LEO") return "steelblue";
			else if (d.orbit === "MEO") return "yellow";
			else if (d.orbit === "GEO") return "red";
			else return "purple";
			//return d.key === "root" ? "green" : "steelblue"
		});

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
	orbit.stop();

	var div = d3.select("body")
		.select("div.tooltip");

	div.transition()
		.duration(500)
		.style("opacity", 0);

	div.transition()
		.duration(200)
		.style("opacity", .9);

	if (d.key === "root") {
		div.html('<b>Earth</b>')
		.style("left", (d3.event.pageX) + "px")
		.style("top", (d3.event.pageY - 28) + "px");		
	} else {
		div.html('<b>Satellite </b>' + d.key +
			'<br><b>User & Purpose </b> ' + d.user + ' - ' + d.purpose +
			'<br><b>Country </b> ' + d.country +
			'<br><b>Orbit Class </b> ' + d.orbit)
		.style("left", (d3.event.pageX) + "px")
		.style("top", (d3.event.pageY - 28) + "px");		
	}
}

function nodeOut() {
	orbit.start();

	var div = d3.select("body")
		.select("div.tooltip");

	div.transition()
		.duration(500)
		.style("opacity", 0);
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
	var minRand = -25;
	var maxRand = 25;

	var svg = d3.select("#orbiter").select("svg");

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

				jsonDataset.push({
					key: d["Name of Satellite, Alternate Names"],
					orbital_period: "0.9408467",
					radius: "20439",
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

	console.log("L: "+jsonDataset.length);
	orbit.mode(numSatsOrbits).nodes(jsonDataset);

	var gs = svg.select("g.viz")
		.selectAll("g.node").filter(function(d) {return d.key != "root"})
		.data(jsonDataset);

	gs.enter().append("g")
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
		.append('circle');

	//TODO - appending circles is duplicating circles
	gs.select("circle")
		.attr("r", function(d) {
			return d.radius ? radiusScale(d.radius) : 20
		})
		.style("fill", function(d) {
			if (d.key === "root") return "green";
			else if (d.key === "dummy") return "none";
			else if (d.orbit === "LEO") return "steelblue";
			else if (d.orbit === "MEO") return "yellow";
			else if (d.orbit === "GEO") return "red";
			else return "purple";
		});

	gs.exit().remove();
}

function applySelection() {
	// TODO: change this to happen in the map if possible
	var oldDataset = workingDataset;
	workingDataset = dataset.filter(function(row) {
		if (filterGeneric(row, "Users", userSelection) &&
			filterGeneric(row, "Purpose", purposeSelection) &&
			filterGeneric(row, "Country of Owner", countrySelection) &&
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

	updateSunburst3();
	update_map();
	updateOrbiter();
	// TODO: update everything else
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