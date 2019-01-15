App = angular.module('myApp', [])


App.controller("mainCtrl", [
    "$scope",
	"$q",
	"$timeout",
	"$http",
	"api",
	"loadFile",
    function($scope, $q, $timeout, $http, API, LoadFile) {

		var API_KEY_LABEL = "mobileapp-proto"

		function saveState() {
			var preservedData = {
				server: $scope.chorus.server,
				userGuid: $scope.chorus.user && $scope.chorus.user.guid,
				sessionId: $scope.chorus.sessionId,
				apiKey: $scope.chorus.apiKey,
				defaultUploadDestination: $scope.chorus.defaultUploadDestination
			}
			window.sessionStorage.setItem("preserved-data", JSON.stringify(preservedData))
		}
		function loadState() {
			var data = window.sessionStorage.getItem("preserved-data")
			if (data) {
				return JSON.parse(data)
			}
			return null;
		}

		var appStateStack
		$scope.chorus = {}
		function bootstrap() {
			$scope.chorus = {
				server: "",
				ssoEnabled: null,
				user: {
					username: "",
					password: "",
					email: "",
					fullName: "",
					avatarUrl: "",
					context: "",
					guid: ""
				},
				sessionId: "",
				apiKey: "",
				defaultUploadDestination: {
					name: null,
					guid: null,
				},
				currentBatch: {
					uploadDestination: {
						name: null,
						guid: null,
					},
					files: []
				},
				uploadBatches: []
			}
			$scope.folders = [];
	
			$scope.appstate = ""
			$scope.viewstate = ""
			appStateStack = []

			var preservedData = loadState()
			if (preservedData) {
				$scope.chorus.server = preservedData.server
				$scope.chorus.user.guid = preservedData.userGuid
				$scope.chorus.sessionId = preservedData.sessionId
				$scope.chorus.apiKey = preservedData.apiKey
				$scope.chorus.defaultUploadDestination = preservedData.defaultUploadDestination
			}

			initApp()
		}
		function initApp() {

			if (!$scope.chorus.server || (!$scope.chorus.sessionId && !$scope.chorus.apiKey)) {
				$scope.appstate = "needlogin"
				$scope.viewstate = "enter-server"
				return
			}

			API.SetServer(fullServerUrl($scope.chorus.server))
			API.SetSessionId($scope.chorus.sessionId)
			API.CoreGetUserDetails().then(function(userDetails) {
				if (userDetails.guid == $scope.chorus.user.guid) {
					return userDetails
				}


				// users don't match - user deleted or session expired
				// if we have an apikey we can try using that to restablish a session
				$scope.chorus.sessionId = ""
				API.SetSessionId("")
				if ($scope.chorus.apiKey) {
					return API.CoreLoginWithKey($scope.chorus.apiKey, true).then(function(loginDetails) {
						// successful login so store session
						$scope.chorus.sessionId = loginDetails.sessionId
						API.SetSessionId($scope.chorus.sessionId)
						return loginDetails.userDetails
					})
				}


				return $q.reject();

			}).then(function(userDetails) {

				// our user matches. lets fill in details
				$scope.chorus.user.username = userDetails.username
				$scope.chorus.user.password = ""
				$scope.chorus.user.fullName = userDetails.name
				$scope.chorus.user.email = userDetails.email
				$scope.chorus.user.avatarUrl = userDetails.avatar
				$scope.chorus.user.context = userDetails.context

				if (!$scope.chorus.defaultUploadDestination || !$scope.chorus.defaultUploadDestination.guid) {
					$scope.chorus.defaultUploadDestination = {
						name: userDetails.name,
						guid: userDetails.backingFolderGuid,
					}
				}

				// store state
				saveState()

				// and say we're logged in
				$scope.appstate = "loggedin"
				$scope.viewstate = "upload"

			}).catch(function(err) {
				console.log(err)
				// any error - just kick back to choose server to restart
				// reset some things on the way
				API.SetServer("")
				API.SetSessionId("")
				$scope.chorus.apiKey = ""
				$scope.chorus.sessionId = ""
				initApp()
			})

		}
		bootstrap()


		function fullServerUrl(suggested) {
			if (suggested.substr(0,4) != "http") {
				return "https://"+suggested
			}
			return suggested
		}

		$scope.enterServerConfirm = function() {
			if ($scope.chorus.server == "") {
				$scope.viewstate = "enter-server-error"
				return
			}
			API.SetServer(fullServerUrl($scope.chorus.server))
			API.CoreGetEnvironment().then(function(data) {
				$scope.chorus.ssoEnabled = data.authModes && Array.isArray(data.authModes) && (data.authModes.indexOf("saml") != -1)

				if ($scope.chorus.ssoEnabled) {
					$scope.viewstate = "active-directory"
				} else {
					$scope.viewstate = "login"
				}
			}).catch(function(err) {
				$scope.viewstate = "enter-server-error"
				return
			})

		}
		$scope.clearEnterServerError = function() {
			$scope.viewstate = "enter-server"
		}

		$scope.loginLogin = function() {
			API.CoreLogin(
				$scope.chorus.user.username,
				$scope.chorus.user.password
			).then(function(data) {

				// first set the session id
				API.SetSessionId(data.sessionId)
				// and init the user guid
				$scope.chorus.user = {
					guid: data.userDetails.guid
				}

				// we've authenticated so we now need to establish an API key
				// There might already be one on the server


				return API.ApiKeyGetAllKeys().then(function(keyDetails) {
					var myKey = keyDetails.filter(function(k) {
						return k.label == API_KEY_LABEL
					})

					if (myKey.length >= 1) {
						return myKey[0];
					}
					return API.ApiKeyCreateKey(API_KEY_LABEL)
				}).then(function(keyDetails) {
					$scope.chorus.apiKey = keyDetails.apikey
					// now with our key stored we bounce back to init.
					// we haven't stored the current session so init will restablish
					// a session but this time using apikey
					API.SetSessionId("") // explicitly clear from API service (unnecessary probably)
					initApp()
				})

			}).catch(function(err) {
				console.log(err)
				$scope.viewstate = "incorrect-username-or-password"
				return
			})
		}
		$scope.loginChangeServer = function() {
			$scope.viewstate = "enter-server"
		}
		$scope.clearIncorrectCredentialsError = function() {
			$scope.viewstate = "login"
		}


		$scope.loggedInSettings = function() {
			appStateStack.push({
				app: $scope.appstate,
				view: $scope.viewstate
			})
			$scope.appstate = "settings"
			$scope.viewstate = "settings"
		}
		$scope.loggedInPlus = function() {
			$scope.uploadstate = "choose"
		}
		$scope.addFilesQueue = function() {
			$scope.viewstate = "queue"
		}
		$scope.queueUpload = function() {
			$scope.viewstate = "upload"
		}

		$scope.chooseUploadLastPhoto = function() {
			alert("Not implemented.")
		}
		$scope.chooseUploadTakePhoto = function() {
			alert("Not implemented.")
		}
		$scope.chooseUploadSelectFile = function() {
			LoadFile.getMultipleFilesAsObjects().then(function(files) {
				for (var i=0; i < files.length; i++) {
					addFileToCurrentBatch(files[i])
				}
				$scope.viewstate = "upload"
			})
			$scope.uploadstate = ""
		}
		$scope.chooseUploadCancel = function() {
			$scope.uploadstate = ""
		}

		$scope.filesChooseDestination = function() {
			appStateStack.push({
				app: $scope.appstate,
				view: $scope.viewstate
			})
			currentFolderSelecter = foldersSelectCurrentBatch
			sortOutFolderChooser($scope.chorus.currentBatch.uploadDestination.guid)
			$scope.appstate = "selectfolder"
			$scope.viewstate = "selectfolder"
		}

		$scope.filesUploadBatch = function() {
			$scope.chorus.uploadBatches.push({
				destinationGuid: $scope.chorus.currentBatch.uploadDestination.guid,
				files: $scope.chorus.currentBatch.files,
				progressFiles: 0,
				totalFiles: $scope.chorus.currentBatch.files.length,
				progressBytes: 0,
				totalBytes: $scope.chorus.currentBatch.files.reduce(function(acc, f) {
					return acc + f.size
				},0),
				progressPercentage: "0%",
				status: "Pending",
				createdDate: new Date(),
				resized: false
			})
			$scope.chorus.currentBatch.files = [];
			$scope.viewstate = "queue"
			triggerBatch();
		}

		function triggerBatch() {
			if ($scope.chorus.uploadBatches.length == 0) return

			if ($scope.chorus.uploadBatches[0].status == "Pending") {
				if (!$scope.chorus.uploadBatches[0].resized) {
					doResizing(0)
				} else {
					doUploading(0)
				}
			}
		}

		function doResizing(batchIndex) {
			var batch = $scope.chorus.uploadBatches[batchIndex]
			batch.status = "Resizing"
			batch.progressPercentage = "0%"
			batch.progressFiles = 0

			var resizingD = $q.defer()
			resizingD.promise.then(function() {
				batch.status = "Pending"
				batch.progressPercentage = "0%"
				batch.progressFiles = 0
				batch.resized = true;
				triggerBatch()
			})
			
			function doDelay(fileIndex) {
				var delay = Math.round(batch.files[fileIndex].size / 4000)
				$timeout(function() {
					batch.progressFiles += 1
					batch.progressPercentage = Math.round(100 * batch.progressFiles / batch.totalFiles) + "%"
					var nextIndex = fileIndex + 1
					if (nextIndex < batch.files.length) {
						doDelay(nextIndex)
						return
					}
					resizingD.resolve()
				}, delay)
			}

			doDelay(0)
		}

		function doUploading(batchIndex) {
			var batch = $scope.chorus.uploadBatches[batchIndex]
			batch.status = "Uploading"
			batch.progressPercentage = "0%"
			batch.progressFiles = 0
			batch.progressBytes = 0

			var uploadingD = $q.defer()
			uploadingD.promise.then(function() {
				$scope.chorus.uploadBatches.splice(batchIndex, 1)
				triggerBatch()
			})
			API.UploadCreateUpload(batch.destinationGuid).then(function(uploadJobDetails) {
				var uploadKey = uploadJobDetails.uploadKey
				var postURL = uploadJobDetails.postURL

				function doOneUpload(fileIndex, bytesSoFar) {
					var uploadData = new FormData();
					var thisSize = batch.files[fileIndex].size
					uploadData.append("filesize_"+fileIndex, String(thisSize));
					uploadData.append(fileIndex, batch.files[fileIndex].fh);
	
					$http.post(postURL, uploadData, {
						headers: {
							"Content-Type": undefined
						},
						eventHandlers: {
							"loadend": function(ev) {
								batch.progressFiles += 1
								batch.progressBytes = bytesSoFar + thisSize
								batch.progressPercentage = Math.round(100 * batch.progressBytes / batch.totalBytes) + "%"
								var nextIndex = fileIndex + 1
								if (nextIndex < batch.files.length) {
									doOneUpload(nextIndex, bytesSoFar + thisSize)
									return
								}
								uploadingD.resolve(API.UploadFinaliseUpload(uploadKey))
							}
						},
						uploadEventHandlers: {
							"progress": function(ev) {
								batch.progressBytes = bytesSoFar + ev.loaded
								batch.progressPercentage = Math.round(100 * batch.progressBytes / batch.totalBytes) + "%"
							},
						}
					})
				}
				doOneUpload(0, 0)

				
			})


		}

		function sortOutFolderChooser(folderGuid) {
			$scope.folders = "loading";
			$scope.foldersCurrent = {};
			var spacesD = $q.defer()
			var foldersD = $q.defer()
			var parentD = $q.defer()
			$q.all([spacesD.promise, foldersD.promise, parentD.promise]).then(function(results) {
				$scope.folders = results[0].concat(results[1]);
				$scope.foldersCurrent.parent = results[2];
			})

			var itemType, itemContext;

			API.FoldersGetFolderDetails(folderGuid).then(function(folderDetails) {
				var det = folderDetails[folderGuid]
				itemContext = det.context
				itemType = det.folderType
				$scope.foldersCurrent.guid = folderGuid
				$scope.foldersCurrent.name = det.name
				$scope.foldersCurrent.canUpload = det.childRights.upload && (itemType == "folder" || itemType == "contextfolder" || itemType == "link")
				
				console.log(det)

				if (itemType == "contextfolder") {
					if (itemContext == $scope.chorus.user.context) {
						parentD.resolve(null)
					} else {
						parentD.resolve(API.ContextsGetDetails(itemContext).then(function(contextDetails) {
							var contextParent = contextDetails[itemContext].parentId
							if (!contextParent) contextParent = $scope.chorus.user.context;
							return API.ContextsGetDetails(contextParent).then(function(contextDetails) {
								return contextDetails[contextParent].backingFolderGuid
							})
						}))
					}
				} else {
					parentD.resolve(det.parentGuid)
				}
			}).then(function() {

				if (itemType == "contextfolder") {
					spacesD.resolve(API.ContextsGetChildren(itemContext).then(function(childContexts) {
						if (childContexts.length > 0) {
							return API.ContextsGetDetails(childContexts).then(function(contextDetails) {
								console.log(contextDetails)
								return childContexts.map(function(contextId) {
									return {
										name: contextDetails[contextId].name,
										type: "contextfolder",
										guid: contextDetails[contextId].backingFolderGuid,
										parentGuid: folderGuid,
										context: contextId,
										avatarUrl: contextDetails[contextId].avatar,
									}
								})
							})
						}

						return [];
					}))

				} else {
					spacesD.resolve([])
				}

				foldersD.resolve(API.FoldersGetSortedChildren(folderGuid).then(function(childItems) {
					var childFolderGuids = childItems.filter(function(item) {
						return item.type == "folder"
					}).map(function(childFolder) {
						return childFolder.guid
					})
					if (childFolderGuids.length > 0) {
						return API.FoldersGetFolderDetails(childFolderGuids).then(function(folderDetails) {
							console.log(folderDetails)
							return childFolderGuids.map(function(thisFolderGuid) {
								return {
									name: folderDetails[thisFolderGuid].name,
									type: "folder",
									guid: thisFolderGuid,
									parentGuid: folderGuid,
								}
							})
						})
					}

					return [];
				}))

			})
		}

		$scope.foldersNavigateInto = function(folderDetails) {
			sortOutFolderChooser(folderDetails.guid)
		}
		$scope.foldersNavigateBack = function() {
			sortOutFolderChooser($scope.foldersCurrent.parent)
		}
		var currentFolderSelecter = null
		function foldersSelectDefault(val) {
			$scope.chorus.defaultUploadDestination = val
			saveState()
		}
		function foldersSelectCurrentBatch(val) {
			$scope.chorus.currentBatch.uploadDestination = val
		}
		$scope.foldersSelect = function() {
			currentFolderSelecter(angular.copy($scope.foldersCurrent));
			$scope.foldersClose()
		}
		$scope.foldersClose = function() {
			var state = appStateStack.pop();
			$scope.appstate = state.app
			$scope.viewstate = state.view
		}

		$scope.settingsBack = function() {
			var state = appStateStack.pop();
			$scope.appstate = state.app
			$scope.viewstate = state.view
		}
		$scope.settingsLogout = function() {
			API.CoreLogout().then(function() {
				$scope.appstate = "needlogin"
				$scope.viewstate = "enter-server"
				$scope.chorus = {
					server: $scope.chorus.server,
				}
				saveState()
			})
		}
		$scope.settingsChooseDefaultFolder = function() {
			appStateStack.push({
				app: $scope.appstate,
				view: $scope.viewstate
			})
			currentFolderSelecter = foldersSelectDefault
			sortOutFolderChooser($scope.chorus.defaultUploadDestination.guid)
			$scope.appstate = "selectfolder"
			$scope.viewstate = "selectfolder"
		}


		function addFileToCurrentBatch(file) {
			if ($scope.chorus.currentBatch.files.length == 0) {
				$scope.chorus.currentBatch.uploadDestination = angular.copy($scope.chorus.defaultUploadDestination)
			}
			$scope.chorus.currentBatch.files.push({
				name: file.name,
				size: file.size,
				fh: file,
			})
		}

	}
])

App.filter('naturalBytes', function() {
	return function(bytes) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (bytes == 0) return "0B"
		var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(1) + units[number];
	};
})

