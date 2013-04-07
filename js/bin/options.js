var Util = chrome.extension.getBackgroundPage().Util;
var Settings = chrome.extension.getBackgroundPage().Settings;
var Gox = chrome.extension.getBackgroundPage().Gox;

angular.module('OptionsApp', [])
	
	.controller('OptionsCtrl', function OptionsCtrl($scope) {

		$scope.settings = Settings.vals;

		//$scope.display_badge = localStorage.getItem('display_badge') === 'true';

		$scope.$watch('settings.badge', function(new_val, old_val) {
			//localStorage.setItem('display_badge', new_val);
			Settings.set('badge', new_val);
		});

	});