App.service("api", [
	"$http",
	"$q",
    function($http, $q) {

		var server = ""
		var sessionId = ""

		function doapi(method, args){

			var inPacket = {
				apiVersion:"2.0",
				action:method,
				inParams:args,
				sessionId:sessionId
			}
			var params = ""
			if (args) {
				params = JSON.stringify(args)
			}
			var request = method+"("+params+")";

			return $http.post(server+"/api.json.tlx", inPacket).then(function(resp) {
				if (resp.status != 200) {
					return $q.reject("bad status: "+resp.status)
				}
				if (resp.data.result.api != "OK") {
					console.error("API Error", resp.data.result, inPacket);
					return $q.reject("APIError: "+resp.data.result.action)
				}
				if (resp.data.result.action != "OK") {
					console.error("Action Error", resp.data.result, inPacket);
					return $q.reject("ActionError: "+resp.data.result.action)
				}
				return angular.copy(resp.data.outParams)
			},function(err) {
				console.error(err)
				return $q.reject("some transport error")
			}).then(function(response) {
				console.log(request, response)
				return response
			}, function(err) {
				console.log(request, err)
				return $q.reject(err)
			})
		}



		var service = {
			SetServer: function(srv) {
				server = srv
			},
			SetSessionId: function(id) {
				sessionId = id
			},

			CoreGetUserDetails: function() {
				return doapi("Core.GetUserDetails")
			},
			CoreGetEnvironment: function() {
				return doapi("Core.GetEnvironment")
			},
			CoreLogin: function(username, password) {
				return doapi("Core.Login", {
					username: username,
					password: password,
				})
			},
			CoreLoginWithKey: function(apiKey, persistent) {
				return doapi("Core.LoginWithKey", {
					apikey: apiKey,
					options: {
						persistent:persistent
					},
				})
			},
			CoreLogout: function() {
				return doapi("Core.Logout")
			},
			FoldersGetFolderDetails: function(guids) {
				if (!Array.isArray(guids)) {
					guids = [guids]
				}
				return doapi("Folders.GetFolderDetails", {
					folderIds: guids
				})
			},
			FoldersGetSortedChildren: function(folderId) {
				return doapi("Folders.GetSortedChildren", {
					folderId:folderId,
					sortInfo:{
						field:"ims:filename",
						direction:"ASC"
					}
				}).then(function(data) {
					return data.items || []
				})
			},
			ContextsGetChildren: function(contextId) {
				return doapi("Contexts.GetChildren", {
					scope: contextId
				})
			},
			ContextsGetDetails: function(contextIds) {
				if (!Array.isArray(contextIds)) {
					contextIds = [contextIds]
				}
				return doapi("Contexts.GetDetails", {
					context: contextIds
				})
			},
			UploadCreateUpload: function(destinationGuid) {
				return doapi("Upload.CreateUpload", {
					params: {
						destination:destinationGuid,
						synchronous:true,
						blocking:false
					}
				})
			},
			UploadFinaliseUpload: function(uploadKey) {
				return doapi("Upload.FinaliseUpload", {
					uploadKey: uploadKey
				})
			},
			ApiKeyGetAllKeys: function() {
				return doapi("ApiKey.GetAllKeys", {
					context:"me"
				}).then(function(data) {
					if (Array.isArray(data)) return data

					var arr = []
					angular.forEach(data, function(val) {
						arr.push(val)
					})
					return arr
				})
			},
			ApiKeyCreateKey: function(label) {
				return doapi("ApiKey.CreateKey", {
					label:label,
					context:"me"
				})
			}
		}



		return service;


	}
])



