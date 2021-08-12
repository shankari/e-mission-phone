'use strict';

angular.module('emission.intro', ['emission.splash.startprefs',
                                  'emission.splash.updatecheck',
                                  'emission.i18n.utils',
                                  'ionic-toast'])

.config(function($stateProvider) {
  $stateProvider
  // setup an abstract state for the intro directive
    .state('root.intro', {
    url: '/intro',
    templateUrl: 'templates/intro/intro.html',
    controller: 'IntroCtrl'
  })
  .state('root.reconsent', {
    url: '/reconsent',
    templateUrl: 'templates/intro/reconsent.html',
    controller: 'IntroCtrl'
  });
})

.controller('IntroCtrl', function($scope, $state, $window, $ionicSlideBoxDelegate,
    $ionicPopup, $ionicHistory, ionicToast, $timeout, CommHelper, StartPrefs, UpdateCheck, $translate, i18nUtils, $http) {

  $scope.surveyState = { 
    isValid: true, 
    schema: {'start_ts':'', 'end_ts':'', 'fname':'Jenna', 'lname':'Ruzekowicz'},
    result: {'start_ts':'', 'end_ts':'', 'fname':'', 'lname':''} 
  };
  $scope.changeresult = function(value) {
      $scope.surveyState.result = value
  };

  $scope.platform = $window.device.platform;
  $scope.osver = $window.device.version.split(".")[0];
  if($scope.platform.toLowerCase() == "android") {
    if($scope.osver < 6) {
        $scope.locationPermExplanation = $translate.instant('intro.permissions.locationPermExplanation-android-lt-6');
    } else if ($scope.osver < 10) {
        $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-android-6-9");
    } else if ($scope.osver < 11) {
        $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-android-10");
    } else {
        $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-android-gte-11");
    }
  }

  if($scope.platform.toLowerCase() == "ios") {
    if($scope.osver < 13) {
        $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-ios-lt-13");
    } else {
        $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-ios-gte-13");
    }
  }

  $scope.backgroundRestricted = false;
  if($window.device.manufacturer.toLowerCase() == "samsung") {
    $scope.backgroundRestricted = true;
    $scope.allowBackgroundInstructions = $translate.instant("intro.allow_background.samsung");
  }

  $scope.fitnessPermNeeded = ($scope.platform.toLowerCase() == "ios" ||
    (($scope.platform.toLowerCase() == "android") && ($scope.osver >= 10)));

  console.log("Explanation = "+$scope.locationPermExplanation);

  var allIntroFiles = Promise.all([
    i18nUtils.geti18nFileName("templates/", "intro/summary", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/consent", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/sensor_explanation", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/login", ".html"),
    i18nUtils.geti18nFileName("templates/", "intro/survey", ".html")
  ]);
  allIntroFiles.then(function(allIntroFilePaths) {
    $scope.$apply(function() {
      console.log("intro files are "+allIntroFilePaths);
      $scope.summaryFile = allIntroFilePaths[0];
      $scope.consentFile = allIntroFilePaths[1];
      $scope.explainFile = allIntroFilePaths[2];
      $scope.loginFile = allIntroFilePaths[3];
      $scope.surveyFile = allIntroFilePaths[4];
    });
  });

  $scope.getIntroBox = function() {
    return $ionicSlideBoxDelegate.$getByHandle('intro-box');
  };

  $scope.stopSliding = function() {
    $scope.getIntroBox().enableSlide(false);
  };

  $scope.showSettings = function() {
    window.cordova.plugins.BEMConnectionSettings.getSettings().then(function(settings) {
      var errorMsg = JSON.stringify(settings);
      var alertPopup = $ionicPopup.alert({
        title: 'settings',
        template: errorMsg
      });

      alertPopup.then(function(res) {
        $scope.next();
      });
    }, function(error) {
        $scope.alertError('getting settings', error);
    });
  };

  $scope.disagree = function() {
    $state.go('root.main.heatmap');
  };

  $scope.fetchItinerumSurvey = function(url) {
    (async () => {
     let uuid="";
     var step1 = new Promise(function(resolve, reject) {
       resolve(CommHelper.getUser());
     });
     var step2 = step1.then(function(value){
       uuid=value.user_id['$uuid'];
     });
     await step2;
     var data_dict = {
        'user': {
          'uuid': uuid,
          'model': $window.device.model,
          'itinerumVersion': '99c',
          'os': ionic.Platform.platform(),
          'osVersion': $window.device.version,
        },
        'surveyName': 'test'
      };
      console.log(data_dict);
      const options = {
        method: 'post',
        data: data_dict,
        responseType: 'json'
      }
      cordova.plugin.http.sendRequest(url, options,
      function(response) {
        $scope.$apply(function() {
          $scope.surveyState.schema = response;
        });
    }, function(error) {
        console.log(error);
      });
   })();
    $scope.$apply(function() {
      $scope.surveyState.result.start_ts = new Date().getTime() / 1000;
    });
    console.log($scope.surveyState.result.start_ts);
  };

  $scope.agree = function() {
    StartPrefs.markConsented().then(function(response) {
      $ionicHistory.clearHistory();
      if ($state.is('root.intro')) {
        $scope.next();
      } else {
        StartPrefs.loadPreferredScreen();
      }
    });
  };

  $scope.next = function() {
    $scope.getIntroBox().next();
  };

  $scope.previous = function() {
    $scope.getIntroBox().previous();
  };

  $scope.alertError = function(title, errorResult) {
      var errorMsg = JSON.stringify(errorResult);
      var alertPopup = $ionicPopup.alert({
        title: title,
        template: errorMsg
      });

      alertPopup.then(function(res) {
        window.Logger.log(window.Logger.LEVEL_INFO, errorMsg + ' ' + res);
      });
  }

  $scope.login = function() {
    window.cordova.plugins.BEMJWTAuth.signIn().then(function(userEmail) {
      // ionicToast.show(message, position, stick, time);
      // $scope.next();
      ionicToast.show(userEmail, 'middle', false, 2500);
      if (userEmail == "null" || userEmail == "") {
        $scope.alertError("Invalid login "+userEmail);
      } else {
        CommHelper.registerUser(function(successResult) {
          UpdateCheck.getChannel().then(function(retVal) {
            CommHelper.updateUser({
             client: retVal
            });
          });
          $scope.next();
        }, function(errorResult) {
          $scope.alertError('User registration error', errorResult);
        });
        var url = 'http://198.245.50.61/mobile/v2/create';
        $scope.fetchItinerumSurvey(url);
      }
    }, function(error) {
        $scope.alertError('Sign in error', error);
    });
  };

  // Called each time the slide changes
  $scope.slideChanged = function(index) {
    $scope.slideIndex = index;
    /*
     * The slidebox is created as a child of the HTML page that this controller
     * is associated with, so it is not available when the controller is created.
     * There is an onLoad, but it is for ng-include, not for random divs, apparently.
     * Trying to create a new controller complains because then both the
     * directive and the controller are trying to ask for a new scope.
     * So instead, I turn off swiping after the initial summary is past.
     * Since the summary is not legally binding, it is fine to swipe past it...
     */
    if (index > 0) {
        $scope.getIntroBox().enableSlide(false);
    }
  };
  
  $scope.save_survey = function() {
    $scope.surveyState.result.end_ts = new Date().getTime() / 1000;
    $window.cordova.plugins.BEMUserCache.putMessage("manual/survey_response", $scope.surveyState.result);
    $scope.finish();
  };

  $scope.end_ts = function() {
    $scope.$apply(function() {
      $scope.surveyState.result.end_ts = new Date().getTime() / 1000;
    });
  }
  $scope.finish = function() {
    // this is not a promise, so we don't need to use .then
    console.log($scope.surveyState.result);
    StartPrefs.markIntroDone();
    $scope.getIntroBox().slide(0);
    StartPrefs.loadPreferredScreen();
  }
});
