define([
	"dojo/_base/declare",
	"./P3JsonRest"
], function(declare,
			Store){
	return declare([Store], {
		dataModel: "sp_gene",
		idProperty: "feature_id",
		facetFields: []
	});
});

