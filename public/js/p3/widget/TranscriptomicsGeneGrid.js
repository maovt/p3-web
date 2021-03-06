define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/on", "dojo/dom-class", "dojo/dom-construct", "dojo/aspect", "dojo/request", "dojo/topic",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane",
	"./PageGrid", "./formatter", "../store/TranscriptomicsGeneMemoryStore"
], function(declare, lang, Deferred,
			on, domClass, domConstruct, aspect, request, Topic,
			BorderContainer, ContentPane,
			Grid, formatter, Store){
	return declare([Grid], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataServiceURL,
		store: null,
		dataModel: "genome_feature",
		primaryKey: "feature_id",
		selectionModel: "extended",
		deselectOnRefresh: true,
		columns: {
			// "Selection Checkboxes": selector({}),
			genome_name: {label: 'Genome', field: 'genome_name'},
			patric_id: {label: 'PATRIC ID', field: 'patric_id'},
			refseq_locus_tag: {label: 'RefSeq Locus Tag', field: 'refseq_locus_tag'},
			alt_locus_tag: {label: 'Alt Locus Tag', field: 'alt_locus_tag'},
			gene: {label: 'Gene Symbol', field: 'gene'},
			product: {label: 'Product', field: 'product'},
			start: {label: 'Start', field: 'start', hidden:true},
			end: {label: 'End', field: 'end', hidden:true},
			strand: {label: 'Strand', field: 'strand', hidden:true},
			comparisons: {label: 'Comparisons', field: 'sample_size'},
			up_reg: {label: 'Up', field: 'up'},
			down_reg: {label: 'Down', field: 'down'}
		},
		constructor: function(options){
			//console.log("ProteinFamiliesGrid Ctor: ", options);
			if(options && options.apiServer){
				this.apiServer = options.apiServer;
			}

			Topic.subscribe("TranscriptomicsGene", lang.hitch(this, function(){
				// console.log("TranscriptomicsGeneGrid:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updateMainGridOrder":
						this.store.arrange(value);
						this.refresh();
						break;
					default:
						break;
				}
			}));
		},
		startup: function(){
			var _self = this;

			this.on(".dgrid-content .dgrid-row:dblclick", function(evt){
				var row = _self.row(evt);
				//console.log("dblclick row:", row);
				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});
				// console.log('after emit');
			});

			this.on("dgrid-select", function(evt){
				//console.log('dgrid-select: ', evt);
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "select", newEvt);
			});

			this.on("dgrid-deselect", function(evt){
				//console.log("dgrid-deselect");
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "deselect", newEvt);
			});

			aspect.before(_self, 'renderArray', function(results){
				Deferred.when(results.total, function(x){
					_self.set("totalRows", x);
				});
			});

			this.inherited(arguments);
			this._started = true;
		},

		state: null,
		postCreate: function(){
			this.inherited(arguments);
		},
		_setApiServer: function(server){
			this.apiServer = server;
		},
		_setState: function(state){
			if(!this.store){
				this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
			}else{
				this.store.set('state', state);

				this.refresh();
			}
		},
		createStore: function(server, token, state){

			var store = new Store({
				token: token,
				apiServer: this.apiServer || window.App.dataServiceURL,
				state: state || this.state
			});
			store.watch('refresh', lang.hitch(this, "refresh"));

			return store;
		}
	});
});
