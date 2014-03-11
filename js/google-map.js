var app = angular.module( 'google-maps', [] );

app.service('markers', [ '$rootScope', '$http', 'options', '$templateCache', function($rootScope, $http, options, $templateCache) {
  
  this.loadMarkers = function(url, params) {
    var _this = this;
    if(!url) return;
    $http.get(url, { params: params, cache: true }).success(function(data) {
      _this.parseMarkers(data);
    });
  };

  this.parseMarkers = function(data) {
    var _this = this;
    var delay;
    angular.forEach(data, function(value, key) {
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(value.latitude || value.lat, value.longitude || value.lng),
        icon: options.getOptions().markerImage,
        animation: google.maps.Animation.DROP,
        title: value.title || value.name,
        data: value
      });
      _this.addMarker(marker, key);
    });
  };

  this.addMarker = function( marker, i ) {
    $rootScope.$broadcast( 'marker.add', marker, i );
    $rootScope.markers.push( marker );
  };

  this.getMarkers = function() {
    return $rootScope.markers;
  };

  this.getMarkerById = function(id) {
    var marker = $rootScope.markers.filter(function(elem, index) {
      if(!elem.data || !elem.data.id){
        return false;
      } else if(elem.data.id.toString() === id){
        return true; 
      }
    });
    return marker;
  };
}]);

app.service('options', [ '$rootScope', function($rootScope) {

  this.getOptions = function() {
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
        map: $rootScope.map
      },
      circleOptions: {
        strokeColor: '#4588f7',
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: '#4588f7',
        fillOpacity: 0.2,
        map: $rootScope.map,
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

app.service('map', [ '$rootScope', '$http', '$q', '$window', function($rootScope, $http, $q, $window) {

  this.offSetMap = function(latlng) {
    if ($rootScope.offset) {
      var w = $window.outerWidth;
      if (w > 991) {
        $rootScope.map.panToWithOffset(latlng, -( w / $rootScope.offset ), 0);
      } else {
        $rootScope.map.panTo(latlng);
      }
    } else {
      $rootScope.map.panTo(latlng);
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

  this.apply = function() {
    $rootScope.$apply();
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
          _this.apply();
        }, function() {
          _this.handleNoGeolocation(defer);
          _this.apply();
        });
      } else {
        this.handleNoGeolocation(defer);
        this.apply();
      }
      return defer.promise;
    };
    var geocode = function(data) {
      console.log('geocode data', data);
      _this.geocoder().geocode({'address': data}, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
          defer.resolve(results[0]);
          _this.apply();
        } else {
          defer.reject(status);
          _this.apply();
        }
      });
      return defer.promise;
    };
    var geodesic = function(a, b) {
      // get distance between points in meters
      var getDistance = google.maps.geometry.spherical.computeDistanceBetween(a, b);
      // convert to miles
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

  this.getDirections = function() {
    var _this = this;
    var request = function() {
      return{
        origin: $rootScope.currentLocation.toUrlValue(),
        destination: $rootScope.activeMarker.position.toUrlValue(),
        travelMode: google.maps.TravelMode.DRIVING
      };
    };
    var directions = function() {
      var defer = $q.defer();
      new google.maps.DirectionsService().route(request(), function(results, status) {
        if (status === google.maps.DirectionsStatus.OK) {
          defer.resolve(results);
          _this.apply();
        } else {
          defer.reject(status);
          _this.apply();
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
          _this.apply();
        } else {
          defer.reject(status);
          _this.apply();
        }
      });
      return defer.promise;
    };
    return {
      streetview: streetview
    };
  };

}]);

app.controller('googleMap', function($rootScope, markers, $http) {
  $rootScope.markers = [];
  $rootScope.isVisible = {};
  console.log('google maps is running');
  console.time('gmap render');
});

app.controller('geolocateService', function($rootScope, $scope, map, options) {
  $scope.$on('map.loaded', function() {
    map.geo().locate().then(function(position) {
      console.log('geo complete');
      $rootScope.currentLocation = position;
      $scope.circle = new google.maps.Circle(options.getOptions().circleOptions);
      $scope.polyline = new google.maps.Polyline(options.getOptions().polyLineOptions);
      $scope.$emit('geo.complete');
    });
  });
});

app.directive('googleMap', function($rootScope, options, map, markers) {
  return{
    restrict: 'A',
    controller: 'googleMap',
    link: function($scope, $element, $attributes) {
      if($attributes.preload === 'true'){
        markers.loadMarkers($attributes.url, $attributes.params);
      }
      map.extendMapPrototype();
      $rootScope.offset = $attributes.offset ? $attributes.offset : false;
      $rootScope.map = new google.maps.Map($element[0], options.getOptions().mapDefaults);
      $rootScope.infoWindow = new google.maps.InfoWindow();
      $scope.$broadcast('map.loaded');
      $rootScope.isVisible.Map = true;
      if($attributes.defaultZoom) $rootScope.map.setZoom(parseInt($attributes.defaultZoom));
      google.maps.event.addDomListener(window, 'resize', function() {
        $rootScope.map.setCenter($rootScope.mapCenter);
      });
      google.maps.event.addListener($rootScope.map, 'idle', function() {
        console.log('map is idle');
        $rootScope.mapCenter = $rootScope.map.getCenter();
        $rootScope.mapZoom = $rootScope.map.getZoom();
        console.timeEnd('marker click');
      });
      console.timeEnd('gmap render');
            
      $rootScope.$on( 'marker.add', function( event, data, i ){
        var i = i ? i : 1;
        var delay = 20;
          var dropPin = function( i ) {
            return function() {
              data.setMap( $rootScope.map );
            };
          };
          google.maps.event.addListener( data, 'click', function() {
            console.time('marker click');
            $rootScope.$apply($rootScope.activeMarker = this);
            map.offSetMap(this.position);
            $rootScope.infoWindow.setContent( this.title );
            $rootScope.infoWindow.open( $rootScope.map, this );
          });
        if($attributes.clusterMarkers != 'true'){
          setTimeout( dropPin( i ), i * delay );
        } else {
          dropPin( i );
        }
      });
    }
  };
});

app.directive('zoom', function($rootScope) {
  return{
    restrict: 'A',
    link: function($scope, $element, $attributes) {
      $element.on('click', function(event) {
        event.preventDefault();
        if ($attributes.zoom === 'in') {
          $rootScope.map.setZoom($rootScope.map.getZoom() + 1);
        } else if ($attributes.zoom === 'out') {
          $rootScope.map.setZoom($rootScope.map.getZoom() - 1);
        }
      });
    }
  };
});

app.directive('infowindow', function($rootScope, map) {
  return{
    restrict: 'A',
    templateUrl: 'partials/map-infowindow.html',
    link: function($scope, $element, $attributes) {
      var _this = this;
      $rootScope.$watchCollection('markers', function(newelems) {
        angular.forEach(newelems, function(value, key) {
          google.maps.event.addListener(value, 'click', function() {
            $rootScope.$apply(function(){
              $rootScope.isVisible.Infowindow = true;
            });
          });
        });
      });
    }
  };
});

app.directive('directionService', function($rootScope, options, map, markers) {
  return{
    restrict: 'A',
    controller: 'geolocateService',
    link: function($scope, $element, $attributes) {
      $rootScope.$watchCollection('markers', function(newelems, oldval) {
        angular.forEach(newelems, function(value, key) {
          google.maps.event.addListener(value, 'click', function() {
            map.getDirections().directions().then(function(directions) {
              $scope.directions = directions;
              $scope.polyline.setOptions({ path: directions.routes[0].overview_path });
            });
          });
        });
      });
      $scope.$on('geo.complete', function() {
        $scope.circle.setCenter($rootScope.currentLocation);
        var marker = new google.maps.Marker({
          position: $rootScope.currentLocation,
          icon: options.getOptions().markerImage,
          animation: google.maps.Animation.DROP,
          title: 'You are Here'
        });
        markers.addMarker(marker);
      });
    }
  };
});

app.directive('directionInfo', function($rootScope) {
  return{
    restrict: 'A',
    templateUrl: 'partials/map-distanceinfo.html',
    link: function($scope, $element, $attributes) {
    }
  };
});

app.directive('streetviewService', function($rootScope, options, map) {
  return{
    restrict: 'A',
    link: function($scope, $element, $attributes) {
      $rootScope.$watchCollection('markers', function(newelems, oldval) {
        angular.forEach(newelems, function(value, key) {
          google.maps.event.addListener(value, 'click', function() {
            map.getStreetview(this).streetview().then(function(data) {
              $scope.$emit('streetview.success');
              $rootScope.map.getStreetView().setOptions( options.getOptions().panoramaOptions );
              $rootScope.map.getStreetView().setPano(data.location.pano);
              $rootScope.isVisible.StreetViewOpen = true;
            }, function(data) {
              $scope.$emit('streetview.fail');
              $rootScope.isVisible.StreetViewOpen = false;
            });
          });
        });
      });
    }
  };
});

app.directive('streetViewOpen', function($rootScope, options, map) {
  return{
    restrict: 'A',
    link: function($scope, $element, $attributes) {
      $scope.openStreetView = function($event){
        $scope.$emit('streetview.open');
        $rootScope.map.getStreetView().setVisible(true);
        $rootScope.isVisible.Map = false;
        $rootScope.isVisible.Infowindow = false;
      };
    }
  };
});

app.directive('streetViewClose', function($rootScope, options, map) {
  return{
    restrict: 'A',
    link: function($scope, $element, $attributes) {
      $scope.closeStreetView = function($event){
        $scope.$emit('streetview.close');
        $rootScope.map.getStreetView().setVisible(false);
        $rootScope.isVisible.Map = true;
        $rootScope.isVisible.Infowindow = true;
      };
    }
  };
});

app.directive('autoCompleteMap', function($rootScope, options, map, $filter, markers) {
  return{
    restrict: 'A',
    link: function($scope, $element, $attributes) {
      $scope.$watch($attributes.ngModel, function(value) {
        if (value && value.length > 1) {
          $scope.mapsearchresults = $filter('limitTo')($filter('filter')($rootScope.markers, { data: value }, false), 10);
          $rootScope.mapactivesearchitem = null;
        }
      });
      $element.on('focus', function() {
        $rootScope.$apply(function(){
          $rootScope.focus = true;
          $rootScope.isVisible.Infowindow = false;
        });
        $rootScope.$broadcast('mapsearch.focus');
      });
      $element.on('blur', function() {
        $rootScope.$apply(function(){
          $rootScope.focus = false;
          $rootScope.isVisible.Infowindow = true;
        });
        $rootScope.$broadcast('mapsearch.blur');
      });
      $element.on('keydown', function(event) {
        if (event.which === 38) {
          event.preventDefault();
          if ($rootScope.mapactivesearchitem && $rootScope.mapactivesearchitem.attr('tabindex') != 0) {
            var prev = $rootScope.mapactivesearchitem[0].previousSibling;
            if(prev.nodeType != 8){
              $rootScope.$apply(function(){
                $rootScope.mapactivesearchitem = angular.element(prev);
              });
            } else {
              $rootScope.$apply(function() {
                $rootScope.mapactivesearchitem = angular.element(prev.previousSibling);
              });
            }
          } else {
            $rootScope.$apply(function() {
              $rootScope.mapactivesearchitem = $scope.lastsearchitem;
            });
          }
        } else if (event.which === 40) {
          event.preventDefault();
          if ($rootScope.mapactivesearchitem && $rootScope.mapactivesearchitem.attr('tabindex') != $scope.mapsearchresults.length - 1) {
            $rootScope.$apply(function() {
              $rootScope.mapactivesearchitem = $rootScope.mapactivesearchitem.next();
            });
          } else {
            $rootScope.$apply(function() {
              $rootScope.mapactivesearchitem = $scope.firstsearchitem;
            });
          }
        } else if (event.which === 13) {
          var marker = markers.getMarkerById($rootScope.mapactivesearchitem.attr('id'));
          new google.maps.event.trigger(marker[0], 'click');
          $element.triggerHandler('blur');
        }
      });
      $rootScope.$watchCollection('markers', function(newelems, oldval) {
        angular.forEach(newelems, function(value, key) {
          google.maps.event.addListener(value, 'click', function() {
            var _this = this;
            if (this.data) {
              $scope.$apply(function() {
                $scope.mapsearch = _this.data.name;
              });
            } else {
              $scope.$apply(function() {
                $scope.mapsearch = 'Your Location';
              });
            }
          });
        });
      });
    }
  };
});

app.directive('autoCompleteResultsMap', function($rootScope, options, map, markers) {
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
            var marker = markers.getMarkerById(newval.attr('id'));
            map.offSetMap(marker[0].position);
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
    }
  };
});

app.directive('resultItemLocation', function($rootScope, options, map, markers){
  return{
    restrict:'A',
    link:function($scope, $element, $attributes){
      $scope.setActiveSearchItem = function($event){
        $rootScope.mapactivesearchitem = $element;
      };
      $element.on('mousedown', function() {
        var marker = markers.getMarkerById($attributes.id);
        new google.maps.event.trigger(marker[0], 'click');
      });
    }
  };
});

app.directive('testLocationMarkers', function($rootScope, options, map, markers){
  return{
    restrict:'A',
    link:function($scope, $element, $attributes){
      var count = 0;
      $scope.spamMarkers = function(){
        var index = 0;
        console.time('add markers timer');
        $rootScope.map.setZoom(5);
        var la = new google.maps.LatLng(40.744656,-74.005966); // Los Angeles, CA
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
              icon: options.getOptions().markerImage,
              animation: google.maps.Animation.DROP,
              title: 'Test Marker ' + i,
              data: {
                id: 'tm' + i,
                name: 'Test Marker ' + i
              }
            });
          markers.addMarker( marker, index++ );
        }
        count++;
        $scope.$emit('markers.added');
        console.timeEnd('add markers timer');
      };
    }
  };
});

app.directive('locationItems', function($rootScope, options, map, markers){
  return{
    restrict: 'A',
    templateUrl: 'partials/map-location-items.html'
  };
});

app.controller('filterLocationControl', function($rootScope, markers, $scope){
  $scope.regions = [
    {title: 'All Locations', value:'*'},
    {title: 'Yolo County', value:'Yolo County'},
    {title: 'Los Angeles County', value: 'Los Angeles County'},
    {title: 'Orange County', value: 'Orange County'}
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
});

app.directive('locationSelect', function($rootScope, options, map, markers){
  return{
    restrict: 'A',
    controller: 'filterLocationControl',
    require:'ngModel'
  };
});

app.directive('locationFilter', function($rootScope, options, map, markers){
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

app.directive('clusterMarkers', function($rootScope, map, markers){
  return{
    restrict:'A',
    link: function($scope, $element, $attributes){
      $scope.markerCluster = new MarkerClusterer($rootScope.map, $rootScope.markers);
      $scope.$on('marker.add', function(event, data, i){
        $scope.markerCluster.addMarker(data);
      });
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
          map.offSetMap($scope.currentLocation);
        });
      } else {
        $scope.$on('map.loaded', function(){
          map.geo().code($attributes.origin).then(function(results){
            $scope.originInfo = results;
            $scope.originPos = new google.maps.LatLng(results.geometry.location.lat(), results.geometry.location.lng());
            $scope.$emit('origin.loaded');
            map.offSetMap($scope.originPos);
            markers.parseMarkers([{latitude:results.geometry.location.lat(),longitude:results.geometry.location.lng(),title:'Origin'}]);
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