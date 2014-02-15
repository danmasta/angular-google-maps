var locations = angular.module( 'google-maps', [] );

locations.service( 'markers', [ '$rootScope', '$http', 'options', function( $rootScope, $http, options ) {
  
  this.loadMarkers = function( url, params ) {
    var _this = this;
    //$http.get( 'http://potspace.io/wp_api/v1/posts', { params: { post_type:'dispensaries', orderby:'modified' } } ).success( function( data ){
    //  _this.parseMarkers(data.posts);
    //});
    $http.get( url, { params: params } ).success( function( data ){
      _this.parseMarkers(data.posts);
    });
  };
  
  this.parseMarkers = function( data ) {
    var _this = this;
    var delay;
    angular.forEach( data, function( value, key ) {
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng( value.latitude, value.longitude ),
        icon: options.getOptions().markerImage,
        animation: google.maps.Animation.DROP,
        title: value.title,
        data: value
      });
      _this.addMarker( marker, key );
    });
  };
    
  this.addMarker = function( marker, i ) {
    $rootScope.$broadcast( 'marker.add', marker, i );
    $rootScope.markers.push( marker );
  };
  
  this.getMarkers = function() {
    return $rootScope.markers;
  };
  
  this.getMarkerById = function( id ) {
    var marker = $rootScope.markers.filter( function( elem ) {
      return elem.data && elem.data.id.toString() === id;
    });
    return marker;
  };
  
}]);

locations.service( 'options', [ '$rootScope', function( $rootScope ) {
  
  this.getOptions = function() {
    var options = {
      mainBounds: new google.maps.LatLngBounds(),
      mapDefaults: {
        zoom: 12,
        center: new google.maps.LatLng(33.680883333333334, -117.83948333333333),
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

locations.service( 'map', [ '$rootScope', '$http', '$q', function( $rootScope, $http, $q ) {
  
  this.offSetMap = function( latlng ){
    if( $rootScope.offset ){
      var w = angular.element( window ).width();
      if( w > 991 ) {
        $rootScope.map.panToWithOffset( latlng, -( w / $rootScope.offset ), 0 );
      } else {
        $rootScope.map.panTo( latlng );
      }
    } else {
      $rootScope.map.panTo( latlng );
    }
  };
  
  this.extendMapPrototype = function() {
    google.maps.Map.prototype.panToWithOffset = function( latlng, offsetX, offsetY ) {
      var map = this;
      var ov = new google.maps.OverlayView();
      ov.onAdd = function() {
        var proj = this.getProjection();
        var aPoint = proj.fromLatLngToContainerPixel( latlng );
        aPoint.x = aPoint.x + offsetX;
        aPoint.y = aPoint.y + offsetY;
        map.panTo( proj.fromContainerPixelToLatLng( aPoint ) );
      };
      ov.draw = function() {};
      ov.setMap( this );
    };
  };
  
  this.apply = function() {
    $rootScope.$apply();
  };
  
  this.geo = function() {
    var _this = this;
    var defer = $q.defer();
    var locate = function() {
      if( navigator.geolocation ) {
        navigator.geolocation.getCurrentPosition( function( position ) {
          defer.resolve( new google.maps.LatLng( position.coords.latitude, position.coords.longitude ) );
          _this.apply();
        }, function() {
          _this.handleNoGeolocation( defer );
          _this.apply();
        });
      } else {
        this.handleNoGeolocation( defer );
        this.apply();
      }
      return defer.promise;
    };
    return {
      locate: locate
    };
  };
  
  this.handleNoGeolocation = function( defer ) {
    $http.get('http://ipinfo.io/json').success( function( response ) {
      var latlng = response.loc.split( ',', 2 );
      defer.resolve( new google.maps.LatLng( latlng[0], latlng[1] ) );
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
    var directions = function () {
      var defer = $q.defer();
      new google.maps.DirectionsService().route( request(), function ( results, status ) {
        if ( status === google.maps.DirectionsStatus.OK ) {
          defer.resolve( results );
          _this.apply();
        } else {
          defer.reject( status );
          _this.apply();
        }
      });
      return defer.promise;
    };
    return {
      directions: directions
    };
  };
  
  this.getStreetview = function( marker ) {
    var _this = this;
    var streetview = function() {
      var defer = $q.defer();
      new google.maps.StreetViewService().getPanoramaByLocation( marker.position, 50, function( data, status ){
        if ( status === google.maps.StreetViewStatus.OK ) {
          defer.resolve( data );
          _this.apply();
        } else {
          defer.reject( status );
          _this.apply();
        }
      });
      return defer.promise;
    };
    return {
      streetview: streetview
    };
  };
  
  this.setVisible = function( element ) {
    element.show().animate({'opacity':1}, 200);
  };
  
  this.setHidden = function( element ) {
    element.animate({'opacity':0}, 200, function() {
      element.hide();
    });
  };
  
}]);


locations.controller( 'directionservice', function( $rootScope, $scope, map, options ) {
  map.geo().locate().then( function( position ) {
    console.log('geo complete');
    $rootScope.currentLocation = position;
    $scope.circle =  new google.maps.Circle( options.getOptions().circleOptions );
    $scope.polyline = new google.maps.Polyline( options.getOptions().polyLineOptions );
    $scope.$emit( 'geo.complete' );
  });
});

locations.run( function( $rootScope, markers, $http ) {
  $rootScope.markers = [];
  //markers.loadMarkers();
  console.log('google maps is running');
});

locations.directive( 'googleMap', function( $rootScope, options, map, markers ) {
  return{
    restrict: 'E',
    link: function( $scope, $element, $attributes ) {
      console.log($attributes);
      if( $attributes.preload ){
        markers.loadMarkers( $attributes.url, $attributes.params );
      }
      map.extendMapPrototype();
      $rootScope.offset = $attributes.offset ? $attributes.offset : false;
      $rootScope.map = new google.maps.Map( $element[0], options.getOptions().mapDefaults );
      $rootScope.infoWindow = new google.maps.InfoWindow();
      google.maps.event.addDomListener( window, 'resize', function() {
        $rootScope.map.setCenter( $rootScope.mapCenter );
      });
      google.maps.event.addListener( $rootScope.map, 'idle', function() {
        console.log('map is idle');
        $rootScope.mapCenter = $rootScope.map.getCenter();
        $rootScope.mapZoom = $rootScope.map.getZoom();
      });
      $rootScope.$on( 'marker.add', function( event, data, i ){
        var i = i ? i : 1;
        var delay = 20;
          var dropPin = function( i ) {
            return function() {
              data.setMap( $rootScope.map );
            };
          };
          google.maps.event.addListener( data, 'click', function() {
            var _this = this;
            $rootScope.$apply( function(){
              $rootScope.activeMarker = _this;
            });
            $scope.activemarker = this;
            map.offSetMap( this.position );
            $rootScope.infoWindow.setContent( this.title );
            $rootScope.infoWindow.open( $rootScope.map, this );
          });
          setTimeout( dropPin( i ), i * delay );
      });
    }
  };
});

locations.directive( 'zoom', function( $rootScope ) {
  return{
    restrict: 'A',
    link: function( $scope, $element, $attributes ){
      $element.on('click', function( event ) {
        event.preventDefault();
        if( $attributes.zoom === 'in' ){
          $rootScope.map.setZoom( $rootScope.map.getZoom() + 1 );
        } else if( $attributes.zoom === 'out' ) {
          $rootScope.map.setZoom( $rootScope.map.getZoom() - 1 );
        }
      });
    }
  };
});

locations.directive( 'infowindow', function( $rootScope, map ) {
  return{
    restrict: 'A',
    template:
      '<div class="left col-xs-7">' +
      '<div class="title">{{activemarker.data.title}}</div>' +
      '</div>' +
      '<div class="right col-xs-5">' +
      '<a street-view-open>Streetview Open</a>' +
      '<div direction-info></div>' +
      '</div>',
    link: function( $scope, $element, $attributes ) {
      var _this = this;
      $rootScope.$watchCollection( 'markers', function( newelems ) {
        angular.forEach( newelems , function( value, key ) {
          google.maps.event.addListener( value, 'click', function() {
            if( !$element.is( ':visible' ) && value.data ){
              map.setVisible( $element );
            }
            if( !value.data ){
              map.setHidden( $element );
            }
          });
        });
      });
      $scope.$on( 'streetview.open', function() {
        map.setHidden( $element );
      });
      $rootScope.$on( 'search.focus', function() {
        map.setHidden( $element );
      });
      $scope.$on( 'streetview.close', function() {
        map.setVisible( $element );
      });
      $rootScope.$on( 'search.blur', function() {
        map.setVisible( $element );
      });
    }
  };
});

locations.directive( 'directionService', function( $rootScope, options, map, markers ) {
  return{
    restrict: 'A',
    controller: 'directionservice',
    link: function( $scope, $element, $attributes ) {
      $rootScope.$watchCollection( 'markers', function( newelems, oldval ) {
        angular.forEach( newelems , function( value, key ) {
          google.maps.event.addListener( value, 'click', function() {
            if( $rootScope.currentLocation ){
              map.getDirections().directions().then( function( directions ) {
                $scope.directions = directions;
                $scope.polyline.setOptions({ path:directions.routes[0].overview_path });
              });
            }
          });
        });
      });
      $scope.$on( 'geo.complete', function() {
        $scope.circle.setCenter( $rootScope.currentLocation );
        var marker = new google.maps.Marker({
          position: $rootScope.currentLocation,
          icon: options.getOptions().markerImage,
          animation: google.maps.Animation.DROP,
          title: 'You are Here'
        });
        markers.addMarker( marker );
      });
    }
  };
});

locations.directive( 'directionInfo', function( $rootScope ) {
  return{
    restrict: 'A',
    template:
      '<div class="distance">Distance: {{directions.routes[0].legs[0].distance.text}}</div>' +
      '<div class="duration">Duration: {{directions.routes[0].legs[0].duration.text}}</div>',
    link: function( $scope, $element, $attributes ) {
    }
  };
});

locations.directive( 'streetviewService', function( $rootScope, options, map ) {
  return{
    restrict: 'A',
    link: function( $scope, $element, $attributes ) {
      $rootScope.$watchCollection( 'markers', function( newelems, oldval ) {
        angular.forEach( newelems , function( value, key ) {
          google.maps.event.addListener( value, 'click', function() {
            map.getStreetview( this ).streetview().then( function( data ) {
              $scope.$emit( 'streetview.success' );
              $rootScope.map.getStreetView().setOptions( options.getOptions().panoramaOptions );
              $rootScope.map.getStreetView().setPano( data.location.pano );
            }, function( data ) {
              $scope.$emit( 'streetview.fail' );
            });
          });
        });
      });
    }
  };
});

locations.directive( 'streetViewOpen', function( $rootScope, options, map ) {
  return{
    restrict: 'A',
    link: function( $scope, $element, $attributes ) {
      $element.on( 'click', function( event ){
        event.preventDefault();
        $scope.$emit( 'streetview.open' );
        $rootScope.map.getStreetView().setVisible( true );
      });
      $scope.$on( 'streetview.fail', function() {
        map.setHidden( $element );
      });
      $scope.$on( 'streetview.success', function() {
        map.setVisible( $element );
      });
    }
  };
});

locations.directive( 'streetViewClose', function( $rootScope, options, map ) {
  return{
    restrict: 'A',
    link: function( $scope, $element, $attributes ) {
      $element.on( 'click', function( event ) {
        event.preventDefault();
        $scope.$emit( 'streetview.close' );
        $rootScope.map.getStreetView().setVisible( false );
      });
      $scope.$on( 'streetview.open', function() {
        map.setVisible( $element );
      });
      $scope.$on( 'streetview.close', function() {
        map.setHidden( $element );
      });
    }
  };
});

locations.directive( 'autoComplete', function( $rootScope, options, map, $filter, markers ) {
  return{
    restrict: 'A',
    link: function( $scope, $element, $attributes ) {
      $scope.$watch( $attributes.ngModel, function( value ) {
        if( value && value.length > 1 ){
          $scope.searchresults = $filter('limitTo')( $filter( 'filter' )( $rootScope.markers, { data:value }, false ), 10 );
          $scope.activesearchitem = null;
        }
      });
      $element.on( 'focus', function() {
        $rootScope.$broadcast( 'search.focus' );
      });
      $element.on( 'blur', function() {
        $rootScope.$broadcast( 'search.blur' );
      });
      $element.on( 'keydown', function( event ) {
        if( event.which === 38 ){
          event.preventDefault();
          if( $scope.activesearchitem && $scope.activesearchitem.attr( 'tabindex' ) != 0 ){
            $scope.$apply( function() {
              $scope.activesearchitem = $scope.activesearchitem.prev();
            });
          } else {
            $scope.$apply( function() {
              $scope.activesearchitem = $scope.lastsearchitem;
            });
          }
        } else if( event.which === 40 ){
          event.preventDefault();
          if( $scope.activesearchitem && $scope.activesearchitem.attr( 'tabindex' ) != $scope.searchresults.length -1 ){
            $scope.$apply( function() {
              $scope.activesearchitem = $scope.activesearchitem.next();
            });
          } else {
            $scope.$apply( function() {
              $scope.activesearchitem = $scope.firstsearchitem;
            });
          }
        } else if( event.which === 13 ){
          var marker = markers.getMarkerById( $scope.activesearchitem.attr( 'id' ) );
          new google.maps.event.trigger( marker[0], 'click' );
          $element.blur();
        }
      });
      $rootScope.$watchCollection( 'markers', function( newelems, oldval ) {
        angular.forEach( newelems , function( value, key ) {
          google.maps.event.addListener( value, 'click', function() {
            var _this = this;
            if( this.data ){
              $scope.$apply( function() {
                $scope.search = _this.data.title;
              });
            } else {
              $scope.$apply( function() {
                $scope.search = 'Your Location';
              });
            }
          });
        });
      });
      $scope.$on( 'streetview.open', function() {
        map.setHidden( $element );
      });
      $scope.$on( 'streetview.close', function() {
        map.setVisible( $element );
      });
    }
  };
});

locations.directive( 'autoCompleteResults', function( $rootScope, options, map, markers ) {
  return{
    restrict: 'A',
    template:
      '<li ng-repeat="result in searchresults" tabindex="{{$index}}" id={{result.data.id}} result-item-location>{{result.data.title}}</li>',
    link: function( $scope, $element, $attributes ) {
      $rootScope.$on( 'search.focus', function() {
        $element.show();
      });
      $rootScope.$on( 'search.blur', function() {
        $element.hide();
      });
      $element.on({
        mouseenter:function( event ) {
          var _this = angular.element(this);
          var marker = markers.getMarkerById( _this.attr( 'id' ) );
          $scope.$apply( function() {
            $scope.activesearchitem = _this;
          });
        },
        mousedown: function( event ) {
          var _this = angular.element(this);
          var marker = markers.getMarkerById( _this.attr( 'id' ) );
          new google.maps.event.trigger( marker[0], 'click' );
        }
      },'li');
      $scope.$watch( 'activesearchitem', function( newval, oldval ) {
        if( newval != oldval ){
          if( oldval ){
            oldval.removeClass('active');
          }
          if( newval ){
            var marker = markers.getMarkerById( newval.attr( 'id' ) );
            map.offSetMap( marker[0].position );
            newval.addClass('active');
          }
        }
      });
      $scope.$watch( 'searchresults', function( newval, oldval ) {
        if( newval ){
          $scope.firstsearchitem = $element.children().first();
          $scope.lastsearchitem = $element.children().last();
        }
      });
    }
  };
});