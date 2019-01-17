
# Upload Permission

*Problem*: *Given a folder identifier, how do I determine whether the user can choose this as an upload destination.*

Upload destination is specified as a folder guid. The initial default is the `backingFolderGuid` from the userDetails object in the login response. The  user will always have permission to upload into this folder so no permission checks are required for this.

When browsing the hierarchy to choose an alternative destination, the user may be presented with folders that they do not have rights to upload into. As such, it is important that they are not able to choose them as an upload destination, only to have the subsequent uploads fail.

Upload destinations must be specified as folder guids and come from, either the `guid` field in the Folders.GetFolderDetails(...) response, or the `backingFolderGuid` in the Contexts.GetDetails(...) response. 

To determine whether a user has rights to upload you must test fields from the GetFolderDetails(...) response. Upload permission is granted when the `folderType` is one of `folder`, `contextfolder` or `link`, and when `createUnder` is set to `true`. i.e.:

- First get folder details:

```
Folders.GetFolderDetails({
	folderIds: ["b5239a96-8438-11e7-bc10-000c29aa9c88"]
})
```

- Second, with folder details, given by `DETAILS` in the following:

```
USER_CAN_UPLOAD = DETAILS.createUnder && (DETAILS.folderType == "folder" ||
										   DETAILS.folderType == "contextfolder" ||
										   DETAILS.folderType == "link")
					 
```


