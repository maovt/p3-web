define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/_base/lang",
	"dojo/dom-class", "dojo/dom-construct", "./JobsGrid",
	"dojo/_base/Deferred", "dojo/dom-geometry", "../JobManager",
	"dojo/topic", "dijit/layout/BorderContainer", "./ActionBar", "./ItemDetailPanel"
], function(declare, WidgetBase, on, lang,
			domClass, domConstr, JobsGrid,
			Deferred, domGeometry, JobManager,
			Topic, BorderContainer, ActionBar, ItemDetailPanel){
	return declare([BorderContainer], {
		"disabled": false,
		path: "/",

		listJobs: function(){
			return Deferred.when(JobManager.getJobs(), function(res){
				return res;
			}, function(err){
				console.log("Error Getting Jobs:", err);
				_self.showError(err);
			})
		},
		postCreate: function(){
			this.inherited(arguments);
			domClass.add(this.domNode, "JobManager");
		},

		showError: function(err){
			var n = domConstr.create("div", {
				style: {
					position: "relative",
					zIndex: 999,
					padding: "10px",
					margin: "auto",
					"margin-top": "300px",
					width: "30%",
					border: "2px solid #aaa",
					"border-radius": "4px",
					"text-align": "center",
					color: "red",
					"font-size": "1.2em"
				},
				innerHTML: err
			}, this.domNode);

		},
//		queryOptions: {
//			sort: [{attribute: "submit_time", descending: false}]
//		},

		render: function(items){
			items.sort(function(a, b){
				return (Date.parse(a.submit_time) < Date.parse(b.submit_time)) ? 1 : -1;
			});
			this.grid.refresh();
			this.grid.renderArray(items);
		},
		containerActions: [],

		selectionActions: [
			[
				"ToggleItemDetail",
				"fa fa-info-circle fa-2x", {
				label: "DETAIL",
				persistent: true,
				validTypes: ["*"],
				tooltip: "Toggle Selection Detail"
			},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					var children = this.getChildren();
					// console.log("Children: ", children);
					if(children.some(function(child){
							return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
						}, this)){
						// console.log("Remove Item Detail Panel");
						this.removeChild(this.itemDetailPanel);
					}
					else{
						// console.log("Re-add child: ", this.itemDetailPanel);
						this.addChild(this.itemDetailPanel);
					}
				},
				true
			], [
				"ViewFeatureItem",
				"MultiButton fa icon-eye2 fa-2x",
				{
					label: "VIEW",
					validTypes: ["*"],
					multiple: false,
					tooltip: "View Job Results",
					validContainerTypes: ["*"]
				},
				function(selection){
					var sel = selection[0];
					console.log("SEL: ", sel)
					Topic.publish("/navigate", {href: "/workspace" + sel.parameters.output_path + "/" + sel.parameters.output_file});
				},
				false
			]
		],

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);

			var _self = this;

			this.grid = new JobsGrid({region: "center"});
			this.actionBar = new ActionBar({
				splitter: false,
				region: "right",
				layoutPriority: 2,
				style: "width:48px;text-align:center;"
			});
			this.itemDetailPanel = new ItemDetailPanel({
				region: "right",
				layoutPriority: 1,
				splitter: true,
				style: "width:250px;"
			});

			this.setupActions();

			this.grid.on('select', lang.hitch(this, function(evt){
				var sel = Object.keys(evt.selected).map(lang.hitch(this, function(rownum){
					console.log("rownum: ", rownum);
					console.log("Row: ", evt.grid.row(rownum).data);
					var d = evt.grid.row(rownum).data;

					d._formatterType = d.status + "_job";
					return d;
				}));
				console.log("selection: ", sel);

				this.actionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel)
			}))

			this.addChild(this.grid)
			this.addChild(this.actionBar)
			this.addChild(this.itemDetailPanel)

			// this.listJobs().then(function(jobs) {
			// 	_self.render(jobs);
			// })

			// Topic.subscribe("/Jobs", function(msg){
			// 	console.log("REFRESH JOBS ARRAY");
			// 	_self.listJobs().then(function(jobs) {
			// 		_self.render(jobs);
			// 	})
			// });
		},

		setupActions: function(){
			if(this.containerActionBar){
				this.containerActions.forEach(function(a){
					this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
				}, this);
			}

			this.selectionActions.forEach(function(a){
				this.actionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
			}, this);

		}

	});
});
