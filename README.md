# Simple Angular Google Maps
A very easy to use google maps application for angular.js. At only 14kb minified, this is one of the smallest and most powerful google map integrations out there.

## What this plugin does
Creates a google map element on your page. Configuration can be done with html tags and attributes, and can be styled with css.

## This plugin supports the following features
* Google maps direction service
* Google maps street view service
* HTML5 geolocation service
* Geolocation fallback if geolocation is not supported or not available
* Custom info window
* Autocomplete search input
* Marker animation
* Cusomizable map offset ( great when positioning autocomplete on top of map )
* Custom zoom buttons
* Custom marker images
* Custom streetview close button
* Keyboard support for autocomplete results
* Ajax/ Rest Api friendly marker loading
* Easy to override all default options for each Google maps service class

## How it works
This plugin makes use angular directives to utilize each google maps service or functionality. There is one element required: ```<google-map>```

The rest of the options can be added by setting attributes on any dom element. This allows for excellent customization of styles and user experience. If you were to utilize every option, the minimal code would look something like this:

```
<section ng-app="google-maps">
  <google-map offset="6" direction-service streetview-service></google-map>
  <input type="text" name="search" placeholder="Search Map" autocomplete="off" auto-complete ng-model="search" />
  <ul auto-complete-results></ul>
  <div infowindow></div>
  <a zoom="in"></a>
  <a zoom="out"></a>
  <a street-view-open>Streetview Open</a>
  <div sreet-view-close>&times;</div>
  <div direction-info></div>
</section>
```

## Dependencies
* Google Maps Api - ```//maps.google.com/maps/api/js?sensor=true```
* Angular.js - ```//ajax.googleapis.com/ajax/libs/angularjs/1.2.12/angular.min.js```
* Geometry library is needed only if using the direction service. Be sure to include the library parameter in your google api url like this: ```//maps.google.com/maps/api/js?sensor=true&libraries=geometry```

## Loading Markers
By default, markers are loaded using angular's $http service, and expects a json response of objects to use for markers. The marker service makes use of only three fields that are required, any other data returned is set inside of a data property on each marker. This makes it really easy for you to customize the infowindow templates, dropdown select template, or add your own custom directives to extend and use the data however you like. The minimum fields for loading markers are:

```
Latitude: string - decimal format latitude integer
Longitude: string - decimal format longitude integer
Title: string - optional, used as marker title and default infowindow text
Id: string, integer - unique id of object, used in search service
```

## Services

<table>
  <tr>
    <th colspan="2" align="left"><a href="#markers_service">Markers</a></th>
  <tr>
  <tr>
    <th align="left">Method</th>
    <th align="left">Description</th>
  <tr>
  <tr>
    <td><pre>loadMarkers()</pre></td>
    <td>Loads json objects from specified url, sends them to be parsed and added to map</td>
  </tr>
  <tr>
    <td><pre>parseMarkers( data )</pre></td>
    <td>Parses json objects into Google maps marker class objects. Requires latitude, and longitude properties</td>
  </tr>
  <tr>
    <td><pre>addMarker( marker, i )</pre></td>
    <td>Expects an already parsed google maps marker object and adds it to the map. Optional index parameter can be passed when adding multiple markers, this is used to set the delay for the marker drop animation</td>
  </tr>
  <tr>
    <td><pre>getMarkers()</pre></td>
    <td>Returns an object array of all the current markers loaded in the map</td>
  </tr>
  <tr>
    <td><pre>getMarkerById( id )</pre></td>
    <td>Returns a Google maps marker object by searching against the unique id passed when marker was first parsed.</td>
  </tr>
  <tr>
    <th colspan="2" align="left"><a href="#options_service">Options</a></th>
  <tr>
  <tr>
    <th align="left">Method</th>
    <th align="left">Description</th>
  <tr>
  <tr>
    <td><pre>getOptions()</pre></td>
    <td>Returns a json object of Google maps service class options</td>
  </tr>
  <tr>
    <th align="left">Property</th>
    <th align="left">Description</th>
  <tr>
  <tr>
    <td><pre>mainBounds</pre></td>
    <td><a href="https://developers.google.com/maps/documentation/javascript/reference?csw=1#LatLngBounds">google.maps.LatLngBounds class contructor</a></td>
  </tr>
  <tr>
    <td><pre>mapDefaults</pre></td>
    <td><a href="https://developers.google.com/maps/documentation/javascript/reference?csw=1#MapOptions">google.maps.MapOptions object</a></td>
  </tr>
  <tr>
    <td><pre>markerImage</pre></td>
    <td><a href="https://developers.google.com/maps/documentation/javascript/reference?csw=1#Icon">google.maps.Icon object</a></td>
  </tr>
  <tr>
    <td><pre>polyLineOptions</pre></td>
    <td><a href="https://developers.google.com/maps/documentation/javascript/reference?csw=1#PolylineOptions">google.maps.PolylineOptions object</a></td>
  </tr>
  <tr>
    <td><pre>circleOptions</pre></td>
    <td><a href="https://developers.google.com/maps/documentation/javascript/reference?csw=1#CircleOptions">google.maps.CircleOptions object</a></td>
  </tr>
  <tr>
    <td><pre>panoramaOptions</pre></td>
    <td><a href="https://developers.google.com/maps/documentation/javascript/reference?csw=1#StreetViewPanoramaOptions">google.maps.StreetViewPanoramaOptions object</a></td>
  </tr>
  <tr>
    <th colspan="2" align="left"><a href="#map_service">Map</a></th>
  <tr>
  <tr>
    <th align="left">Method</th>
    <th align="left">Description</th>
  <tr>
  <tr>
    <td><pre>offSetMap( latlng )</pre></td>
    <td>Accepts a Google maps latlng object and 'offsets' the map to that position. Offset is based on the value defined in the offset attribute on the <code>google-map</code> element. The offset value is the denomiator for dividing the window width, if offset="6" then offset value equals <code>window.width()/6</code></td>
  </tr>
  <tr>
    <td><pre>apply()</pre></td>
    <td>Runs angular <code>$apply</code> on the <code>$rootScope</code> to digest any outside changes</td>
  </tr>
  <tr>
    <td><pre>geo()</pre></td>
    <td>Returns a promise object with one function <code>locate()</code> which is used to run a callback after the future object has returned. Usage would look like this: <pre>map.geo().locate().then( function( position ) { 
    //do stuff 
    });</pre>
  </tr>
</table>

















