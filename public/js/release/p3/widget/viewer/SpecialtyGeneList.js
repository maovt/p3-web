define("p3/widget/viewer/SpecialtyGeneList", [
	"dojo/_base/declare", "./TabViewerBase", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../PageGrid", "../formatter", "../SpecialtyGeneGridContainer", "../SequenceGridContainer",
	"../GenomeGridContainer", "../../util/PathJoin", "dojo/request", "dojo/_base/lang"
], function(declare, TabViewerBase, on,
			domClass, ContentPane, domConstruct,
			Grid, formatter, SpecialtyGeneGridContainer, SequenceGridContainer,
			GenomeGridContainer, PathJoin, xhr, lang){
	return declare([TabViewerBase], {
		"baseClass": "SpecialtyGeneList",
		"disabled": false,
		"containerType": "spgene_data",
		"query": null,
		paramsMap: "query",
		total_features: 0,
		warningContent: 'Your query returned too many results for detailed analysis.',
		_setQueryAttr: function(query){
			console.log(this.id, " _setQueryAttr: ", query, this);
			//if (!query) { console.log("GENOME LIST SKIP EMPTY QUERY: ");  return; }
			//console.log("GenomeList SetQuery: ", query, this);

			this._set("query", query);
			if(!this._started){
				return;
			}

			var _self = this;
			console.log('spGeneList setQuery - this.query: ', this.query);

			var url = PathJoin(this.apiServiceUrl, "sp_gene", "?" + (this.query) + "&limit(1)"); //&facet((field,genome_id),(limit,35000))");

			console.log("url: ", url);
			xhr.get(url, {
				headers: {
					accept: "application/solr+json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(function(res){
				console.log(" URL: ", url);
				console.log("Get GenomeList Res: ", res);
				if(res && res.response && res.response.docs){
					var features = res.response.docs;
					if(features){
						_self._set("total_features", res.response.numFound);
					}
				}else{
					console.log("Invalid Response for: ", url);
				}
			}, function(err){
				console.log("Error Retreiving Genomes: ", err)
			});

		},

		onSetState: function(attr, oldVal, state){
			console.log("GenomeList onSetState()  OLD: ", oldVal, " NEW: ", state);

			// if (!state.feature_ids){
			// 	console.log("	NO Genome_IDS")
			// 	if (state.search == oldVal.search){
			// 		console.log("		Same Search")
			// 		console.log("		OLD Genome_IDS: ", oldVal.genome_ids);
			// 		this.set("state", lang.mixin({},state,{feature_ids: oldVal.genome_ids}))	
			// 		return;
			// 	}else{
			// 		this.set("query", state.search);
			// 	}
			// }else if (state.search!=oldVal.search){
			// 	console.log("SET QUERY: ", state.search);
			// 	this.set("query", state.search);
			// }

			this.set("query", state.search);

			// //console.log("this.viewer: ", this.viewer.selectedChildWidget, " call set state: ", state);
			var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : "overview";
			if(active == "specialtyGenes"){
				this.setActivePanelState()
			}
			;

			this.inherited(arguments);
		},

		onSetQuery: function(attr, oldVal, newVal){
			this.overview.set("content", '<div style="margin:4px;">Specialty Gene List Query: ' + decodeURIComponent(newVal) + "</div>");
			// this.viewHeader.set("content", '<div style="margin:4px;">Specialty Gene Query: ' + decodeURIComponent(newVal) + ' </div>')
			this.queryNode.innerHTML = '<i class="fa icon-anchor fa-1x" style="font-size:1.2em;color:#76A72D;vertical-align:top;"></i>&nbsp;Specialty Gene Query:&nbsp;' + decodeURIComponent(newVal);
		},

		setActivePanelState: function(){

			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";
			console.log("Active: ", active, "state: ", this.state);

			var activeTab = this[active];

			if(!activeTab){
				console.log("ACTIVE TAB NOT FOUND: ", active);
				return;
			}

			switch(active){
				case "specialtyGenes":
					activeTab.set("state", this.state);
					break;
				default:
					var activeQueryState;
					if(this.state && this.state.genome_ids){
						console.log("Found Genome_IDS in state object");
						var activeQueryState = lang.mixin({}, this.state, {search: "in(genome_id,(" + this.state.genome_ids.join(",") + "))"});
						// console.log("gidQueryState: ", gidQueryState);
						console.log("Active Query State: ", activeQueryState);

					}

					if(activeQueryState){
						activeTab.set("state", activeQueryState);
					}else{
						console.warn("MISSING activeQueryState for PANEL: " + active);
					}
					break;
			}
			console.log("Set Active State COMPLETE");
		},

		onSetSpecialtyGeneIds: function(attr, oldVal, genome_ids){
			console.log("onSetGenomeIds: ", genome_ids, this.feature_ids, this.state.feature_ids);
			this.state.feature_ids = feature_ids;
			this.setActivePanelState();
		},

		createOverviewPanel: function(state){
			return new ContentPane({
				content: "Overview",
				title: "Overview",
				id: this.viewer.id + "_" + "overview",
				state: this.state
			});
		},

		postCreate: function(){
			this.inherited(arguments);

			this.watch("query", lang.hitch(this, "onSetQuery"));
			this.watch("total_features", lang.hitch(this, "onSetTotalSpecialtyGenes"));

			this.overview = this.createOverviewPanel(this.state);
			this.totalCountNode = domConstruct.create("span", {innerHTML: "( loading... )"});
			this.queryNode = domConstruct.create("span", {innerHTML: " Specialty Gene List Query:  "});

			domConstruct.place(this.queryNode, this.viewHeader.containerNode, "last");
			domConstruct.place(this.totalCountNode, this.viewHeader.containerNode, "last");

			this.specialtyGenes = new SpecialtyGeneGridContainer({
				title: "Specialty Genes",
				id: this.viewer.id + "_" + "specialtyGenes",
				disabled: false
			});
			// this.sequences = new SequenceGridContainer({
			// 	title: "Sequences",
			// 	id: this.viewer.id + "_" + "sequences",
			// 	state: this.state,
			// 	disable: true
			// });

			// this.genomes = new GenomeGridContainer({
			// 	title: "Genomes",
			// 	id: this.viewer.id + "_" + "genomes",
			// 	state: this.state,
			// 	disable: true
			// });

			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.specialtyGenes);
			// this.viewer.addChild(this.sequences);
			// this.viewer.addChild(this.genomes);

		},
		onSetTotalSpecialtyGenes: function(attr, oldVal, newVal){
			console.log("ON SET TOTAL GENOMES: ", newVal);
			this.totalCountNode.innerHTML = " ( " + newVal + "  Specialty Genes ) ";
			var hasDisabled = false;

			// this.viewer.getChildren().forEach(function(child){
			// 	if(child && child.maxGenomeCount && (newVal > child.maxGenomeCount)){
			// 		hasDisabled = true;
			// 		child.set("disabled", true);
			// 	}else{
			// 		child.set("disabled", false);
			// 	}
			// });

			// if(hasDisabled){
			// 	this.showWarning();
			// }else{
			// 	this.hideWarning();
			// }
		},
		hideWarning: function(){
			if(this.warningPanel){
				this.removeChild(this.warningPanel);
			}
		},

		showWarning: function(msg){
			if(!this.warningPanel){
				this.warningPanel = new ContentPane({
					style: "margin:0px; padding: 0px;margin-top: -10px;",
					content: '<div class="WarningBanner" style="background: #f9ff85;text-align:center;margin:4px;margin-bottom: 0px;margin-top: 0px;padding:4px;border:0px solid #aaa;border-radius:4px;">' + this.warningContent + "</div>",
					region: "top",
					layoutPriority: 3
				});
			}
			this.addChild(this.warningPanel);
		},
		onSetAnchor: function(evt){
			console.log("onSetAnchor: ", evt, evt.filter);
			evt.stopPropagation();
			evt.preventDefault();
			var f = evt.filter;
			var parts = [];
			if(this.query){
				var q = (this.query.charAt(0) == "?") ? this.query.substr(1) : this.query;
				if(q != "keyword(*)"){
					parts.push(q)
				}
			}
			if(evt.filter){
				parts.push(evt.filter)
			}

			console.log("parts: ", parts);

			if(parts.length > 1){
				q = "?and(" + parts.join(",") + ")"
			}else if(parts.length == 1){
				q = "?" + parts[0]
			}else{
				q = "";
			}

			console.log("SetAnchor to: ", q);
			var hp;
			if(this.hashParams && this.hashParams.view_tab){
				hp = {view_tab: this.hashParams.view_tab}
			}else{
				hp = {}
			}
			l = window.location.pathname + q + "#" + Object.keys(hp).map(function(key){
					return key + "=" + hp[key]
				}, this).join("&");
			console.log("NavigateTo: ", l);
			Topic.publish("/navigate", {href: l});
		}
	});
});
