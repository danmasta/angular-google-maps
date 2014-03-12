var app = angular.module( 'google-maps', [] );

app.service('markers', [ '$http', 'options', '$templateCache', function($http, options, $templateCache) {
  
  this.loadMarkers = function(url, params, $scope) {
    var _this = this;
    if(!url) return;
    $http.get(url, { params: params, cache: true }).success(function(data) {
      _this.parseMarkers(data, $scope);
    });
  };

  this.parseMarkers = function(data, $scope) {
    var _this = this;
    var $scope = $scope
    angular.forEach(data, function(value, key) {
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(value.latitude || value.lat, value.longitude || value.lng),
        icon: options.getOptions($scope).markerImage,
        animation: google.maps.Animation.DROP,
        title: value.title || value.name,
        data: value
      });
      _this.addMarker(marker, key, $scope);
    });
  };

  this.addMarker = function( marker, i, $scope ) {
    $scope.$broadcast( 'marker.add', marker, i );
    $scope.markers.push( marker );
  };

  this.getMarkers = function($scope) {
    return $scope.markers;
  };

  this.getMarkerById = function(id, $scope) {
    var marker = $scope.markers.filter(function(elem, index) {
      if(!elem.data || !elem.data.id){
        return false;
      } else if(elem.data.id.toString() === id.toString()){
        return true; 
      }
    });
    return marker;
  };
}]);

app.service('options', [ function() {

  this.getOptions = function($scope) {
    var options = {
      mainBounds: new google.maps.LatLngBounds(),
      mapDefaults: {
        zoom: 7,
        center: new google.maps.LatLng('33.815556', '-117.889723'),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        scaleControl: false,
        navigationControl: false,
        scrollwheel: false
      },
      markerImage: null,
      polyLineOptions: {
        strokeColor: '#4588f7',
        strokeOpacity: 1.0,
        strokeWeight: 5,
        map: $scope.map
      },
      circleOptions: {
        strokeColor: '#4588f7',
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: '#4588f7',
        fillOpacity: 0.2,
        map: $scope.map,
        radius: 5000
      },
      panoramaOptions: {
        addressControlOptions: {
          position: google.maps.ControlPosition.TOP_LEFT
        },
        linksControl: false,
        panControl: true,
        zoomControl: false,
        enableCloseButton: false
      }
    };
    return options;
  };
  
}]);

app.service('map', [ '$http', '$q', '$window', function($http, $q, $window) {

  this.offSetMap = function($scope, latlng) {
    if ($scope.offset) {
      var w = $window.outerWidth;
      if (w > 991) {
        $scope.map.panToWithOffset(latlng, -( w / $scope.offset ), 0);
      } else {
        $scope.map.panTo(latlng);
      }
    } else {
      $scope.map.panTo(latlng);
    }
  };

  this.extendMapPrototype = function() {
    google.maps.Map.prototype.panToWithOffset = function(latlng, offsetX, offsetY) {
      var map = this;
      var ov = new google.maps.OverlayView();
      ov.onAdd = function() {
        var proj = this.getProjection();
        var aPoint = proj.fromLatLngToContainerPixel(latlng);
        aPoint.x = aPoint.x + offsetX;
        aPoint.y = aPoint.y + offsetY;
        map.panTo(proj.fromContainerPixelToLatLng(aPoint));
      };
      ov.draw = function() {};
      ov.setMap(this);
    };
  };

  this.geocoder = function(){
    return new google.maps.Geocoder();
  };

  this.geo = function() {
    var _this = this;
    var defer = $q.defer();
    var geolocate = function() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          defer.resolve(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
        }, function() {
          _this.handleNoGeolocation(defer);
        });
      } else {
        this.handleNoGeolocation(defer);
      }
      return defer.promise;
    };
    var geocode = function(data) {
      _this.geocoder().geocode({'address': data}, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
          defer.resolve(results[0]);
        } else {
          defer.reject(status);
        }
      });
      return defer.promise;
    };
    var geodesic = function(a, b) {
      var getDistance = google.maps.geometry.spherical.computeDistanceBetween(a, b);
      defer.resolve((getDistance * 0.000621371).toFixed(2));
      return defer.promise;
    };
    return {
      locate: geolocate,
      code: geocode,
      distance: geodesic
    };
  };

  this.handleNoGeolocation = function(defer) {
    $http.get('http://ipinfo.io/json').success(function(response) {
      var latlng = response.loc.split(',', 2);
      defer.resolve(new google.maps.LatLng(latlng[0], latlng[1]));
    });
  };

  this.getDirections = function($scope) {
    var _this = this;
    var request = function() {
      return{
        origin: $scope.currentLocation ? $scope.currentLocation.toUrlValue() : $scope.originPos,
        destination: $scope.activeMarker.position.toUrlValue(),
        travelMode: google.maps.TravelMode.DRIVING
      };
    };
    var directions = function() {
      var defer = $q.defer();
      new google.maps.DirectionsService().route(request(), function(results, status) {
        if (status === google.maps.DirectionsStatus.OK) {
          defer.resolve(results);
        } else {
          defer.reject(status);
        }
      });
      return defer.promise;
    };
    return {
      directions: directions
    };
  };

  this.getStreetview = function(marker) {
    var _this = this;
    var streetview = function() {
      var defer = $q.defer();
      new google.maps.StreetViewService().getPanoramaByLocation(marker.position, 50, function(data, status) {
        if (status === google.maps.StreetViewStatus.OK) {
          defer.resolve(data);
          //_this.apply();
        } else {
          defer.reject(status);
          //_this.apply();
        }
      });
      return defer.promise;
    };
    return {
      streetview: streetview
    };
  };

}]);

app.controller('googleMapCtrl', function(markers, $http, $scope) {
  $scope.markers = [];
  $scope.isVisible = {};
  console.log('google maps is running');
  console.time('gmap render');
});

app.controller('geolocateService', function($scope, map, options) {
  $scope.$on('map.loaded', function() {
    map.geo().locate().then(function(position) {
      console.log('geo complete');
      $scope.currentLocation = position;
      $scope.circle = new google.maps.Circle(options.getOptions($scope).circleOptions);
      $scope.polyline = new google.maps.Polyline(options.getOptions($scope).polyLineOptions);
      $scope.$emit('geo.complete');
    });
  });
});

app.directive('googleMap', function(options, map, markers, $timeout) {
  return{
    restrict: 'A',
    controller: 'googleMapCtrl',
    //scope:{},
    link: function($scope, $element, $attributes) {
      
      map.extendMapPrototype();
      $scope.offset = $attributes.offset ? $attributes.offset : false;
      $scope.map = new google.maps.Map($element[0]);
      $scope.map.setOptions(options.getOptions($scope).mapDefaults);
      if($attributes.preload === 'true'){
        markers.loadMarkers($attributes.url, $attributes.params, $scope);
      }
      $scope.infoWindow = new google.maps.InfoWindow();
      $scope.$broadcast('map.loaded');
      $scope.isVisible.Map = true;
      if($attributes.defaultZoom) $scope.map.setZoom(parseInt($attributes.defaultZoom));
      google.maps.event.addDomListener(window, 'resize', function() {
        $scope.map.setCenter($scope.mapCenter);
      });
      google.maps.event.addListener($scope.map, 'idle', function() {
        console.log('map is idle');
        $scope.mapCenter = $scope.map.getCenter();
        $scope.mapZoom = $scope.map.getZoom();
        console.timeEnd('marker click');
      });
      console.timeEnd('gmap render');
            
      $scope.$on( 'marker.add', function( event, data, i ){
        var i = i ? i : 1;
        var delay = 20;
        var dropPin = function( i ) {
          return function() {
            data.setMap( $scope.map );
          };
        };
        google.maps.event.addListener( data, 'click', function() {
          console.time('marker click');
          $scope.activeMarker = this;
          $scope.$broadcast('marker.click', this);
          map.offSetMap($scope, this.position);
          $scope.infoWindow.setContent( this.title );
          $scope.infoWindow.open( $scope.map, this );
        });
        if($attributes.clusterMarkers != 'true'){
          setTimeout( dropPin( i ), i * delay );
        } else {
          dropPin( i );
        }
      });
    }
  }
});

app.directive('zoom', function() {
  return{
    restrict: 'A',
    link: function($scope, $element, $attributes, $controller) {
      $element.on('click', function(event) {
        event.preventDefault();
        if ($attributes.zoom === 'in') {
          $scope.map.setZoom($scope.map.getZoom() + 1);
        } else if ($attributes.zoom === 'out') {
          $scope.map.setZoom($scope.map.getZoom() - 1);
        }
      });
    }
  };
});

app.directive('infowindow', function(map) {
  return{
    restrict: 'A',
    templateUrl: 'partials/map-infowindow.html',
    link: function($scope, $element, $attributes) {
      $scope.$on('marker.click', function(event, marker){
        $scope.isVisible.Infowindow = true;
      });
    }
  };
});

app.directive('directionService', function(options, map, markers, $timeout) {
  return{
    restrict: 'A',
    controller: 'geolocateService',
    link: function($scope, $element, $attributes) {
      $scope.$on('marker.click', function(event, marker){
        map.getDirections($scope).directions().then(function(directions){
          $scope.directions = directions;
          $scope.polyline.setOptions({ path: directions.routes[0].overview_path });
        });
      });
      
      $scope.$on('geo.complete', function() {
        $scope.circle.setCenter($scope.currentLocation);
        var marker = new google.maps.Marker({
          position: $scope.currentLocation,
          icon: options.getOptions($scope).markerImage,
          animation: google.maps.Animation.DROP,
          title: 'You are Here'
        });
        markers.addMarker(marker, null, $scope);
      });
    }
  };
});

app.directive('directionInfo', function() {
  return{
    restrict: 'A',
    templateUrl: 'partials/map-distanceinfo.html'
  };
});

app.directive('streetviewService', function(options, map) {
  return{
    restrict: 'A',
    link: function($scope, $element, $attributes) {
      $scope.$on('marker.click', function(event, marker){
        map.getStreetview(marker).streetview().then(function(data) {
          $scope.$emit('streetview.success');
          $scope.map.getStreetView().setOptions( options.getOptions($scope).panoramaOptions );
          $scope.map.getStreetView().setPano(data.location.pano);
          $scope.isVisible.StreetViewOpen = true;
        }, function(data) {
          $scope.$emit('streetview.fail');
          $scope.isVisible.StreetViewOpen = false;
        });
      });
    }
  };
});

app.directive('streetViewOpen', function(options, map) {
  return{
    restrict: 'A',
    link: function($scope, $element, $attributes) {
      $scope.openStreetView = function($event){
        $scope.$emit('streetview.open');
        $scope.map.getStreetView().setVisible(true);
        $scope.isVisible.Map = false;
        $scope.isVisible.Infowindow = false;
      };
    }
  };
});

app.directive('streetViewClose', function(options, map) {
  return{
    restrict: 'A',
    link: function($scope, $element, $attributes) {
      $scope.closeStreetView = function($event){
        $scope.$emit('streetview.close');
        $scope.map.getStreetView().setVisible(false);
        $scope.isVisible.Map = true;
        $scope.isVisible.Infowindow = true;
      };
    }
  };
});

app.directive('autoCompleteMap', function(options, map, $filter, markers) {
  return{
    restrict: 'A',
    link: function($scope, $element, $attributes) {
      $scope.$watch($attributes.ngModel, function(value) {
        if (value && value.length > 1) {
          $scope.mapsearchresults = $filter('limitTo')($filter('filter')($scope.markers, { data: value }, false), 10);
          $scope.mapactivesearchitem = null;
        }
      });
      $element.on('focus', function() {
        console.log('input focused, do something');
        $scope.$apply(function(){
          $scope.focus = true;
          $scope.isVisible.Infowindow = false;
        });
        $scope.$broadcast('mapsearch.focus');
      });
      $element.on('blur', function() {
        console.log('input blured, do something');
        $scope.$apply(function(){
          $scope.focus = false;
          $scope.isVisible.Infowindow = true;
        });
        $scope.$broadcast('mapsearch.blur');
      });
      $element.on('keydown', function(event) {
        if (event.which === 38) {
          event.preventDefault();
          if ($scope.mapactivesearchitem && $scope.mapactivesearchitem.attr('tabindex') != 0) {
            var prev = $scope.mapactivesearchitem[0].previousSibling;
            if(prev.nodeType != 8){
              $scope.$apply(function(){
                $scope.mapactivesearchitem = angular.element(prev);
              });
            } else {
              $scope.$apply(function() {
                $scope.mapactivesearchitem = angular.element(prev.previousSibling);
              });
            }
          } else {
            $scope.$apply(function() {
              $scope.mapactivesearchitem = $scope.lastsearchitem;
            });
          }
        } else if (event.which === 40) {
          event.preventDefault();
          if ($scope.mapactivesearchitem && $scope.mapactivesearchitem.attr('tabindex') != $scope.mapsearchresults.length - 1) {
            $scope.$apply(function() {
              $scope.mapactivesearchitem = $scope.mapactivesearchitem.next();
            });
          } else {
            $scope.$apply(function() {
              $scope.mapactivesearchitem = $scope.firstsearchitem;
            });
          }
        } else if (event.which === 13) {
          var marker = markers.getMarkerById($scope.mapactivesearchitem.attr('id'), $scope);
          new google.maps.event.trigger(marker[0], 'click');
          $element.triggerHandler('blur');
        }
      });
            
      $scope.$on('marker.click', function(event, marker){
        if (marker.data) {
          $scope.mapsearch = marker.data.title || marker.data.name;
        } else {
          $scope.mapsearch = 'Your Location';
        }
      });
      
    }
  };
});

app.directive('autoCompleteResultsMap', function(options, map, markers) {
  return{
    restrict: 'A',
    templateUrl: 'partials/map-search-result.html',
    link: function($scope, $element, $attributes) {
      $scope.$watch('mapactivesearchitem', function(newval, oldval) {
        if (newval != oldval) {
          if (oldval) {
            oldval.removeClass('active');
          }
          if (newval) {
            var marker = markers.getMarkerById(newval.attr('id'), $scope);
            map.offSetMap($scope, marker[0].position);
            newval.addClass('active');
          }
        }
      });
      $scope.$watch('mapsearchresults', function(newval, oldval) {
        if (newval) {
          var childs = $element.children();
          $scope.firstsearchitem = angular.element(childs[0]);
          $scope.lastsearchitem = angular.element(childs[childs.length-1]);
        }
      });
      $scope.setActiveSearchItem = function($elem){
        $scope.mapactivesearchitem = $elem;
      };
      $scope.setMarkerTrigger = function($index){
        new google.maps.event.trigger(markers.getMarkerById($index, $scope)[0], 'click');
      }
    }
  };
});

app.directive('resultItemLocation', function(options, map, markers, $timeout){
  return{
    restrict:'A',
    link:function($scope, $element, $attributes){
      $scope.resultItemClick = function(){
        $scope.setActiveSearchItem($element);
      }
    }
  };
});

app.directive('testLocationMarkers', function(options, map, markers){
  return{
    restrict:'A',
    link:function($scope, $element, $attributes){
      var count = 0;
      $scope.spamMarkers = function(){
        var index = 0;
        console.time('add markers timer');
        $scope.map.setZoom(5);
        var la = new google.maps.LatLng(40.744656,-74.005966);  // Los Angeles, CA
        var ny = new google.maps.LatLng(34.052234,-118.243685); // New York, NY
        var lngSpan = ny.lng() - la.lng();
        var latSpan = ny.lat() - la.lat();
        var randomLatlng = function(){
          return new google.maps.LatLng(
            la.lat() + latSpan * Math.random(),
            la.lng() + lngSpan * Math.random()
          );
        }
        for( var i = count*1000; i < (count+1)*1000; i++ ){
            var marker = new google.maps.Marker({
              position: randomLatlng(),
              icon: options.getOptions($scope).markerImage,
              animation: google.maps.Animation.DROP,
              title: 'Test Marker ' + i,
              data: {
                id: 'tm' + i,
                name: 'Test Marker ' + i
              }
            });
          markers.addMarker( marker, index++, $scope );
        }
        count++;
        $scope.$emit('markers.added');
        console.timeEnd('add markers timer');
      };
    }
  };
});

app.directive('locationItems', function(options, map, markers, $timeout){
  return{
    restrict: 'A',
    templateUrl: 'partials/map-location-items.html',
    link: function($scope, $element, $attribute){
      $scope.locationItemClick = function($event,data){
        $event.preventDefault();
        $timeout(function(){
          new google.maps.event.trigger(data, 'click');
        });
      };
    }
  };
});

app.controller('filterLocationControl', function(markers, $scope){
  $scope.regions = [
    {title: 'All Locations', value:'*'}
  ];
  $scope.locationfilter = function(item){
    if(item && item.data){
      if ($scope.regionsfilter.value === undefined || $scope.regionsfilter.title.length === 0 || $scope.regionsfilter.value === '*') {
        return true;
      }
      var found = false;
      angular.forEach(item, function (location) {          
        if (item.data.region === ($scope.regionsfilter.value)) {
          found = true;
        }
      });
      return found;
    }
  };
  $scope.$on('marker.add', function(event, data){
    if(!data.data || !data.data.region) return;
    var isRegion = false;
    for(var i = 0; i < $scope.regions.length; i++){
      if($scope.regions[i].title === data.data.region){
        isRegion = true;
      }
    }
    if(!isRegion) $scope.regions.push({title:data.data.region, value:data.data.region});
  });
});

app.directive('locationSelect', function(options, map, markers){
  return{
    restrict: 'A',
    controller: 'filterLocationControl',
    require:'ngModel'
  };
});

app.directive('locationFilter', function(options, map, markers){
  return{
    restrict: 'A',
    controller: 'filterLocationControl',
    templateUrl: 'partials/map-location-filter.html',
    link: function($scope, $element, $attributes){
      $scope.addFilter = function(item){
        $scope.regionsfilter = item;
      };
      $scope.regionsfilter = $scope.regions[0];
    }
  };
});

app.directive('clusterMarkers', function(map, markers){
  return{
    restrict:'A',
    link: function($scope, $element, $attributes){
      if($attributes.clusterMarkers === 'true'){
        $scope.markerCluster = new MarkerClusterer($scope.map, $scope.markers);
        $scope.$on('marker.add', function(event, data, i){
          $scope.markerCluster.addMarker(data);
        });
      }
    }
  };
});

app.directive('origin', function($http, map, markers, options){
  return{
    restrict:'A',
    controller:'geolocateService',
    link: function($scope, $element, $attributes){
      if($attributes.origin === 'user'){
        $scope.$on('geo.complete', function(){
          map.offSetMap($scope, $scope.currentLocation);
        });
      } else {
        $scope.$on('map.loaded', function(){
          map.geo().code($attributes.origin).then(function(results){
            $scope.originInfo = results;
            $scope.originPos = new google.maps.LatLng(results.geometry.location.lat(), results.geometry.location.lng());
            $scope.$emit('origin.loaded');
            map.offSetMap($scope, $scope.originPos);
            markers.parseMarkers([{latitude:results.geometry.location.lat(),longitude:results.geometry.location.lng(),title:'Origin'}], $scope);
          }, function(status){
            $scope.map.setZoom(3);
          });
        });
      }
    }
  };
});

app.directive('originInfo', function($http, map){
  return{
    restrict:'A',
    templateUrl: 'partials/map-origin-info.html',
    link: function($scope, $element, $attributes){
      function getDistance(){
        function setDistance(){
          map.geo().distance($scope.currentLocation, $scope.originPos).then(function(data, distance){
            $scope.countryInfo.distance = data;
          });
        }
        if($scope.currentLocation && $scope.originPos){
          setDistance();
        } else {
          $scope.$on('geo.complete', function(){
            setDistance();
          }); 
        }
      };
      function getDescription(){
        $http.get('https://www.googleapis.com/freebase/v1/topic/authority/iso/3166-1/alpha-3/' + $scope.countryInfo.isoAlpha3 + '?filter=/common/topic/description').success(function(data, status){
          $scope.countryInfo.description = data.property['/common/topic/description'].values[0];
          $scope.countryInfo.description.current = $scope.countryInfo.description.text;
          $scope.isVisible.originInfo = true;
          getDistance();
        });
      };
      function getInfo(){
        $http.get('http://api.geonames.org/countryInfoJSON', {params:{country:$scope.originInfo.address_components[0].short_name, username:'beddaniel'}}).success(function(data, status){
          $scope.countryInfo = data.geonames[0];
          getDescription();
        });
      };
      $scope.$on('origin.loaded', getInfo);
    }
  };
});

app.directive('moreInfo', function(){
  return{
    restrict:'A',
    link:function($scope, $element, $attributes){
      $scope.moreInfoLabel = 'more';
      $scope.moreInfo = function(){
        if($scope.moreInfoLabel === 'more'){
          $scope.countryInfo.description .current = $scope.countryInfo.description.value;
          $scope.moreInfoLabel = 'less';
        } else {
          $scope.countryInfo.description .current = $scope.countryInfo.description.text;
          $scope.moreInfoLabel = 'more';
        }
      };
    }
  };
});

app.directive('staticMap', function(){
  return{
    restric:'A',
    link: function($scope, $element, $attributes){
      $scope.$on('map.loaded', function(){
        var options = {
          zoom: 5,
          disableDefaultUI: true,
          panControl: false,
          draggable: false,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          overviewMapControl: false,
          scrollwheel: false
        };
        $scope.map.setOptions(options);
      });
    }
  };
});