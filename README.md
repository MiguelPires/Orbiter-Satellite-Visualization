# Sattelite Visualization

This interactive visualization displays information regarding every satellite that is currently orbiting the Earth.
By interacting with the visualization the user can discover new information. For instance:
  - How many contries have launched satellites?
  - What is the purpose of those launches (e.g., Military, Research, etc)?
  - What is the chronological timeline?
  - What launch vehicle was used?
  - Where do those satellites reside in orbit (e.g., GEO, LEO, etc)?
  
 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
 [![Demonstration of the interactive visualization](http://img.youtube.com/vi/Rph3yy-zpHw/0.jpg)](https://youtu.be/Rph3yy-zpHw)
 
### Filtering
Data can be filtered by clicking on certain items. This is very helpful when trying to obtain information about satellites to which you have some information. For instance, if you wish to discover information about satellites launched by the US with research purposes, you could click on the US on the map and select the appropriate purpose on the sunburst chart and the every chart will be automatically updated.

### Custom Viz
The bottom right chart was custom made by us as a novel and more interactive way of displaying satellites orbiting the Earth in their respective orbits. Since there are more than 1400 active satellites currently orbiting the Earth, the chart can be somewhat cluttered. To combat this, we added an aggregation feature that aggregates several satellites belonging to the same constelation. The dot representing the constelation varies in size depending on how many satellites it contains. It's possible to expand or aggregate the satellites by clicking on the center button that represents Earth. 

### Source
The data used in this visualization was provided by the Union of Concerned Scientists and can be obtained [here](http://www.ucsusa.org/nuclear-weapons/space-weapons/satellite-database#.WJDG8-k8yps).
## Usage
To run the project, start a simple HTTP python server by executing the following command in the main folder:

`$ python -m SimpleHTTPServer 8000`

You can see the visualization by visiting the URL "localhost:8000"

