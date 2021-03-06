define("d3/test/transition/transition-test-filter", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
var assert = require("../assert"),
    _ = require("../../");

var datum = {};

module.exports = {
  topic: function(d3) {
    return d3.select("body").html("").selectAll("div")
        .data([0, 1])
      .enter().append("div")
      .selectAll("span")
        .data(function(d) { d <<= 1; return [d, d + 1]; })
      .enter().append("span")
        .classed("foo", function(d, i) { return d & 1; })
      .transition()
        .delay(100)
        .duration(150)
        .ease("bounce");
  },

  "preserves matching elements": function(span) {
    var some = span.filter(function(d, i) { return i === 0; });
    assert.isTrue(some[0][0] === span[0][0]);
    assert.isTrue(some[1][0] === span[1][0]);
  },
  "removes non-matching elements": function(span) {
    var some = _.merge(span.filter(function(d, i) { return d & 1; }));
    assert.equal(some.indexOf(span[0][0]), -1);
    assert.equal(some.indexOf(span[1][0]), -1);
  },
  "preserves data": function(span) {
    var some = span.filter(function(d, i) { return d & 1; });
    assert.equal(some[0][0].__data__, 1);
    assert.equal(some[1][0].__data__, 3);
  },
  "preserves grouping": function(span) {
    var some = span.filter(function(d, i) { return d & 1; });
    assert.equal(some.length, 2);
    assert.equal(some[0].length, 1);
    assert.equal(some[1].length, 1);
  },
  "preserves parent node": function(span) {
    var some = span.filter(function(d, i) { return d & 1; });
    assert.isTrue(some[0].parentNode === span[0].parentNode);
    assert.isTrue(some[1].parentNode === span[1].parentNode);
  },
  "does not preserve index": function(span) {
    var indexes = [];
    span.filter(function(d, i) { return d & 1; }).each(function(d, i) { indexes.push(i); });
    assert.deepEqual(indexes, [0, 0]);
  },
  "ignores null nodes": function(span) {
    var node = span[0][1];
    span[0][1] = null;
    var some = span.filter(function(d, i) { return d & 1; });
    assert.isTrue(some[0][0] === span[0][3]);
    assert.equal(some.length, 2);
    span[0][1] = node;
  },
  "can be specified as a selector": function(span) {
    var some = span.filter(".foo");
    assert.equal(some.length, 2);
    assert.equal(some[0].length, 1);
    assert.equal(some[1].length, 1);
  },
  "returns a new selection": function(span) {
    assert.isFalse(span.filter(function() { return 1; }) === span);
  },
  "works on empty selections": function(span) {
    var none = function() { return false; },
        empty = span.filter(none);
    assert.isTrue(empty.empty());
    assert.isTrue(empty.filter(none).empty());
  },
  "inherits the transition id and, by extension, all transition parameters": function(t1) {
    var t2 = t1.filter(function() { return 1; });
    assert.equal(t2.id, t1.id);
    assert.strictEqual(t2[0][0].__transition__[t2.id], t1[0][0].__transition__[t1.id]);
  }
};
});
