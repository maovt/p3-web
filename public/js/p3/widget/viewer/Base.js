define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on","dojo/topic",
	"dojo/dom-class", "dojo/dom-construct", "dojo/_base/lang"
], function(declare, BorderContainer, on,Topic,
			domClass, domConstruct, lang
) {
	return declare([BorderContainer], {
		"baseClass": "ViewerApp",
		state: null,
		paramsMap: null,
		apiServiceUrl: window.App.dataAPI,
	
		// _setStateAttr: function(state) {
		// 	console.log("State: ", state);			
		// 	this.params = params;
		// 	if (!this._started){ return; }
		// 	this._set("params", params);
			
		// 	// if (this.paramsMap && typeof this.paramsMap=="string"){
		// 	// 	console.log(this.id, " Set Params: ", params, " mapped to ", this.paramsMap, " Widget: ", this)
		// 	// 	this.set(this.paramsMap, params);
		// 	// }
		// },
	
		refresh: function() {},
		
		postCreate: function() {
			this.inherited(arguments);
			on(this.domNode, "UpdateHash", lang.hitch(this, "onUpdateHash"));

			on(this.domNode, "SetAnchor", lang.hitch(this, "onSetAnchor"));

			//start watching for changes of state, and signal for the first time.
			this.watch("state", lang.hitch(this, "onSetState"));
		},

		onSetState: function(attr, oldVal, newVal){},

		onSetAnchor: function(evt){

		},

		_setStateAttr: function(state){
			// console.log("Base _setStateAttr: ", state);
			this._set("state", state);
		},

		onUpdateHash: function(evt){
			// console.log("OnUpdateHash: ", evt);
			if (!this.state){
				this.state = {}
			}
	
			if (!this.state.hashParams){
				this.state.hashParams={};
			}

			this.state.hashParams[evt.hashProperty]=evt.value;
			l= window.location.pathname + window.location.search + "#" + Object.keys(this.state.hashParams).map(function(key){
				if (key && this.state.hashParams[key]){
					return key + "=" + this.state.hashParams[key]
				}
				return "";
			},this).filter(function(x){ return !!x; }).join("&");
			// console.log("onUpdateHash. nav to: ", l);
            Topic.publish("/navigate", {href: l});
		},

		startup: function() {
			if(this._started){ return; }
			this.inherited(arguments);
			this.onSetState("state","",this.state);
		}
	});
});