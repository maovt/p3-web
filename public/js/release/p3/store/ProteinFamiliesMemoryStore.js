define("p3/store/ProteinFamiliesMemoryStore", [
	"dojo/_base/declare", "dojo/request",
	"dojo/store/Memory", "dojo/store/util/QueryResults",
	"dojo/when", "dojo/_base/lang", "dojo/Stateful", "dojo/_base/Deferred",
	"dojo/topic", "./HeatmapDataTypes"
], function(declare, request,
			Memory, QueryResults,
			when, lang, Stateful, Deferred,
			Topic){
	return declare([Memory, Stateful], {
		baseQuery: {},
		apiServer: window.App.dataServiceURL,
		idProperty: "family_id",
		state: null,
		pfState: null,

		constructor: function(options){
			this._loaded = false;
			if(options.apiServer){
				this.apiServer = options.apiServer;
			}

			var self = this;

			Topic.subscribe("ProteinFamilies", function(){
				//console.log("received:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "genomeIds":
						self.pfState = value;
						self.reload();
						break;
					case "familyType":
						self.pfState.familyType = value;
						self.reload();
						Topic.publish("ProteinFamiliesHeatmap", "refresh"); // call flash refresh individually now. we will move it later.
						break;
					case "genomeFilter":
						self.genomeFilter(value);
						Topic.publish("ProteinFamiliesHeatmap", "refresh");
						break;
					default:
						break;
				}
			});
		},
		genomeFilter: function(gfs){
			var self = this;
			if(self._filtered == undefined){ // first time
				self._filtered = true;
				self._original = this.query("", {});
			}
			var data = self._original;
			var newData = [];

			// var tsStart = window.performance.now();
			data.forEach(function(family){

				var skip = false;

				Object.keys(gfs).forEach(function(genomeId){
					var index = gfs[genomeId].getIndex();
					var status = gfs[genomeId].getStatus();
					//console.log(family.family_id, genomeId, index, status, family.genomes, parseInt(family.genomes.substr(index * 2, 2), 16));
					if(status == 1 && parseInt(family.genomes.substr(index * 2, 2), 16) > 0){
						skip = true;
					}
					else if(status == 0 && parseInt(family.genomes.substr(index * 2, 2), 16) == 0){
						skip = true;
					}
				});
				if(!skip){
					newData.push(family);
				}
			});
			// console.log("genomeFilter took " + (window.performance.now() - tsStart), " ms");

			self.setData(newData);
			self.set("refresh");
		},
		reload: function(){
			var self = this;
			delete self._loadingDeferred;
			self._loaded = false;
			self.loadData();
			self.set("refresh");
		},

		query: function(query, opts){
			query = query || {};
			//console.warn("query: ", query, opts);
			if(opts.sort == undefined){
				opts.sort = [{attribute: "family_id", descending: false}];
			}
			if(this._loaded){
				return this.inherited(arguments);
			}
			else{
				var _self = this;
				var results;
				var qr = QueryResults(when(this.loadData(), function(){
					results = _self.query(query, opts);
					qr.total = when(results, function(results){
						return results.total || results.length
					});
					return results;
				}));

				return qr;
			}
		},

		get: function(id, opts){
			if(this._loaded){
				return this.inherited(arguments);
			}else{
				var _self = this;
				return when(this.loadData(), function(){
					return _self.get(id, options)
				})
			}
		},

		loadData: function(){
			if(this._loadingDeferred){
				return this._loadingDeferred;
			}

			if(!this.pfState || this.pfState.genomeIds.length < 1){
				// console.log("No Genome IDS, use empty data set for initial store");

				//this is done as a deferred instead of returning an empty array
				//in order to make it happen on the next tick.  Otherwise it
				//in the query() function above, the callback happens before qr exists
				var def = new Deferred();
				setTimeout(lang.hitch(this, function(){
					this.setData([]);
					this._loaded = true;
					def.resolve(true);
				}), 0);
				return def.promise;

			}

			var familyType = this.pfState.familyType;
			var familyId = familyType + '_id';

			var query = {
				q: "genome_id:(" + this.pfState.genomeIds.join(' OR ') + ")",
				fq: "annotation:PATRIC AND feature_type:CDS AND " + familyId + ":[* TO *]",
				//fq: "figfam_id:(FIG01956050)",
				rows: 0,
				facet: true,
				'json.facet': '{stat:{type:field,field:' + familyId + ',limit:-1,facet:{aa_length_min:"min(aa_length)",aa_length_max:"max(aa_length)",aa_length_mean:"avg(aa_length)",ss:"sumsq(aa_length)",sum:"sum(aa_length)"}}}'
			};
			var q = Object.keys(query).map(function(p){
				return p + "=" + query[p]
			}).join("&");

			var _self = this;

			this._loadingDeferred = when(request.post(this.apiServer + '/genome_feature/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/solr+json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				},
				data: q
			}), function(response){
				//console.warn(response);
				if(response.facets.count == 0){
					// data is not available
					_self.setData([]);
					_self._loaded = true;
					return true;
				}
				var familyStat = response.facets.stat.buckets;

				var familyIdList = [];
				familyStat.forEach(function(element){
					if(element.val != ""){
						familyIdList.push(element.val);
					}
				});

				// sub query - genome distribution
				query = q + '&json.facet={stat:{type:field,field:genome_id,limit:-1,facet:{families:{type:field,field:' + familyId + ',limit:-1,sort:{index:asc}}}}}';

				// console.log("Do Second Request to /genome_feature/");
				return when(request.post(_self.apiServer + '/genome_feature/', {
					handleAs: 'json',
					headers: {
						'Accept': "application/solr+json",
						'Content-Type': "application/solrquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
					},
					data: query
				}), function(response){

					return when(request.post(_self.apiServer + '/protein_family_ref/', {
						handleAs: 'json',
						headers: {
							'Accept': "application/solr+json",
							'Content-Type': "application/solrquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
						},
						data: {
							q: 'family_type:' + familyType + ' AND family_id:(' + familyIdList.join(' OR ') + ')',
							rows: 1000000
						}
					}), function(res){
						var genomeFamilyDist = response.facets.stat.buckets;
						var familyGenomeCount = {};
						var familyGenomeIdCountMap = {};
						var familyGenomeIdSet = {};
						var genomePosMap = {};
						var genome_ids = _self.pfState.genomeIds;
						genome_ids.forEach(function(genomeId, idx){
							genomePosMap[genomeId] = idx;
						});

						window.performance.mark('mark_start_stat1');
						genomeFamilyDist.forEach(function(genome){
							var genomeId = genome.val;
							var genomePos = genomePosMap[genomeId];
							var familyBuckets = genome.families.buckets;

							familyBuckets.forEach(function(bucket){
								var familyId = bucket.val;
								if(familyId != ""){
									var genomeCount = bucket.count.toString(16);
									if(genomeCount.length < 2) genomeCount = '0' + genomeCount;

									if(familyId in familyGenomeIdCountMap){
										familyGenomeIdCountMap[familyId][genomePos] = genomeCount;
									}
									else{
										var genomeIdCount = new Array(genome_ids.length).fill('00');
										genomeIdCount[genomePos] = genomeCount;
										familyGenomeIdCountMap[familyId] = genomeIdCount;
									}

									if(familyId in familyGenomeIdSet){
										familyGenomeIdSet[familyId].push(genomeId);
									}
									else{
										var genomeIds = new Array(genome_ids.length);
										genomeIds.push(genomeId);
										familyGenomeIdSet[familyId] = genomeIds;
									}
								}
							});
						});

						window.performance.mark('mark_end_stat1');
						window.performance.measure('measure_protein_family_stat1', 'mark_start_stat1', 'mark_end_stat1');

						window.performance.mark('mark_start_stat2');
						Object.keys(familyGenomeIdCountMap).forEach(function(familyId){
							var hashSet = {};
							familyGenomeIdSet[familyId].forEach(function(value){
								hashSet[value] = true;
							});
							familyGenomeCount[familyId] = Object.keys(hashSet).length;
						});

						window.performance.mark('mark_end_stat2');
						window.performance.measure('measure_protein_family_stat2', 'mark_start_stat2', 'mark_end_stat2');

						window.performance.mark('mark_start_stat3');

						var familyRefHash = {};
						res.response.docs.forEach(function(el){
							if(!(el.family_id in familyRefHash)){
								familyRefHash[el.family_id] = el.family_product;
							}
						});
						window.performance.mark('mark_end_stat3');
						window.performance.measure('measure_protein_family_stat3', 'mark_start_stat3', 'mark_end_stat3');

						window.performance.mark('mark_start_stat4');
						//var data = new Array(Object.keys(familyRefHash).length);
						var data = [];
						familyStat.forEach(function(element){
							var familyId = element.val;
							if(familyId != ""){
								var featureCount = element.count;
								var std = 0;
								if(featureCount > 1){
									var sumSq = element.ss || 0;
									var sum = element.sum || 0;
									var realSq = sumSq - (sum * sum) / featureCount;
									std = Math.sqrt(realSq / (featureCount - 1));
								}

								var row = {
									family_id: familyId,
									feature_count: featureCount,
									genome_count: familyGenomeCount[familyId],
									aa_length_std: std,
									aa_length_max: element.aa_length_max,
									aa_length_mean: element.aa_length_mean,
									aa_length_min: element.aa_length_min,
									description: familyRefHash[familyId],
									genomes: familyGenomeIdCountMap[familyId].join("")
								};
								data.push(row);
							}
						});
						window.performance.mark('mark_end_stat4');
						window.performance.measure('measure_protein_family_stat4', 'mark_start_stat4', 'mark_end_stat4');
						// console.log(data);

						window.performance.measure('measure_total', 'mark_start_stat1', 'mark_end_stat4');

						// var measures = window.performance.getEntriesByType('measure');
						// for(var i = 0, len = measures.length; i < len; ++i){
						// 	console.log(measures[i].name + ' took ' + measures[i].duration + ' ms');
						// }
						_self.setData(data);
						_self._loaded = true;
						return true;
					}, function(err){
						console.error("Error in ProteinFamiliesStore: ", err)
					});
				});
			});
			return this._loadingDeferred;
		},

		getHeatmapData: function(pfState){

			var rows = [];
			var cols = [];
			var maxIntensity = 0; // global and will be modified inside createColumn function
			var keeps = []; // global and will be referenced inside createColumn function
			var colorStop = [];

			var isTransposed = (pfState.heatmapAxis === 'Transposed');
			var start = window.performance.now();

			// assumes axises are corrected
			var familyOrder = pfState.clusterColumnOrder;
			var genomeOrder = pfState.clusterRowOrder;

			var createColumn = function(order, colId, label, distribution, meta){
				var filtered = [], isEven = (order % 2) === 0;

				keeps.forEach(function(idx, i){ // idx is a start position of distribution. 2 * gfs.getIndex();
					filtered[i] = distribution.substr(idx, 2);
					var val = parseInt(filtered[i], 16);

					if(maxIntensity < val){
						maxIntensity = val;
					}
				});

				return new Column(order, colId, label, filtered.join(''),
					((isEven) ? 0x000066 : null) /* label color */,
					((isEven) ? 0xF4F4F4 : 0xd6e4f4) /*bg color */,
					meta);
			};

			// rows - genomes
			// if genome order is changed, then needs to or-organize distribution in columns.
			var genomeOrderChangeMap = [];
			var distributionTransformer = function(dist, map){
				var newDist = [];
				map.forEach(function(pos, idx){
					newDist[idx] = dist.substr(pos * 2, 2);
				});
				return newDist.join('');
			};

			if(genomeOrder !== [] && genomeOrder.length > 0){
				pfState.genomeIds = genomeOrder;
				genomeOrder.forEach(function(genomeId, idx){
					// console.log(genomeId, pfState.genomeFilterStatus[genomeId], idx);
					genomeOrderChangeMap.push(pfState.genomeFilterStatus[genomeId].getIndex()); // keep the original position
					pfState.genomeFilterStatus[genomeId].setIndex(idx);
				});
			}

			pfState.genomeIds.forEach(function(genomeId, idx){
				var gfs = pfState.genomeFilterStatus[genomeId];
				if(gfs.getStatus() != '1'){
					keeps.push(2 * gfs.getIndex());
					var labelColor = ((idx % 2) == 0) ? 0x000066 : null;
					var rowColor = ((idx % 2) == 0) ? 0xF4F4F4 : 0xd6e4f4;

					//console.log("row: ", gfs.getIndex(), genomeId, gfs.getGenomeName(), labelColor, rowColor);
					rows.push(new Row(gfs.getIndex(), genomeId, gfs.getGenomeName(), labelColor, rowColor));
				}
			});

			// cols - families
			//console.warn(this);
			var data = this.query("", {});

			var familyOrderMap = {};
			if(familyOrder !== [] && familyOrder.length > 0){
				familyOrder.forEach(function(familyId, idx){
					familyOrderMap[familyId] = idx;
				});
			}else{
				data.forEach(function(family, idx){
					familyOrderMap[family.family_id] = idx;
				})
			}

			data.forEach(function(family){
				var meta = {
					'instances': family.feature_count,
					'members': family.genome_count,
					'min': family.aa_length_min,
					'max': family.aa_length_max
				};
				if(genomeOrderChangeMap.length > 0){
					family.genomes = distributionTransformer(family.genomes, genomeOrderChangeMap);
				}
				var order = familyOrderMap[family.family_id];
				cols[order] = createColumn(order, family.family_id, family.description, family.genomes, meta);
			});

			// colorStop
			if(maxIntensity == 1){
				colorStop = [new ColorStop(1, 0xfadb4e)];
			}else if(maxIntensity == 2){
				colorStop = [new ColorStop(0.5, 0xfadb4e), new ColorStop(1, 0xf6b437)];
			}else if(maxIntensity >= 3){
				colorStop = [new ColorStop(1 / maxIntensity, 0xfadb4e), new ColorStop(2 / maxIntensity, 0xf6b437), new ColorStop(3 / maxIntensity, 0xff6633), new ColorStop(maxIntensity / maxIntensity, 0xff6633)];
			}

			//console.log(rows, cols, colorStop);

			var currentData = {
				'rows': rows,
				'columns': cols,
				'colorStops': colorStop,
				'rowLabel': 'Genomes',
				'colLabel': 'Protein Families',
				'rowTrunc': 'mid',
				'colTrunc': 'end',
				'offset': 1,
				'digits': 2,
				'countLabel': 'Members',
				'negativeBit': false,
				'cellLabelField': '',
				'cellLabelsOverrideCount': false,
				'beforeCellLabel': '',
				'afterCellLabel': ''
			};

			if(isTransposed){

				var flippedDistribution = []; // new Array(currentData.rows.length);
				currentData.rows.forEach(function(row, rowIdx){
					var distribution = [];
					currentData.columns.forEach(function(col){
						distribution.push(col.distribution.substr(rowIdx * 2, 2));
					});
					flippedDistribution[rowIdx] = distribution.join("");
				});

				// create new rows
				var newRows = [];
				currentData.columns.forEach(function(col, colID){
					newRows.push(new Row(colID, col.colID, col.colLabel, col.labelColor, col.bgColor, col.meta));
				});
				// create new columns
				var newColumns = [];
				currentData.rows.forEach(function(row, rowID){
					newColumns.push(new Column(rowID, row.rowID, row.rowLabel, flippedDistribution[rowID], row.labelColor, row.bgColor, row.meta))
				});

				currentData = lang.mixin(currentData, {
					'rows': newRows,
					'columns': newColumns,
					'rowLabel': 'Protein Families',
					'colLabel': 'Genomes',
					'rowTrunc': 'end',
					'colTrunc': 'mid'
				});
			}

			// var end = window.performance.now();
			// console.log('getHeatmapData() took: ', (end - start), "ms");

			return currentData;
		},

		getSyntenyOrder: function(genomeId){

			var _self = this;
			var familyIdName = this.pfState.familyType + '_id';

			return when(request.post(_self.apiServer + '/genome_feature/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/solr+json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
				},
				data: {
					q: 'genome_id:' + genomeId + ' AND annotation:PATRIC AND feature_type:CDS AND ' + familyIdName + ':[* TO *]',
					fl: familyIdName,
					sort: 'accession asc,start asc',
					rows: 1000000
				}
			}), function(res){

				var familyIdSet = {};
				var idx = 0;
				// var order = [];

				// var start = window.performance.now();

				res.response.docs.forEach(function(doc){
					var fId = doc[familyIdName];

					if(!familyIdSet.hasOwnProperty(fId)){
						familyIdSet[fId] = idx;
						// order.push({groupId: fId, syntonyAt: idx});
						idx++;
					}
				});

				// order.sort(function(a, b){
				// 	if(a.groupId > b.groupId) return 1;
				// 	if(a.groupId < b.groupId) return -1;
				// 	return 0;
				// });

				// var end = window.performance.now();
				// console.log('performance: ', (end - start));
				// console.log(order);

				// return order; // original implementation
				return familyIdSet;
			});
		}
	});
});