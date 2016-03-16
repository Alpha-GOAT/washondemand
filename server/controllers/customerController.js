var Customer = require('../models/customerModel');
var Request = require('../models/requestModel.js');
var Provider = require('../models/providerModel.js');
var Q = require('q');
var helpers = require('../utils/helpers')
var jwt = require('jwt-simple');
var _ = require('lodash');
var bcrypt = require('bcrypt-nodejs');

if(process.env.SALT_FACTOR === undefined){
  var config = require('../config.js');
} else {
  var config = process.env
}


module.exports = {

  comparePasswords: function (attemptedPassword, savedPassword) {
    var defer = Q.defer();
    bcrypt.compare(attemptedPassword, savedPassword, function (err, match) {
      if (err) {
        defer.reject(err);
      } else {
        defer.resolve(match);
      }
    });
    return defer.promise;
  },

  signin: function (req, res, next) {
    var email = req.body.email;
    var password = req.body.password;

    var findUser = Q.nbind(Customer.findOne, Customer);
    findUser({email: email})
      .then(function (customer) {
        if (!customer) {
          next(new Error('Customer does not exist'));
        } else {
          module.exports.comparePasswords(password, customer.password)
            .then(function(foundUser) {
              if (foundUser) {
                var token = jwt.encode(customer, config.tokenSecret);
                res.json({token: token});
              } else {
                return next(new Error('No customer'));
              }
            });
        }
      })
      .fail(function (error) {
        next(error);
      });
  },

  signup: function (req, res, next) {
    var newUser = {
      email: req.body.email,
      password: req.body.password,
      firstname: req.body.firstName,
      lastname: req.body.lastName,
      phone_number: req.body.phone
    };

    var findOne = Q.nbind(Customer.findOne, Customer);

    // check to see if customer already exists
    findOne({email: newUser.email})
      .then(function(customer) {
        if (customer) {
          next(new Error('Customer already exist!'));
        } else {
          // make a new customer if not one
          var create = Q.nbind(Customer.create, Customer);
          create(newUser)
            .then(function (customer) {
              // create token to send back for auth
              var token = jwt.encode(customer, config.tokenSecret);
              res.json({token: token});
            })
            .fail(function (error) {
              next(error);
            });
        }
      })
      .fail(function(error){
        next(error);
      })
  },

  checkAuth: function (req, res, next) {
    var token = req.headers['x-access-token'];
    if (!token) {
      next(new Error('No token'));
    } else {
      var customer = jwt.decode(token, config.tokenSecret);
      var findUser = Q.nbind(Customer.findOne, Customer);
      findUser({email: customer.email})
        .then(function (foundUser) {
          if (foundUser) {
            res.status(200).send();
          } else {
            res.status(401).send();
          }
        })
        .fail(function (error) {
          next(error);
        });
    }
  },

//**********************-LOCATION METHOD-********************
  updateLocation: function(req, res, next) {
    var userType = req.body.userType;
    var lat = req.body.lat;
    var lng = req.body.lng;
    var email = req.body.email;

    var query = {
      email: email,
    };

    var update = {
      'geolocation': {
        lat: lat,
        lng: lng
      }
    };

    // Upsert updates instead of adding a new entry
    var options = {
      upsert: true,
      new: true
    };

    Customer.findOneAndUpdate(query, update, options, function(err, doc) {
      if (err) {
        throw err;
      }
      res.json(doc);
    });

  },
//**********************-WASHER METHODS-*********************

  getWashers: function(req, res, next){

    var customerLocation = req.body.user_location;

    Provider.where("available").equals(true).then(function(washers) {
      var result = _.filter(washers, function(washer) {
        return module.exports.distance(customerLocation, washer.geolocation) < 5;
      });
      res.json({result: result});
    })
  },

  requestWash: function(req, res, next){
    console.log("+++INSIDE REQWASH:", req.body.user_location);
    var newRequest = {
      user_location: req.body.user_location,
      user_email: req.body.user_email,
      job_started: false
    }
    var create = Q.nbind(Request.create, Request);
    create(newRequest).then(function(){
      res.status(200).send();
    })
    .fail(function(error) {
      next(error);
    })
  },

  distance: function(userLocation, washerLocation) {
    var p = 0.017453292519943295;    // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((washerLocation.lat - userLocation.lat) * p)/2 +
    c(userLocation.lat * p) * c(washerLocation.lat * p) *
    (1 - c((washerLocation.lng - userLocation.lng) * p))/2;
    // returns distance in miles
    return Math.round(12742 * Math.asin(Math.sqrt(a))/1.60932*10)/10;
  }
};
