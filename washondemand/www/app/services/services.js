angular.module('wod.services', [])
.factory('jwtDecoder', jwtDecoder)
.factory('GeoAlert', GeoAlert)
.factory('socket', socket)
.factory('locFactory', locFactory);

function jwtDecoder(jwtHelper) {
  function decoder(token) {
    return jwtHelper.decodeToken(token);
  };

  return {
    decoder: decoder
  };
};

function GeoAlert(locFactory, jwtDecoder, $window) {
  console.log('GeoAlert service instantiated');
  var interval;
  var duration = 6000;
  var long, lat;
  var processing = false;
  var callback;
  var minDistance = 1;

  // Credit: http://stackoverflow.com/a/27943/52160
  function getDistanceInMi(userLat, userLng, washLat, washLng) {
    var p = 0.017453292519943295;    // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((washLat - userLat) * p)/2 +
      c(userLat * p) * c(washLat * p) *
      (1 - c((washLng - userLng) * p))/2;
    // returns distance in miles
    return Math.round(12742 * Math.asin(Math.sqrt(a))/1.60932*10)/10;
  };

  function hb() {
     var user = jwtDecoder.decoder($window.localStorage['com.wod']);
     console.log('hb running');
     if (processing) {return;}
     processing = true;
     navigator.geolocation.getCurrentPosition(function(position) {
       console.log('From geoAlert: ', user);
       var data = {
         email: user.email,
         lat: position.coords.latitude,
         lng: position.coords.longitude
       };
       locFactory.sendLocToServer(data);
       processing = false;
       console.log(lat, long);
       console.log(position.coords.latitude, position.coords.longitude);
       var dist = getDistanceInMi(lat, long, position.coords.latitude, position.coords.longitude);
       console.log('dist in km is ' + dist);
       if (dist <= minDistance) callback();
     });
   };

   return {
     begin: function(userLat, userLng, cb) {
       long = userLng;
       lat = userLat;
       callback = cb;
       interval = window.setInterval(hb, duration);
       hb();
     },
     end: function() {
       window.clearInterval(interval);
     },
     setTarget: function(lg, lt) {
       long = lg;
       lat = lt;
     }
   };
};

function socket($rootScope) {
  var socket = io.connect('http://localhost:8000');

  return {
    on: function(eventName, callback) {
      socket.on(eventName, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          callback.apply(socket, args);
        });
      });
    },
    emit: function(eventName, data, callback) {
      socket.emit(eventName, data, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
};

function locFactory($window, $q, $http) {

  var LOCALURL = 'http://localhost:8000/';

  var locData = {
    found: false,
    userType: '',
    email: '',
    lat: undefined,
    lng: undefined
  };

  return {
    locData: locData,
    getLoc: getLoc,
    sendLocToServer: sendLocToServer,
    resetLocData: resetLocData,
    updateAvailability: updateAvailability
  };

  function getLoc(userType, email) {
    var deferred = $q.defer();
    if (!$window.navigator.geolocation) {
      deferred.reject('Geolocation not supported.');
    } else {
      $window.navigator.geolocation.getCurrentPosition(function(position) {
        locData.found = true;
        locData.userType = userType;
        locData.email = email;
        locData.lat = position.coords.latitude;
        locData.lng = position.coords.longitude;
        console.log('location found!');
        deferred.resolve(position);
      }, function(err) {
        deferred.reject(err);
      });
    }

    return deferred.promise;
  };

  function sendLocToServer(custData) {

    return $http({
      method: 'POST',
      url: LOCALURL + 'api/' + locData.userType + '/update-location',
      data: locData || custData
    })
    .then(function(results) {
      //console.log(locData);
    });
  };

  function updateAvailability(availability) {
    var data = {
      availability: availability,
      locData: locData
    };

    return $http({
      method: 'POST',
      url: LOCALURL + 'api/provider/update-availability',
      data: data
    }).then(function(results) {

    });
  };

  function resetLocData() {

    locData.found = false;
    locData.userType = '';
    locData.email = '';
    locData.lat = undefined;
    locData.lng = undefined;
  };
};
