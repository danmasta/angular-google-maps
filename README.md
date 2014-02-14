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

## Loading Markers
By default, markers are loaded using angulars $http service, and expects a json response of objects to use for markers. The marker service makes use of only three fields that are required, any other data returned is set inside of a data property on each marker. This makes it really easy for you to customize the infowindow templates, dropdown select template, or add your own custom directives to extend and use the data however you like. The minimum fields for loading markers are:

```
Latitude: string - decimal format latitude integer
Longitude: string - decimal format longitude integer
id: string, integer - unique id of object, used in search service
```













