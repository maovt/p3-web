define("p3/widget/viewer/Experiment", [
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"../PageGrid","../formatter"
], function(
	declare, BorderContainer, on,
	domClass,ContentPane,domConstruct,
	Grid,formatter
){
	return declare([BorderContainer], {
		"baseClass": "ExperimentViewer",
		"disabled":false,
		"query": null,
		_setQueryAttr: function(query){
			this.query = query;
			if (this.viewer){
				this.viewer.set("query", query);
			}
		},
		startup: function(){
			if (this._started) {return;}
			this.viewHeader = new ContentPane({content: "Experiment Viewer", region: "top"});
			this.viewer = new Grid({
				region: "center",
				query: (this.query||""),
				apiToken: window.App.authorizationToken,
				apiServer: window.App.dataAPI,
				dataModel: "genome",
				deselectOnRefresh: true,
				columns: {
					title: {label: "Title", field: "title"},
					genes: {label: "Genes", field: "genes"},
					sigGenesLR: {label: "Significant Genes (Log Ratio)", field: "signification_genes_log_ratio"},
					sigGenesZS: {label: "Significant Genes (Z Score)", field: "signification_genes_z_score"},
					strain: {label: "Strain", field: "strain"},
					gene_modification: {label: "Gene Modification", field: "gene_modification"},
					expCondition: {label: "Experiment Condition", field: "experiment_condition"},
					timePoint: {label: "Time Point", field: "time_point"},
				}
			});
				var _self = this
                                this.viewer.on(".dgrid-content .dgrid-row:dblclick", function(evt) {
                                    var row = _self.viewer.row(evt);
                                    console.log("dblclick row:", row)
                                        on.emit(_self.domNode, "ItemDblClick", {
                                                item_path: row.data.path,
                                                item: row.data,
                                                bubbles: true,
                                                cancelable: true
                                        });
                                        console.log('after emit');
                                    //if (row.data.type == "folder"){
                //                              Topic.publish("/select", []);

                //                              Topic.publish("/navigate", {href:"/workspace" + row.data.path })
                //                              _selection={};
                                        //}
                                });
                                //_selection={};
                                //Topic.publish("/select", []);

                                this.viewer.on("dgrid-select", function(evt) {
                                        console.log('dgrid-select: ', evt);
                                        var newEvt = {
                                                rows: event.rows,
                                                selected: evt.grid.selection,
                                                grid: _self.viewer,
                                                bubbles: true,
                                                cancelable: true
                                        }
                                        on.emit(_self.domNode, "select", newEvt);
                                        //console.log("dgrid-select");
                                        //var rows = event.rows;
                                        //Object.keys(rows).forEach(function(key){ _selection[rows[key].data.id]=rows[key].data; });
                                        //var sel = Object.keys(_selection).map(function(s) { return _selection[s]; });
                                        //Topic.publish("/select", sel);
                                });
                                this.viewer.on("dgrid-deselect", function(evt) {
                                        console.log("dgrid-select");
                                        var newEvt = {
                                                rows: event.rows,
                                                selected: evt.grid.selection,
                                                grid: _self.viewer,
                                                bubbles: true,
                                                cancelable: true
                                        }
                                        on.emit(_self.domNode, "deselect", newEvt);
                                        return;
//                                      var rows = event.rows;
//                                      Object.keys(rows).forEach(function(key){ delete _selection[rows[key].data.id] });
//                                      var sel = Object.keys(_selection).map(function(s) { return _selection[s]; });
//                                      Topic.publish("/select", sel);
                                });
			this.addChild(this.viewHeader);
			this.addChild(this.viewer);
			this.inherited(arguments);
			this.viewer.refresh();
		}
	});
});
