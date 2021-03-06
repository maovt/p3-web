define("p3/widget/ProteinFamiliesHeatmapContainer", [
	"dojo/_base/declare", "dijit/layout/ContentPane", "dijit/layout/BorderContainer", "dojo/on",
	"./ContainerActionBar", "dijit/popup", "dojo/topic", "dojo/dom-construct", "dojo/dom", "dojo/query",
	"dijit/TooltipDialog", "dijit/Dialog",
	"dijit/form/Form", "dijit/TitlePane", "dijit/form/RadioButton", "dijit/form/Select", "dijit/registry",
	"./HeatmapContainer",
	"dojo/_base/lang", "dojo/when", "dojo/request", "../util/PathJoin", "dijit/form/Button"

], function(declare, ContentPane, BorderContainer, on,
			ContainerActionBar, popup, Topic, domConstruct, dom, Query,
			TooltipDialog, Dialog,
			Form, TitlePane, RadioButton, Select, registry,
			HeatmapContainer,
			lang, when, request, PathJoin, Button){

	return declare([BorderContainer, HeatmapContainer], {
		gutters: false,
		state: null,
		visible: false,
		dataGridContainer: null,
		pfState: null,
		containerActions: [
			[
				"Flip Axis",
				"fa icon-rotate-left fa-2x",
				{label: "Flip Axis", multiple: false, validTypes: ["*"]},
				function(){
					// flip internal flag
					if(this.pfState.heatmapAxis === ""){
						this.pfState.heatmapAxis = "Transposed";
					}else{
						this.pfState.heatmapAxis = "";
					}

					Topic.publish("ProteinFamiliesHeatmap", "refresh");
				},
				true
			],
			[
				"Cluster",
				"fa icon-make-group fa-2x",
				{label: "Cluster", multiple: false, validTypes: ["*"]},
				"cluster",
				true
			],
			[
				"Advanced Clustering",
				"fa icon-make-group fa-2x",
				{label: "Advanced", multiple: false, validTypes: ["*"]},
				function(){
					var self = this;

					this.dialog.set('content', this._buildPanelAdvancedClustering());

					// building action bar
					var actionBar = domConstruct.create("div", {
						"class": "dijitDialogPaneActionBar"
					});
					var btnSubmit = new Button({
						label: 'Submit',
						onClick: function(){
							var param = {};
							var f = registry.byId("advancedClusterParams").value;

							param.g = (f['cluster_by'] === 3 || f['cluster_by'] === 1) ? f['algorithm'] : 0;
							param.e = (f['cluster_by'] === 3 || f['cluster_by'] === 2) ? f['algorithm'] : 0;
							param.m = f['type'];

							//console.log('advanced cluster param: ', param);
							self.cluster(param);
							self.dialog.hide();
						}
					});
					var btnCancel = new Button({
						label: 'Cancel',
						onClick: function(){
							self.dialog.hide();
						}
					});
					btnSubmit.placeAt(actionBar);
					btnCancel.placeAt(actionBar);

					domConstruct.place(actionBar, this.dialog.containerNode, "last");

					this.dialog.show();
				},
				true
			],
			[
				"Anchor",
				"fa fa-random fa-2x",
				{
					label: "Anchor",
					multiple: false,
					validType: ["*"],
					tooltip: "Anchor by genome",
					tooltipDialog: null
				},
				function(){

					// dialog for anchoring
					if(this.containerActionBar._actions.Anchor.options.tooltipDialog == null){
						this.tooltip_anchoring = new TooltipDialog({
							content: this._buildPanelAnchoring()/*,
							onMouseLeave: function(){
								popup.close(this.tooltip_anchoring);
							}*/
						});
						this.containerActionBar._actions.Anchor.options.tooltipDialog = this.tooltip_anchoring;
					}

					popup.open({
						popup: this.containerActionBar._actions.Anchor.options.tooltipDialog,
						around: this.containerActionBar._actions.Anchor.button,
						orient: ["below"]
					});

				},
				true
			]
		],
		constructor: function(options){
			this.dataGridContainer = options.dataGridContainer;
			this.pfState = options.pfState;
			this.dialog = new Dialog({});

			var self = this;
			// subscribe
			Topic.subscribe("ProteinFamiliesHeatmap", lang.hitch(self, function(){
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "refresh":
						this.currentData = self.dataGridContainer.grid.store.getHeatmapData(self.pfState);
						this.flashDom.refreshData();
						break;
					default:
						break;
				}
			}));
		},
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
				this.initializeFlash('ProteinFamilyHeatMap');
			}
		},
		onFirstView: function(){
			if(this._firstView){
				return;
			}

			// action buttons for heatmap viewer
			this.containerActionBar = new ContainerActionBar({
				region: "top"
			});
			this.containerActions.forEach(function(a){
				this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
			}, this);
			this.addChild(this.containerActionBar);

			//TODO: add legend
			this.addChild(new ContentPane({
				region: "center",
				content: "<div id='flashTarget'></div>",
				style: "padding:0"
			}));

			this.inherited(arguments);
			this._firstView = true;
		},
		flashReady: function(){
			if(typeof(this.flashDom.refreshData) == "function"){
				Topic.publish("ProteinFamiliesHeatmap", "refresh");
			}
		},
		flashCellClicked: function(flashObjectID, colID, rowID){
			//console.log("flashCellClicked is called ", colID, rowID);
			var isTransposed = (this.pfState.heatmapAxis === 'Transposed');
			var originalAxis = this._getOriginalAxis(isTransposed, colID, rowID);

			var familyId = originalAxis.columnIds;
			var genomeId = originalAxis.rowIds;

			var query = "?and(eq(" + this.pfState.familyType + "_id," + familyId + "),eq(genome_id," + genomeId + "),eq(feature_type,CDS),eq(annotation,PATRIC))";

			request.get(PathJoin(window.App.dataServiceURL, "genome_feature", query), {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				}
			}).then(lang.hitch(this, function(features){
				this.dialog.set('content', this._buildPanelCellClicked(isTransposed, familyId, genomeId, features));
				var actionBar = this._buildPanelButtons(colID, rowID, familyId, genomeId, features);
				domConstruct.place(actionBar, this.dialog.containerNode, "last");

				this.dialog.show();
			}));

		},
		flashCellsSelected: function(flashObjectID, colIDs, rowIDs){
			//console.log("flashCellsSelected is called", colIDs, rowIDs);
			if(rowIDs.length == 0) return;
			var isTransposed = (this.pfState.heatmapAxis === 'Transposed');
			var originalAxis = this._getOriginalAxis(isTransposed, colIDs, rowIDs);

			var familyIds = originalAxis.columnIds;
			var genomeIds = originalAxis.rowIds;

			var query = "and(in(" + this.pfState.familyType + "_id,(" + familyIds + ")),in(genome_id,(" + genomeIds + ")),eq(feature_type,CDS),eq(annotation,PATRIC))";

			request.post(PathJoin(window.App.dataServiceURL, "genome_feature", query), {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || '')
				},
				data: query
			}).then(lang.hitch(this, function(features){
				this.dialog.set('content', this._buildPanelCellsSelected(isTransposed, familyIds, genomeIds, features));
				var actionBar = this._buildPanelButtons(colIDs, rowIDs, familyIds, genomeIds, features);
				domConstruct.place(actionBar, this.dialog.containerNode, "last");

				this.dialog.show();
			}));
		},
		_buildPanelCellClicked: function(isTransposed, familyId, genomeId, features){
			//console.log("_buildPanelCellClicked is called. isTransposed: ", isTransposed, "familyId: " + familyId, "genomeId: " + genomeId);
			var gfs = this.pfState.genomeFilterStatus;
			//console.log(gfs, gfs[genomeId]);
			var genomeName = gfs[genomeId].getGenomeName();
			var description = '', memberCount = 0, index = 0;

			if(isTransposed){
				// rows: families, columns: genomes
				this.currentData.rows.forEach(function(row, idx){
					if(row.rowID === familyId){
						description = row.rowLabel;
						index = idx;
					}
				});
				this.currentData.columns.forEach(function(col){
					if(col.colID === genomeId){
						memberCount = parseInt(col.distribution.substr(2 * index, 2), 16);
					}
				})
			}else{
				index = gfs[genomeId].getIndex();
				this.currentData.columns.forEach(function(col){
					if(col.colID === familyId){
						description = col.colLabel;
						memberCount = parseInt(col.distribution.substr(2 * index, 2), 16);
					}
				});
			}

			var text = [];
			text.push('<b>Genome:</b> ' + genomeName);
			text.push('<b>Product:</b> ' + description);
			text.push('<b>Family ID:</b> ' + familyId);
			text.push('<b>Members:</b> ' + memberCount);
			features.forEach(function(feature){
				var featureLink = '<a href="/view/Feature/' + feature.feature_id + '">' + feature.patric_id + '</a>';
				if(feature.refseq_locus_tag !== undefined){
					featureLink += ", " + feature.refseq_locus_tag;
				}
				if(feature.alt_locus_tag !== undefined){
					featureLink += ", " + feature.alt_locus_tag;
				}
				text.push(featureLink);
			});

			return text.join("<br>");
		},
		_buildPanelCellsSelected: function(isTransposed, familyIds, genomeIds, features){

			//var membersCount = this._countMembers(colIDs, rowIDs);

			var text = [];
			text.push('<b>Genomes Selected:</b> ' + genomeIds.length);
			text.push('<b>Family Selected:</b> ' + familyIds.length);
			text.push('<b>Members:</b> ' + features.length);

			return text.join("<br>");
		},
		_buildPanelAdvancedClustering: function(){

			if(registry.byId("advancedClusterParams") !== undefined){
				registry.byId("advancedClusterParams").destroyRecursive();
			}

			var form = new Form({
				id: 'advancedClusterParams'
			});

			var tp_dim = new TitlePane({
				title: "Cluster by"
			}).placeAt(form.containerNode);

			new RadioButton({
				checked: false,
				value: 2,
				name: "cluster_by",
				label: "Protein Families"
			}).placeAt(tp_dim.containerNode);
			domConstruct.place('<label>Protein Families</label><br/>', tp_dim.containerNode, "last");

			new RadioButton({
				checked: false,
				value: 1,
				name: "cluster_by",
				label: "Genomes"
			}).placeAt(tp_dim.containerNode);
			domConstruct.place('<label>Genomes</label><br/>', tp_dim.containerNode, "last");

			new RadioButton({
				checked: true,
				value: 3,
				name: "cluster_by",
				label: "Both"
			}).placeAt(tp_dim.containerNode);
			domConstruct.place('<label>Both</label>', tp_dim.containerNode, "last");

			var sel_algorithm = new Select({
				name: "algorithm",
				value: 2,
				options: [{
					value: 0, label: "No clustering"
				}, {
					value: 1, label: "Un-centered correlation"
				}, {
					value: 2, label: "Pearson correlation"
				}, {
					value: 3, label: "Un-centered correlation, absolute value"
				}, {
					value: 4, label: "Pearson correlation, absolute value"
				}, {
					value: 5, label: "Spearman rank correlation"
				}, {
					value: 6, label: "Kendall tau"
				}, {
					value: 7, label: "Euclidean distance"
				}, {
					value: 8, label: "City-block distance"
				}]
			});

			var sel_type = new Select({
				name: "type",
				value: 'a',
				options: [{
					value: "m", label: "Pairwise complete-linkage"
				}, {
					value: "s", label: "Pairwise single-linkage"
				}, {
					value: "c", label: "Pairwise centroid-linkage"
				}, {
					value: "a", label: "Pairwise average-linkage"
				}]
			});

			new TitlePane({
				title: "Clustering algorithm",
				content: sel_algorithm
			}).placeAt(form.containerNode);

			new TitlePane({
				title: "Clustering type",
				content: sel_type
			}).placeAt(form.containerNode);

			return form;
		},
		_buildPanelAnchoring: function(){

			var self = this;
			var pfState = self.pfState;
			var options = pfState.genomeIds.map(function(genomeId){
				return {
					value: genomeId,
					label: pfState.genomeFilterStatus[genomeId]['genome_name']
				};
			});

			var anchor = new Select({
				name: "anchor",
				options: options
			});
			anchor.on('change', function(genomeId){
				self.anchor(genomeId);
				popup.close(self.tooltip_anchoring);
			});

			return anchor;
		},
		_buildPanelButtons: function(colIDs, rowIDs, familyIds, genomeIds, features){
			var _self = this;
			var actionBar = domConstruct.create("div", {
				"class": "dijitDialogPaneActionBar"
			});

			var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
			var downloadHM = new TooltipDialog({
				content: dfc,
				onMouseLeave: function(){
					popup.close(downloadHM);
				}
			});
			var downloadPT = new TooltipDialog({
				content: dfc,
				onMouseLeave: function(){
					popup.close(downloadPT);
				}
			});

			var btnDownloadHeatmap = new Button({
				label: 'Download Heatmap Data'
			});
			on(downloadHM.domNode, "click", function(e){
				if(e.target.attributes.rel === undefined)return;
				var rel = e.target.attributes.rel.value;
				var DELEMITER;
				if(rel === 'text/csv'){
					DELEMITER = ',';
				}else{
					DELEMITER = '\t';
				}

				var colIndexes = [];
				_self.currentData.columns.forEach(function(col, idx){
					if(colIDs.indexOf(col.colID) > -1){
						colIndexes[colIDs.indexOf(col.colID)] = idx;
					}
				});

				var header = _self.currentData.rowLabel + "/" + _self.currentData.colLabel;
				colIndexes.forEach(function(colIdx){
					header += DELEMITER + _self.currentData.columns[colIdx].colLabel;
				});

				var data = [];
				_self.currentData.rows.forEach(function(row, idx){
					if(rowIDs.indexOf(row.rowID) > -1){
						var r = [];
						r.push(row.rowLabel);
						colIndexes.forEach(function(colIdx){
							var val = parseInt(_self.currentData.columns[colIdx].distribution.substr(idx * 2, 2), 16);
							r.push(val);
						});
						data[rowIDs.indexOf(row.rowID)] = r.join(DELEMITER);
					}
				});
				window.open('data:' + rel + ',' + encodeURIComponent(header + "\n" + data.join("\n")));
				// refer http://jsfiddle.net/a856P/51/ for further implementation
				popup.close(downloadHM);
			});
			on(btnDownloadHeatmap.domNode, "click", function(){
				popup.open({
					popup: downloadHM,
					around: btnDownloadHeatmap.domNode,
					orient: ["below"]
				});
			});

			var btnDownloadProteins = new Button({
				label: 'Download Proteins'
			});
			on(downloadPT.domNode, "click", function(e){
				if(e.target.attributes.rel === undefined)return;
				var rel = e.target.attributes.rel.value;
				var currentQuery = "?in(feature_id,(" + features.map(function(f){
						return f.feature_id;
					}).join(",") + "))";

				window.open(window.App.dataServiceURL + "/genome_feature/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download");
				popup.close(downloadPT);
			});

			on(btnDownloadProteins.domNode, "click", function(){
				popup.open({
					popup: downloadPT,
					around: btnDownloadProteins.domNode,
					orient: ["below"]
				});
			});

			var btnShowDetails = new Button({
				label: 'Show Proteins'
			});
			var btnAddToWorkspace = new Button({
				label: 'Add Proteins to Group'
			});
			var btnCancel = new Button({
				label: 'Cancel',
				onClick: function(){
					_self.dialog.hide();
				}
			});

			btnDownloadHeatmap.placeAt(actionBar);
			btnDownloadProteins.placeAt(actionBar);
			btnShowDetails.placeAt(actionBar);
			btnAddToWorkspace.placeAt(actionBar);
			btnCancel.placeAt(actionBar);

			return actionBar;
		},
		_getOriginalAxis: function(isTransposed, columnIds, rowIds){
			var originalAxis = {};
			//console.log("_getOriginalAxis: ", isTransposed, columnIds, rowIds);

			if(isTransposed){
				originalAxis.columnIds = rowIds;
				originalAxis.rowIds = columnIds;
			}else{
				originalAxis.columnIds = columnIds;
				originalAxis.rowIds = rowIds;
			}
			return originalAxis;
		},
		cluster: function(param){

			console.log("cluster is called", param);
			//this.set('loading', true);
			var p = param || {g: 2, e: 2, m: 'a'};
			var pfState = this.pfState;
			var isTransposed = pfState.heatmapAxis === 'Transposed';
			var data = this.exportCurrentData(isTransposed);

			return when(window.App.api.data("cluster", [data, p]), lang.hitch(this, function(res){
				console.log("Cluster Results: ", res);
				//this.set('loading', false);

				// DO NOT TRANSPOSE. clustering process is based on the corrected axises
				pfState.clusterRowOrder = res.rows;
				pfState.clusterColumnOrder = res.columns;

				// re-draw heatmap
				Topic.publish("ProteinFamiliesHeatmap", "refresh");
			}));
		},
		anchor: function(genomeId){

			var dataStore = this.dataGridContainer.grid.store;

			when(dataStore.getSyntenyOrder(genomeId), lang.hitch(this, function(newFamilyOrderSet){

				var pfState = this.pfState;
				var isTransposed = pfState.heatmapAxis === 'Transposed';

				var currentFamilyOrder, adjustedFamilyOrder, leftOver = [];
				if(isTransposed){
					currentFamilyOrder = this.currentData.rows.map(function(row){
						return row.rowID;
					});
				}else{
					currentFamilyOrder = this.currentData.columns.map(function(col){
						return col.colID;
					});
				}

				currentFamilyOrder.forEach(function(id){
					if(!newFamilyOrderSet.hasOwnProperty(id)){
						leftOver.push(id);
					}
				});

				adjustedFamilyOrder = Object.keys(newFamilyOrderSet).concat(leftOver);

				// clusterRow/ColumnOrder assumes corrected axises
				pfState.clusterColumnOrder = adjustedFamilyOrder;

				// re-draw heatmap
				Topic.publish("ProteinFamiliesHeatmap", "refresh");
			}));
		}
	});
});
