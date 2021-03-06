define([
	"dojo/_base/declare",
	"dijit/layout/ContentPane",
	"./Base", "../TranscriptomicsGeneContainer"
], function(declare,
			ContentPane,
			ViewerBase, TranscriptomicsGeneContainer){
	return declare([ViewerBase], {
		"disabled": false,
		"query": null,
		containerType: "transcriptomics_experiment",
		apiServiceUrl: window.App.dataAPI,

		onSetState: function(attr, oldVal, state){
			// console.warn("TE onSetState", state);

			if(!state){
				return;
			}

			this.viewer.set('visible', true);
		},

		buildHeaderContent: function(feature){
			// TODO: implement
		},

		postCreate: function(){
			if(!this.state){
				this.state = {};
			}

			this.inherited(arguments);

			this.viewer = new TranscriptomicsGeneContainer({
				region: "center",
				state: this.state
			});

			this.viewerHeader = new ContentPane({
				content: "",
				region: "top"
			});

			this.addChild(this.viewerHeader);
			this.addChild(this.viewer);
		}
	});
});
