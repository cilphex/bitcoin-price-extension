var Util = chrome.extension.getBackgroundPage().Util; 
var Gox = chrome.extension.getBackgroundPage().Gox;

angular.module('OptionsApp', [])
	
	.controller('OptionsCtrl', function OptionsCtrl($scope) {

		$scope.display_badge = localStorage.getItem('display_badge') == 'true' ? true : false;

		$scope.$watch('display_badge', function(new_val, old_val) {
			localStorage.setItem('display_badge', new_val);
		});

	});