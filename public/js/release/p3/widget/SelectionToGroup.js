require({cache:{
'url:p3/widget/templates/SelectionToGroup.html':"<div class=\"SelectionToGroup\" style=\"width:400px;\">\n\t<div data-dojo-type=\"dijit/form/Select\" style=\"width: 95%;margin:10px;\" data-dojo-attach-event=\"onChange:onChangeTarget\" data-dojo-attach-point=\"targetType\">\n\t\t<option value=\"new\">New Group</option>\n\t\t<option value=\"existing\" selected=\"true\">Existing Group</option>\n\t</div>\n\n\t<div data-dojo-attach-point=\"groupNameBox\" data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" style=\"width:95%;margin:10px;\" class='dijitHidden', data-dojo-props=\"promptMessage:'Enter New Group Name'\" data-dojo-attach-event=\"onChange:onChangeTarget\" >\n\t</div>\n\n\t<div data-dojo-attach-point=\"workspaceObjectSelector\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" style=\"width:95%;margin:10px;\" data-dojo-props=\"type:['genome_group']\" data-dojo-attach-event=\"onChange:onChangeTarget\" class=''>\n\t</div>\n\n\n\n\t<div class=\"buttonContainer\" style=\"text-align: right;\">\n\t\t<div data-dojo-type=\"dijit/form/Button\" label=\"Cancel\" data-dojo-attach-event=\"onClick:onCancel\"></div>\n<!--\t\t<div data-dojo-type=\"dijit/form/Button\" label=\"Split\" disabled='true'></div> -->\n\t\t<div data-dojo-type=\"dijit/form/Button\" disabled='true' label=\"Copy\" data-dojo-attach-point=\"copyButton\" data-dojo-attach-event=\"onClick:onCopy\"></div>\n\t</div>\n</div>\n"}});
define("p3/widget/SelectionToGroup", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/SelectionToGroup.html", "dojo/_base/lang", "../WorkspaceManager"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, lang, WorkspaceManager){
	return declare([WidgetBase, Templated, WidgetsInTemplate], {
		"baseClass": "Panel",
		"disabled": false,
		templateString: Template,
		selection: null,
		path: null,
		type: "genome_group",
		_setTypeAttr: function(t){
			this.type = t;
			if(this.workspaceObjectSelector){
				this.workspaceObjectSelector.set("type", [t]);
			}
		},

		_setPathAttr: function(path){
			this.path = path;
			if(this.groupNameBox){
				this.groupNameBox.set('path', this.path);
			}

			if(this.workspaceObjectSelector){
				this.workspaceObjectSelector.set("path", this.path);
			}
		},
		onChangeTarget: function(target){
			console.log("onChangeTarget ");
			if(!this._started){
				return;
			}
			var targetType = this.targetType.get('value');
			var val;
			console.log("Target Type: ", targetType);
			if(targetType == "existing"){
				domClass.remove(this.workspaceObjectSelector.domNode, "dijitHidden");
				domClass.add(this.groupNameBox.domNode, "dijitHidden");
				val = this.workspaceObjectSelector.get('value');

			}else{
				domClass.add(this.workspaceObjectSelector.domNode, "dijitHidden");
				domClass.remove(this.groupNameBox.domNode, "dijitHidden");

				val = this.groupNameBox.isValid() ? this.groupNameBox.get('value') : false;
			}
			console.log("Target Val: ", val);
			this.value = val;
			if(val){
				this.copyButton.set('disabled', false);
			}else{
				this.copyButton.set('disabled', true);
			}
		},
		startup: function(){
			var _self = this;
			if(this._started){
				return;
			}
			var currentIcon;
			this.watch("selection", lang.hitch(this, function(prop, oldVal, item){
				console.log("set selection(): ", arguments);
			}));
			if(!this.path){
				this.set("path", WorkspaceManager.getDefaultFolder(this.type));
			}
			this.inherited(arguments);
			this.groupNameBox.set('path', this.path);
			this.workspaceObjectSelector.set('path', this.path);
			this.workspaceObjectSelector.set('type', [this.type]);
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action: "close", bubbles: true});
		},
		onCopy: function(evt){
			console.log("Copy Selection: ", this.selection, " to ", this.value);
			var idType = (this.type == "genome_group") ? "genome_id" : "feature_id"
			var def;
			if(this.targetType.get("value") == "existing"){
				def = WorkspaceManager.addToGroup(this.value, idType, this.selection.map(function(o){
					return o[idType];
				}));
			}else{
				def = WorkspaceManager.createGroup(this.value, this.type, this.path, idType, this.selection.map(function(o){
					return o[idType];
				}));
			}
			def.then(lang.hitch(this, function(){
				on.emit(this.domNode, "dialogAction", {action: "close", bubbles: true});
			}));
		}

	});
});
