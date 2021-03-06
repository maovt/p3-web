define("p3/widget/viewer/_GenomeList", [
	"dojo/_base/declare", "./TabViewerBase", "dojo/on", "dojo/_base/lang",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct", "dojo/topic",
	"../formatter", "dijit/layout/TabContainer", "../GenomeOverview",
	"dojo/request", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer", "../InteractionsContainer", "../GenomeGridContainer",
	"../SequenceGridContainer", "../../util/PathJoin", "../../util/QueryToEnglish"
], function(declare, TabViewerBase, on, lang,
			domClass, ContentPane, domConstruct, Topic,
			formatter, TabContainer, GenomeOverview,
			xhr, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer, InteractionsContainer, GenomeGridContainer,
			SequenceGridContainer, PathJoin, QueryToEnglish){
	return declare([TabViewerBase], {
		paramsMap: "query",
		maxGenomesPerList: 10000,
		totalGenomes: 0,
		warningContent: 'Your query returned too many results for detailed analysis.  On the "Genomes" Tab below, use the SHOW FILTERS button ( <i class="fa icon-filter fa-1x" style="color:#333"></i> ) or the keywords input box to reduce the results to a manageble set ( {{maxGenomesPerList}} Genomes or below).<br> When you are satisfied, click APPLY FILTERS ( <i class="fa icon-anchor fa-1x" style="color:#333"></i> ) to restablish the page context.',
		_setQueryAttr: function(query){
			// console.log(this.id, " _setQueryAttr: ", query, this);
			//if (!query) { console.log("GENOME LIST SKIP EMPTY QUERY: ");  return; }
			//console.log("GenomeList SetQuery: ", query, this);

			this._set("query", query);
			// if(!this._started){
			// 	return;
			// }

			var _self = this;
			console.log('genomeList setQuery - this.query: ', this.query);

			var url = PathJoin(this.apiServiceUrl, "genome", "?" + (this.query) + "&select(genome_id)&limit(" + this.maxGenomesPerList + ")");

			console.log("url: ", url);
			xhr.get(url, {
				headers: {
					accept: "application/solr+json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(function(res){
				//console.log(" URL: ", url);
				console.log("Get GenomeList Res: ", res);
				if(res && res.response && res.response.docs){
					var genomes = res.response.docs;
					if(genomes){
						_self._set("total_genomes", res.response.numFound);
						var genome_ids = genomes.map(function(o){
							return o.genome_id;
						});
						_self._set("genome_ids", genome_ids)
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

			if(!state.genome_ids){
				console.log("	NO Genome_IDS")
				if(state.search == oldVal.search){
					console.log("		Same Search")
					console.log("		OLD Genome_IDS: ", oldVal.genome_ids);
					this.set("state", lang.mixin({}, state, {genome_ids: oldVal.genome_ids}))
					return;
				}else{
					this.set("query", state.search);
				}
			}else if(state.search != oldVal.search){
				console.log("SET QUERY: ", state.search);
				this.set("query", state.search);
			}

			// //console.log("this.viewer: ", this.viewer.selectedChildWidget, " call set state: ", state);
			var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : "overview";
			if(active == "genomes"){
				this.setActivePanelState()
			}

			this.inherited(arguments);
		},

		onSetQuery: function(attr, oldVal, newVal){

			var content = QueryToEnglish(newVal);
			console.log("English Content: ", content);
			this.overview.set("content", '<div style="margin:4px;"><span class="queryModel">Genomes</span> ' + content /*decodeURIComponent(newVal)*/ + "</div>");
			// this.viewHeader.set("content", '<div style="margin:4px;">Genome List Query: ' + decodeURIComponent(newVal) + ' </div>')
			this.queryNode.innerHTML = '<i class="fa icon-anchor fa-1x" style="font-size:1.2em;color:#76A72D;vertical-align:top;"></i>&nbsp;<span class="queryModel">Genomes</span>  ' + content;
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
				case "genomes":
					activeTab.set("state", this.state);
					break;
				case "proteinFamilies":
					console.log("SET ACTIVE TAB: ", active, " State to: ", lang.mixin({}, this.state, {search: ""}));
					activeTab.set("state", lang.mixin({}, this.state, {search: ""}));
					break;
				case "transcriptomics":
					activeTab.set("state", lang.mixin({}, this.state, {search: "in(genome_ids,(" + (this.state.genome_ids || []).join(",") + "))"}))
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

		onSetGenomeIds: function(attr, oldVal, genome_ids){
			console.log("onSetGenomeIds: ", genome_ids, this.genome_ids, this.state.genome_ids);
			this.state.genome_ids = genome_ids;
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
			this.watch("genome_ids", lang.hitch(this, "onSetGenomeIds"));
			this.watch("total_genomes", lang.hitch(this, "onSetTotalGenomes"));

			this.overview = this.createOverviewPanel(this.state);
			this.totalCountNode = domConstruct.create("span", {innerHTML: "( loading... )"});
			this.queryNode = domConstruct.create("span", {});

			domConstruct.place(this.queryNode, this.viewHeader.containerNode, "last");
			domConstruct.place(this.totalCountNode, this.viewHeader.containerNode, "last");

			this.genomes = new GenomeGridContainer({
				title: "Genomes",
				id: this.viewer.id + "_" + "genomes",
				state: this.state,
				disable: false
			});
			this.sequences = new SequenceGridContainer({
				title: "Sequences",
				id: this.viewer.id + "_" + "sequences",
				state: this.state,
				disable: false
			});
			this.features = new FeatureGridContainer({
				title: "Features",
				id: this.viewer.id + "_" + "features",
				disabled: true
			});
			this.specialtyGenes = new SpecialtyGeneGridContainer({
				title: "Specialty Genes",
				id: this.viewer.id + "_" + "specialtyGenes",
				disabled: true,
				state: this.state
			});
			this.pathways = new PathwaysContainer({
				title: "Pathways",
				id: this.viewer.id + "_" + "pathways",
				disabled: true
			});
			this.proteinFamilies = new ProteinFamiliesContainer({
				title: "Protein Families",
				id: this.viewer.id + "_" + "proteinFamilies",
				disabled: true
			});
			this.transcriptomics = new TranscriptomicsContainer({
				title: "Transcriptomics",
				id: this.viewer.id + "_" + "transcriptomics",
				disabled: true,
				state: this.state
			});

			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.genomes);
			this.viewer.addChild(this.sequences);
			this.viewer.addChild(this.features);
			this.viewer.addChild(this.specialtyGenes);
			this.viewer.addChild(this.pathways);
			this.viewer.addChild(this.proteinFamilies);
			this.viewer.addChild(this.transcriptomics);

			// on(this.domNode, "SetAnchor", lang.hitch(this, function(evt){
			// 		evt.stopPropagation();
			// 		console.log(this.id, " Call onSetAnchor " , this);
			// 		this.onSetAnchor(evt);
			// }));
		},
		onSetTotalGenomes: function(attr, oldVal, newVal){
			console.log("ON SET TOTAL GENOMES: ", newVal);
			this.totalCountNode.innerHTML = " ( " + newVal + " Genomes ) ";
			var hasDisabled = false;

			this.viewer.getChildren().forEach(function(child){
				console.log("child.maxGenomeCount: ", child.maxGenomeCount, " NEW TOTAL COUNT: ", newVal);
				if(child.maxGenomeCount && (newVal > this.maxGenomesPerList)){
					console.log("\t\tDisable Child: ", child.id);
					hasDisabled = true;
					child.set("disabled", true);
				}else{
					child.set("disabled", false);
				}
			}, this);

			if(hasDisabled){
				this.showWarning();
			}else{
				this.hideWarning();
			}
		},
		hideWarning: function(){
			if(this.warningPanel){
				this.removeChild(this.warningPanel);
			}
		},

		showWarning: function(msg){
			if(!this.warningPanel){
				var c = this.warningContent.replace("{{maxGenomesPerList}}", this.maxGenomesPerList);
				this.warningPanel = new ContentPane({
					style: "margin:0px; padding: 0px;margin-top: -10px;",
					content: '<div class="WarningBanner" style="background: #f9ff85;text-align:center;margin:4px;margin-bottom: 0px;margin-top: 0px;padding:4px;border:0px solid #aaa;border-radius:4px;">' + c + "</div>",
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
			var q;
			if(this.query){
				q = (this.query.charAt(0) == "?") ? this.query.substr(1) : this.query;
				if(q != "keyword(*)"){
					parts.push(q)
				}
			}
			if(evt.filter && evt.filter != "false"){
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

			console.log("SetAnchor to: ", q, "Current View: ", this.state.hashParams);
			var hp;

			if(this.state.hashParams && this.state.hashParams.view_tab){
				hp = {view_tab: this.state.hashParams.view_tab}
			}else{
				hp = {}
			}

			hp.filter = "false";

			console.log("HP: ", JSON.stringify(hp));
			l = window.location.pathname + q + "#" + Object.keys(hp).map(function(key){
					return key + "=" + hp[key]
				}, this).join("&");
			console.log("NavigateTo: ", l);
			Topic.publish("/navigate", {href: l});
		}
	});
});
