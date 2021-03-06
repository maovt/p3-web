define([
	"dojo/_base/declare", "dgrid/Grid", "dojo/store/JsonRest", "dgrid/extensions/DijitRegistry",
	"dgrid/Keyboard", "dgrid/Selection", "./formatter", "dgrid/extensions/ColumnResizer", "dgrid/extensions/ColumnHider",
	"dgrid/extensions/DnD", "dojo/dnd/Source", "dojo/_base/Deferred", "dojo/aspect", "dojo/_base/lang",
	"dojo/topic", "dgrid/editor", "dijit/Menu", "dijit/MenuItem", "../WorkspaceManager", "dojo/on", "dijit/form/TextBox"

],
function(declare, Grid, Store, DijitRegistry,
		 Keyboard, Selection, formatter, ColumnResizer,
		 ColumnHider, DnD, DnDSource,
		 Deferred, aspect, lang, Topic, editor, Menu, MenuItem, WorkspaceManager, on, TextBox){
	return declare([Grid, ColumnHider, Selection, Keyboard, ColumnResizer, DijitRegistry], {
		columns: {
			"type": {
				label: "",
				get: function(item){
					if(item.type == "job_result" && item.autoMeta && item.autoMeta.app){
						return item.type + "_" + (item.autoMeta.app.id ? item.autoMeta.app.id : item.autoMeta.app);
					}
					return item.type;
				},
				className: "wsItemType",
				formatter: formatter.wsItemType,
				unhidable: true
			},
			"name": editor({
				label: "Name",
				field: "name",
				className: "wsItemName",
				canEdit: function(obj, val){
					return obj.id == 'untitled';
				},
				autoSave: true,
				editOn: "click",
				editor: TextBox,
				editorArgs: {placeHolder: "Untitled Folder", trim: true}
			}),
			size: {
				label: "Size",
				field: "size",
				get: function(item){
					return item;
				},
				className: "wsItemSize",
				hidden: false,
				formatter: formatter.objectOrFileSize
			},

			owner_id: {
				label: "Owner",
				field: "owner_id",
				className: "wsItemOwnerId",
				formatter: formatter.baseUsername,
				hidden: false
			},
			creation_time: {
				label: "Created",
				field: "creation_time",
				className: "wsItemCreationTime",
				formatter: formatter.date
			}/*,

			userMeta: {
				label: "User Metadata",
				field: "userMeta",
				hidden: true
			},
			autoMeta: {
				label: "Metadata",
				field: "autoMeta",
				hidden: true
			}*/
		},
		constructor: function(){
			this.dndParams.creator = lang.hitch(this, function(item, hint){
				console.log("item: ", item, " hint:", hint, "dataType: ", this.dndDataType);
				var avatar = dojo.create("div", {
					innerHTML: item.organism_name || item.ncbi_taxon_id || item.id
				});
				avatar.data = item;
				if(hint == 'avatar'){
					// create your avatar if you want
				}

				return {
					node: avatar,
					data: item,
					type: this.dndDataType
				}
			})

		},
		store: null,
		selectionMode: "extended",
		allowTextSelection: false,
		deselectOnRefresh: false,
		minRowsPerPage: 50,
		bufferRows: 100,
		maxRowsPerPage: 1000,
		pagingDelay: 250,
		//		pagingMethod: "throttleDelayed",
		farOffRemoval: 2000,
		keepScrollPosition: true,
		rowHeight: 24,
		loadingMessage: "Loading...",
		dndDataType: "genome",
		dndParams: {
			accept: "none",
			selfAccept: false,
			copyOnly: true
		},

		/*
			_setApiServer: function(server){
					console.log("_setapiServerAttr: ", server);
					this.apiServer = server;
					this.set('store', this.createStore(this.dataModel), this.buildQuery());
			},
		*/

		_setTotalRows: function(rows){
			this.totalRows = rows;
			console.log("Total Rows: ", rows);
			if(this.controlButton){
				console.log("this.controlButton: ", this.controlButton);
				if(!this._originalTitle){
					this._originalTitle = this.controlButton.get('label');
				}
				this.controlButton.set('label', this._originalTitle + " (" + rows + ")");

				console.log(this.controlButton);
			}
		},

		startup: function(){
			if(this._started){
				return;
			}
			var _self = this;
			aspect.before(_self, 'renderArray', function(results){
				Deferred.when(results.total, function(x){
					_self.set("totalRows", x);
				});
			});

			this.on(".dgrid-content .dgrid-row:dblclick", function(evt){
				var row = _self.row(evt);
				console.log("ItemDblClick (row): ", row.data.path);
				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});
				console.log('after emit');
				//if (row.data.type == "folder"){
				//	Topic.publish("/select", []);

				//	Topic.publish("/navigate", {href:"/workspace" + row.data.path })
				//	_selection={};
				//}
			});

			this.on(".dgrid-content .dgrid-cell.wsItemType:click", function(evt){
				var row = _self.row(evt);
				evt.preventDefault();
				evt.stopPropagation();
				console.log("ItemDblClick (icon): ", row.data.path);
				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});

			});
			//_selection={};
			//Topic.publish("/select", []);

			this.on("dgrid-select", function(evt){
				console.log('dgrid-select: ', evt);
				setTimeout(function(){
					var newEvt = {
						rows: evt.rows,
						selected: evt.grid.selection,
						grid: _self,
						bubbles: true,
						cancelable: true
					}
					on.emit(_self.domNode, "select", newEvt);
				}, 250);
				//console.log("dgrid-select");
				//var rows = event.rows;
				//Object.keys(rows).forEach(function(key){ _selection[rows[key].data.id]=rows[key].data; });
				//var sel = Object.keys(_selection).map(function(s) { return _selection[s]; });
				//Topic.publish("/select", sel);
			});
			this.on("dgrid-deselect", function(evt){
				console.log("dgrid-select");
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				}
				on.emit(_self.domNode, "deselect", newEvt);
				return;
//					var rows = evt.rows;
//					Object.keys(rows).forEach(function(key){ delete _selection[rows[key].data.id] });
//					var sel = Object.keys(_selection).map(function(s) { return _selection[s]; });
//					Topic.publish("/select", sel);
			});
			/*
			var activeItem;
			this.on(".dgrid-content:contextmenu", function(evt){
				var row=_self.row(evt);
				activeItem = row;
				console.log("activeItem: ", row.data);
			});

			var menu = new Menu({
				  // Hook menu at domNode level since it stops propagation, and would
				  // block any contextmenu events delegated from the domNode otherwise
				  targetNodeIds: [this.domNode]
			});

			menu.addChild(new MenuItem({
				label: "Delete Object",
				onClick: function() {
					if (activeItem) {
						console.log("Delete Object: ", activeItem.data.id, activeItem.data.path);
						if (activeItem.data.type=="folder"){
							WorkspaceManager.deleteFolder([activeItem.data.path]);
						}else{
							WorkspaceManager.deleteObject([activeItem.data.path],true);
						}

					}
				}
			}));
			*/

			this.inherited(arguments);
			this._started = true;

		},
		_setActiveFilter: function(filter){
			console.log("Set Active Filter: ", filter, "started:", this._started);
			this.activeFilter = filter;
			this.set("query", this.buildQuery());
		},

		buildQuery: function(table, extra){
			var q = "?" + (this.activeFilter ? ("in(gid,query(genomesummary,and(" + this.activeFilter + ",limit(Infinity),values(genome_info_id))))") : "") + (this.extra || "");
			console.log("Feature Grid Query:", q);
			return q;
		},
		createStore: function(dataModel){
			console.log("Create Store for ", dataModel, " at ", this.apiServer);
			var store = new Store({
				target: (this.apiServer ? (this.apiServer) : "") + "/" + dataModel + "/",
				idProperty: "rownum",
				headers: {
					"accept": "application/json",
					"content-type": "application/json",
					'X-Requested-With': null,
					"Authorization": (window.App.authorizationToken || "")
				}
			});
			console.log("store: ", store);
			return store;
		},

		getFilterPanel: function(){
			console.log("getFilterPanel()");
			return FilterPanel;
		}

	});

});
