
# Folder Hierarchy Traversal

## Traversing Down The hierarchy

*Problem*: *Given a folder identifier, how do I display the contents of the folder?*

The identifier will most often be a folder guid, but it can also be a special context ID. A special context ID will only arise when a user is traversing the hierarchy; it should never be stored as an upload destination as it is isn't valid for one. 

### Identifier is a Folder GUID

First, we consider when the identifier is a folder guid. If so we should determine any child folders, but also, if this folder guid represents a context, we should determine any child contexts.

- Determine child folders:

```
Folders.GetSortedChildren({
	folderId:"b5239a96-8438-11e7-bc10-000c29aa9c88",
	sortInfo:{
		field:"ims:filename",
		direction:"ASC"
	}
})
```

The above returns a list of child summaries. This list should be filtered on the "type" field in each summary so only folders are considered. Then the guids from each summary passed into Folders.GetFolderDetails(...):

```
Folders.GetFolderDetails({
	folderIds: [
		"4accb713-2949-4f67-bf16-4372064d431f",
		"4accb713-2949-4f67-bf16-4372064d431f",
		"4accb713-2949-4f67-bf16-4372064d431f",
		...
	]
})
```

This will return complete folder details for each item. Notably `name` and `guid`.

- Now determine what type of folder we have and then get a list of child contexts if necessary.
	
```
Folders.GetFolderDetails({
	folderIds: ["b5239a96-8438-11e7-bc10-000c29aa9c88"]
})
```

From the response, inspect `folderType`. If `folderType` == "contextfolder" then also retrieve `context` from the response. Use this `context` identifier in the following:

```
Contexts.GetChildren({
	scope: "context123"
})
```

The above returns a sorted list of child contexts. Pass these into Contexts.GetDetails(...):

```
Contexts.GetDetails({
	context: [
		"context80",
		"context81",
		"context82",
		"context83"]
})
```

This will return context details for each child context. Notably `name`, `backingFolderGuid` and `avatar`.


### Identifier is a Special Context ID

There are only 2 special context ids of interest: `root` and `dom0`.

#### Displaying `root`

If you are displaying the contents of `root` you will be displaying the highest level items in the hierarchy. These should be a hardwired list of two contexts: the `dom0` context and the user's home context. The `dom0` context contains site wide assets, and the user's home context contains the user's private data. You should display these as follows:

- `dom0`
 - name: "Site"
 - avatar: Globe icon (SVG graphic will be provided)
 - id: `dom0` (i.e. navigating into here should result in the interface displaying the contents of the special `dom0` context as below)

- user's home context
 - name: `userDetails.name` from login API call
 - avatar: `userDetails.avatar` from login API call
 - id: `userDetails.backingFolderGuid` from login API call (i.e. navigating into here should  
result in displaying the contents of this folder guid using the process above)
 

#### Displaying `dom0`

If you are displaying the contents of `dom0` you should treat this as a context *without a backing folder*. i.e. only display child contexts.

```
Contexts.GetChildren({
	scope: "dom0"
})
```

The above returns a sorted list of child contexts. Pass these into Contexts.GetDetails(...):

```
Contexts.GetDetails({
	context: [
		"context80",
		"context81",
		"context82",
		"context83"]
})
```

This will return context details for each child context. Notably `name`, `backingFolderGuid` and `avatar`.


## Traversing Up The hierarchy

*Problem*: *Given a folder identifier, how do I determine the parent identifier in order to allow the user to navigate up the hierarchy.*

As with traversing down, we must consider the two scenarios of having a folder guid, or a special context ID.

### Identifier is a Folder GUID

- Determine what type of folder we have:
	
```
Folders.GetFolderDetails({
	folderIds: ["b5239a96-8438-11e7-bc10-000c29aa9c88"]
})
```

From the response, inspect `folderType`. If `folderType` is not "contextfolder" the parent is simply `parentGuid` in the response. 

Otherwise this is a context folder and we must find the parent context. So pass the `context` identifier from the response into Context.GetDetails(...):

```
Contexts.GetDetails({
	context: ["context1"]
})
```

This will return details for this context, notably `parentId`, indicating the parent context.

Now, if `parentId` == "dom0" then this is the parent identifier (it is one of the special context IDs). Otherwise we must get the context details to find the relevant folder guid.

```
Contexts.GetDetails({
	context: ["parentContext123"]
})
```

The response here will include `backingFolderGuid` which is the parent identifier you should use.

### Identifier is a Special Context ID

There are only 2 special context ids of interest: `root` and `dom0`.

#### `root`

`root` has no parent; it is the top level of the hierarchy.

#### `dom0`

The parent of `dom0` is `root`.


