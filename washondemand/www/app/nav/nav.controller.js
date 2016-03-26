angular.module('wod.nav', []).controller('navCtrl', navCtrl);

navCtrl.$inject = ['$state', 'authFactory', 'locFactory'];

function navCtrl($state, authFactory, locFactory) {
  var vm = this;

  vm.availability = false;;

  vm.updateAvailability = function() {
    console.log('inside navCtrl', vm.availability);
    locFactory.updateAvailability(vm.availability);
  }

  vm.providerLogout = function() {
    authFactory.signout();
    $state.go('home');
  };
  vm.customerLogout = function() {
    authFactory.signout();
    $state.go('customerSignin');
  };

  vm.updateAvailability();
};
