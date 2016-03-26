angular.module('wod.providerCtrl', []).controller('providerCtrl', providerCtrl);

function providerCtrl($scope, $stateParams, socket, providerFactory, $window, locFactory, jwtDecoder, GeoAlert, $ionicHistory, $state) {
  var vm = this;
  vm.request = {data: []};
  vm.locData = locFactory.locData;
  vm.requests = [];
  vm.accepted = $stateParams.accepted;
  //Begin the service
  //hard coded 'target'
  function onConfirm(idx) {
    console.log('button ' + idx + ' pressed');
  }

  socket.on('removeList', function(data) {
    for (var i = 0; i < vm.requests.length; i++) {
      if (vm.requests[i]._id === data._id) {
        vm.requests[i].display = true;
      }
    }
  });

  socket.on('refreshList', function(data) {
    for (var i = 0; i < vm.requests.length; i++) {
      if (vm.requests[i]._id === data._id) {
        vm.requests[i].display = true;
      }
    }
  });

  socket.on('addList', function(data) {
    console.log(data);
    vm.requests.push(data);
  });

  vm.getRequests = function() {
    providerFactory.getRequest(locFactory.locData)
      .then(function(data) {
        data.forEach(function(item) {
          item.accepted = false;
        });
        vm.requests = data;
      });
  };

  vm.acceptWash = function(request) {
    vm.accepted = true;
    var provider = jwtDecoder.decoder($window.localStorage['com.wod']);
    request.provider = provider;
    console.log(request);
    socket.emit('accepted', request);
    providerFactory.acceptRequest(request)
      .then(function() {

        $ionicHistory.nextViewOptions({
          disableBack: true
        });
        request.job_accepted = new Date();
        providerFactory.currRequest = request;
        $state.go('providernav.providerWashView', {request: request});
      });

    GeoAlert.begin(request.user_location.lat, request.user_location.lng, function() {
      console.log('TARGET');
      GeoAlert.end();
      navigator.notification.confirm(
        'You are near your customer!',
        onConfirm,
        'Target!',
        ['Cancel','View']
      );
    });
  };

  var init = function() {
    var token = $window.localStorage['com.wod'];
    var user = jwtDecoder.decoder(token);
    vm.getRequests();
    locFactory.getLoc('provider', user.email).then(locFactory.sendLocToServer);
  };

  init();
};