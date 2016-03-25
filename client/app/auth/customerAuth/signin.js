angular.module('wod.custSI', []).controller('custSICtrl', custSICtrl);

function custSICtrl(authFactory, $window, $location) {
  var vm = this;
  vm.customer = {
    email: '',
    password: ''
  };

  vm.signin = function() {
    //call factory
    authFactory.custSignin(vm.customer)
    .then(function(token) {
      authFactory.clearForm(vm.customer);
      $window.localStorage.setItem('com.wod', token);
      $location.path('/customerProfile');
    })
    .catch(function(error) {
      console.error(error);
    });
  };
}
