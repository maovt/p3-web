define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-construct",
	"dijit/layout/BorderContainer", "dijit/layout/StackContainer", "dijit/layout/TabController", "dijit/layout/ContentPane",
	"dijit/form/RadioButton", "dijit/form/Textarea", "dijit/form/TextBox", "dijit/form/Button",
	"dojox/widget/Standby",
	"./ActionBar", "./ContainerActionBar",
	"./ProteinFamiliesGridContainer", "./ProteinFamiliesFilterGrid", "./ProteinFamiliesHeatmapContainer",
	"./ProteinFamiliesMembersGridContainer"
], function(declare, lang, on, Topic, domConstruct,
			BorderContainer, TabContainer, StackController, ContentPane,
			RadioButton, TextArea, TextBox, Button,
			Standby,
			ActionBar, ContainerActionBar,
			MainGridContainer, FilterGrid, HeatmapContainer,
			MembersGridContainer){

	return declare([BorderContainer], {
		id: "PFContainer",
		gutters: false,
		state: null,
		pfState: null,
		loadingMask: null,
		maxGenomeCount: 10000,
		apiServer: window.App.dataServiceURL,
		constructor: function(){
			var self = this;

			Topic.subscribe("ProteinFamilies", lang.hitch(self, function(){
				// console.log("ProteinFamiliesHeatmapContainer:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "showMembersGrid":
						self.membersGridContainer.set("query", value);
						self.tabContainer.selectChild(self.membersGridContainer);
						break;
					case "updatePfState":
						self.pfState = value;
						break;
					case "showLoadingMask":
						self.loadingMask.show();
						break;
					case "hideLoadingMask":
						self.loadingMask.hide();
						break;
					default:
						break;
				}
			}));
		},
		postCreate: function(){
			// create a loading mask
			this.loadingMask = new Standby({target: this.id});
			this.addChild(this.loadingMask);
			this.loadingMask.startup();
		},
		onSetState: function(attr, oldVal, state){
			//console.log("ProteinFamiliesContainer set STATE.  genome_ids: ", state.genome_ids, " state: ", state);
			if(this.mainGridContainer){
				this.mainGridContainer.set('state', state);
			}
			this._set('state', state);
		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
			if(this.mainGridContainer){
				this.mainGridContainer.set('visible', true);
			}
			if(this.heatmapContainer){
				this.heatmapContainer.set('visible', true);
			}
			if(this.membersGridContainer){
				this.membersGridContainer.set('visible', true);
			}
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}

			var filterPanel = this._buildFilterPanel();

			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});

			var tabController = new StackController({
				containerId: this.id + "_TabContainer",
				region: "top",
				"class": "TextTabButtons"
			});

			this.mainGridContainer = new MainGridContainer({
				title: "Table",
				content: "Protein Families Table",
				state: this.state,
				apiServer: this.apiServer
			});

			this.heatmapContainer = new HeatmapContainer({
				title: "Heatmap",
				content: "Heatmap"
			});

			this.membersGridContainer = new MembersGridContainer({
				title: "", // hide tab
				content: "Protein Family Members",
				state: this.state
			});

			this.watch("state", lang.hitch(this, "onSetState"));

			this.tabContainer.addChild(this.mainGridContainer);
			this.tabContainer.addChild(this.heatmapContainer);
			this.tabContainer.addChild(this.membersGridContainer);
			this.addChild(tabController);
			this.addChild(this.tabContainer);
			this.addChild(filterPanel);

			this.inherited(arguments);
			this._firstView = true;
		},
		_buildFilterPanel: function(){

			var filterPanel = new ContentPane({
				region: "left",
				title: "filter",
				content: "Filter By",
				style: "width:380px; overflow:auto",
				splitter: true
			});

			var familyTypePanel = new ContentPane({
				region: "top"
			});
			// plfam
			var rb_plfam = new RadioButton({
				name: "familyType",
				value: "plfam"
			});
			rb_plfam.on("click", function(){
				Topic.publish("ProteinFamilies", "setFamilyType", "plfam")
			});
			var label_plfam = domConstruct.create("label", {innerHTML: " PATRIC genus-specific families (PLfams)<br/>"});
			domConstruct.place(rb_plfam.domNode, familyTypePanel.containerNode, "last");
			domConstruct.place(label_plfam, familyTypePanel.containerNode, "last");

			// pgfam
			var rb_pgfam = new RadioButton({
				name: "familyType",
				value: "pgfam"
			});
			rb_pgfam.on("click", function(){
				Topic.publish("ProteinFamilies", "setFamilyType", "pgfam")
			});
			var label_pgfam = domConstruct.create("label", {innerHTML: " PATRIC cross-genus families (PGfams)<br/>"});
			domConstruct.place(rb_pgfam.domNode, familyTypePanel.containerNode, "last");
			domConstruct.place(label_pgfam, familyTypePanel.containerNode, "last");

			// figfam
			var rb_figfam = new RadioButton({
				name: "familyType",
				value: "figfam",
				checked: true
			});
			rb_figfam.on("click", function(){
				Topic.publish("ProteinFamilies", "setFamilyType", "figfam")
			});
			var label_figfam = domConstruct.create("label", {innerHTML: " FIGFam"});
			domConstruct.place(rb_figfam.domNode, familyTypePanel.containerNode, "last");
			domConstruct.place(label_figfam, familyTypePanel.containerNode, "last");

			filterPanel.addChild(familyTypePanel);

			// genome list grid
			var filterGrid = new FilterGrid({
				state: this.state
			});
			filterPanel.addChild(filterGrid);

			//// other filter items
			var otherFilterPanel = new ContentPane({
				region: "bottom"
			});
			/*
			var ta_keyword = new TextArea({
				style: "width:215px; min-height:75px"
			});
			var label_keyword = domConstruct.create("label", {innerHTML: "Filter by one or more keywords"});
			domConstruct.place(label_keyword, otherFilterPanel.containerNode, "last");
			domConstruct.place(ta_keyword.domNode, otherFilterPanel.containerNode, "last");
			*/
			//
			domConstruct.place("<br>", otherFilterPanel.containerNode, "last");

			var rb_perfect_match = new RadioButton({
				name: "familyMatch",
				value: "perfect"
			});

			var label_rb_perfect_match = domConstruct.create("label", {innerHTML: " Perfect Families (One protein per genome)<br/>"});
			domConstruct.place(rb_perfect_match.domNode, otherFilterPanel.containerNode, "last");
			domConstruct.place(label_rb_perfect_match, otherFilterPanel.containerNode, "last");

			var rb_non_perfect_match = new RadioButton({
				name: "familyMatch",
				value: "non_perfect"
			});

			var label_rb_non_perfect_match = domConstruct.create("label", {innerHTML: " Non perfect Families<br/>"});
			domConstruct.place(rb_non_perfect_match.domNode, otherFilterPanel.containerNode, "last");
			domConstruct.place(label_rb_non_perfect_match, otherFilterPanel.containerNode, "last");

			var rb_all_match = new RadioButton({
				name: "familyMatch",
				value: "all_match",
				checked: true
			});

			var label_rb_all_match = domConstruct.create("label", {innerHTML: " All Families<br/>"});
			domConstruct.place(rb_all_match.domNode, otherFilterPanel.containerNode, "last");
			domConstruct.place(label_rb_all_match, otherFilterPanel.containerNode, "last");

			var label_num_protein_family = domConstruct.create("label", {innerHTML: "Number of Proteins per Family<br/>"});
			var tb_num_protein_family_min = new TextBox({
				name: "numProteinFamilyMin",
				value: "",
				style: "width: 40px"
			});
			var tb_num_protein_family_max = new TextBox({
				name: "numProteinFamilyMax",
				value: "",
				style: "width:40px"
			});
			domConstruct.place(label_num_protein_family, otherFilterPanel.containerNode, "last");
			domConstruct.place(tb_num_protein_family_min.domNode, otherFilterPanel.containerNode, "last");
			domConstruct.place("<span> to </span>", otherFilterPanel.containerNode, "last");
			domConstruct.place(tb_num_protein_family_max.domNode, otherFilterPanel.containerNode, "last");

			var label_num_genome_family = domConstruct.create("label", {innerHTML: "Number of Genomes per Family<br/>"});
			var tb_num_genome_family_min = new TextBox({
				name: "numGenomeFamilyMin",
				value: "",
				style: "width: 40px"
			});
			var tb_num_genome_family_max = new TextBox({
				name: "numGenomeFamilyMax",
				value: "",
				style: "width:40px"
			});
			domConstruct.place("<br>", otherFilterPanel.containerNode, "last");
			domConstruct.place(label_num_genome_family, otherFilterPanel.containerNode, "last");
			domConstruct.place(tb_num_genome_family_min.domNode, otherFilterPanel.containerNode, "last");
			domConstruct.place("<span> to </span>", otherFilterPanel.containerNode, "last");
			domConstruct.place(tb_num_genome_family_max.domNode, otherFilterPanel.containerNode, "last");

			domConstruct.place("<br>", otherFilterPanel.containerNode, "last");

			var defaultFilterValue = {
				min_member_count: null,
				max_member_count: null,
				min_genome_count: null,
				max_genome_count: null
			};

			var btn_submit = new Button({
				label: "Filter",
				onClick: lang.hitch(this, function(){

					var filter = {};

					if(rb_perfect_match.get('value')){
						filter.perfectFamMatch = 'Y';
					}else if(rb_non_perfect_match.get('value')){
						filter.perfectFamMatch = 'N';
					}else if(rb_all_match.get('value')){
						filter.perfectFamMatch = 'A';
					}

					var min_member_count = parseInt(tb_num_protein_family_min.get('value'));
					var max_member_count = parseInt(tb_num_protein_family_max.get('value'));
					var min_genome_count = parseInt(tb_num_genome_family_min.get('value'));
					var max_genome_count = parseInt(tb_num_genome_family_max.get('value'));

					!isNaN(min_member_count) ? filter.min_member_count = min_member_count : {};
					!isNaN(max_member_count) ? filter.max_member_count = max_member_count : {};

					!isNaN(min_genome_count) ? filter.min_genome_count = min_genome_count : {};
					!isNaN(max_genome_count) ? filter.max_genome_count = max_genome_count : {};

					this.pfState = lang.mixin(this.pfState, defaultFilterValue, filter);
					// console.log(this.pfState);
					Topic.publish("ProteinFamilies", "applyConditionFilter", this.pfState);
				})
			});
			domConstruct.place(btn_submit.domNode, otherFilterPanel.containerNode, "last");

			filterPanel.addChild(otherFilterPanel);

			return filterPanel;
		}
	});
});