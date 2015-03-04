define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Annotation.html","./AppBase",
	"dojo/_base/lang"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,AppBase,lang
){
	return declare([AppBase], {
		"baseClass": "Annotation",
		templateString: Template,
		applicationName: "GenomeAnnotation",
		required: true,

		constructor: function(){
			this._autoTaxSet=false;
			this._autoNameSet=false;
		},	

		onOutputPathChange: function(val){
			this.output_nameWidget.set("path", val);
		},
	
		onTaxIDChange: function(val){
			if (val && !this.scientific_nameWidget.get('value') || (this.scientific_nameWidget.get('value') && !this._autoTaxSet)  ){
				this._autoNameSet=true;
				var tax_id=this.tax_idWidget.get("item").taxon_id;
				//var sci_name=this.tax_idWidget.get("item").taxon_name;
				if(tax_id){
					var name_promise=this.scientific_nameWidget.store.get("?taxon_id="+tax_id);
					name_promise.then(lang.hitch(this, function(tax_obj) {
						if(tax_obj && tax_obj.length){
							this.scientific_nameWidget.set('item',tax_obj[0]);
						}
					}));
					//this.scientific_nameWidget.set('displayedValue',sci_name);
					//this.scientific_nameWidget.set('value',sci_name);
				}
				/*var abbrv=this.scientific_nameWidget.get('displayedValue');
				abbrv=abbrv.match(/[^\s]+$/);
				this.output_nameWidget.set('value',abbrv);*/
			}
			this._autoTaxSet=false;
		},
		onSuggestNameChange: function(val){
			if (val && !this.tax_idWidget.get('value') || (this.tax_idWidget.get('value') && !this._autoNameSet) ){
				this._autoTaxSet=true;
				var tax_id=this.scientific_nameWidget.get("value");
				if(tax_id){
					var tax_promise=this.tax_idWidget.store.get("?taxon_id="+tax_id);
					tax_promise.then(lang.hitch(this, function(tax_obj) {
						if(tax_obj && tax_obj.length){
							this.tax_idWidget.set('item',tax_obj[0]);
						}
					}));
					//this.tax_idWidget.set('displayedValue',tax_id);
					//this.tax_idWidget.set('value',tax_id);
				}
			}
			this._autoNameSet=false;
			/*if (val && !this.output_nameWidget.get('value') || (this.output_nameWidget.get('value')&&this._selfSet)  ){
				var abbrv=this.scientific_nameWidget.get('displayedValue');
				abbrv=abbrv.match(/[^\s]+$/);
				this.output_nameWidget.set('value',abbrv);
			}*/
		},
		getValues: function(){
			var values = this.inherited(arguments);
			values["scientific_name"]=this.scientific_nameWidget.get('displayedValue');
			values["tax_id"]=this.tax_idWidget.get('displayedValue');
			return values;
		}

	});
});

