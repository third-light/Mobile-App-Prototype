# Error Codes From API Calls

Error codes from the Chorus API are split into API errors and ACTION errors. Broadly API errors are ones which occur in the processing pipeline before the actual underlying method call is made, and ACTION errors only occur during the calling of the method.

Every API request will contain a `result` block. Thus:

	{
	    "result": {
	        "api": "OK",
	        "action": "OK"
	    },
	    "outParams": {
	    	...
	    }
	}

If one or both of the `result.api` and `result.action` are not `"OK"` then an error has occurred.

## API Error Codes

For the most part all API errors can be treated in the same way you handle a HTTP transport error. This might be through a retry or abandong the current operation, maybe back to the login screen.

There is only one that might well crop up in normal use:

`TRIAL_EXPIRED`

In this case the user's site is no longer available and they must be bounced back to the "Choose server" screen after the following message:

> Your Chorus trial has now finished and your site is being held should you wish to upgrade to a full version.


## ACTION Error Codes


There are a handful of error codes that can crop up in normal usage. Some are easy to reproduce, like login failures, whereas others are more subtle, for example race conditions during folder hierarchy browsing. Notes are included below.


## Core.GetEnvironment

_No error codes_

This call will always succeed against a Chorus server so if it does fail you can assume that the provided server URL is not valid (or has become invalid).

## Core.Login

`USER_NOT_FOUND`

Normal login failure. Already copy for this in the design document.

`ACCOUNT_LOCKED`

> Your account is locked following too many incorrect login attempts. Please try again later or use a different account.


## Core.LoginWithToken

_No error codes_

## Core.LoginWithKey

_No error codes_

## Core.Logout

_No error codes_


## Core.GetUserDetails

_No error codes_

## Folders.GetSortedChildren

`FOLDER_NOT_FOUND`

This may happen if the folder you are trying to show has been recently deleted or permission has been revoked. What to do will depend upon what the user is currently doing. For example: if the user is trying to browse into a folder, then displaying a message where the folder contents would otherwise be, might be all that is necessary. But if the user is browsing up the hierarchy, then you might need to be a bit more defensive and send the user right to the top of the hierarchy. What to do will also depend on your caching strategy if any.

Some example copy:

> This folder is no longer available.


## Folders.GetFolderDetails

_No error codes_

No error codes only if you supply `ignoreNonFatal:true` as an additional method parameter.

This call is made after you have received a listing from `GetSortedChildren`. In between doing that and calling this method, one or more folders might be unavailable. If you supply `ignoreNonFatal:true` then those unavailable folders will just be ommitted from the response. You should then handle the omissions as if they were never included in the listing.


## Contexts.GetChildren

`CONTEXT_NOT_FOUND`

See notes on `Folders.GetSortedChildren`

Some example copy:

> This Space is no longer available.


## Contexts.GetDetails

_No error codes_

No error codes only if you supply `ignoreNonFatal:true` as an additional method parameter.

See notes on `Folders.GetFolderDetails`

## Upload.CreateUpload

`CONTAINER_NOT_FOUND`

`NO_UPLOAD_PERMISSION_HERE`

For both the above you need to handle this by forcing the user to re-choose an upload destination. This isn't subject to subtle race conditions as the upload destination might have been chosen days/weeks/months prior.

> The chosen destination folder is no longer available. Please choose a new location.

## Upload.FinaliseUpload

_No error codes_

## ApiKey.GetAllKeys

_No error codes_

## ApiKey.CreateKey

_No error codes_


