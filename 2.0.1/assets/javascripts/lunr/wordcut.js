(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.lunr || (g.lunr = {})).wordcut = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var _ = require("underscore");

var Acceptors = {
  creators: null,
  current: null,
  tag: null,

  init: function() {
    this.creators = [];
    this.current = [];
    this.tag = {};
  },

  reset: function() {
    this.current = [];
    this.tag = {}
  },

  transit: function(ch) {
    var self = this;

    self.creators.forEach(function(creator) {
      var acceptor = creator.createAcceptor(self.tag);
      if (acceptor) 
        self.current.push(acceptor);
    });
    
    var _current = [];
    self.tag = {};

    for (var i = 0; i < self.current.length; i++) {
      var _acceptor = self.current[i]
        , acceptor = _acceptor.transit(ch);
      
      if (!acceptor.isError) {
        _current.push(acceptor);
        self.tag[acceptor.tag] = acceptor;
      }
    }
    self.current = _current;

  },

  getFinalAcceptors: function() {    
    return this.current.filter(function(acceptor) {
      return acceptor.isFinal;
    });
  }
};

module.exports = function() {
  var acceptors = _.clone(Acceptors);
  acceptors.init();
  return acceptors;
};

},{"underscore":25}],2:[function(require,module,exports){
(function (__dirname){

var LEFT = 0;
var RIGHT = 1;
var path = require("path");
var glob = require("glob");

var WordcutDict = {


  init: function (dictPathFile, withDefault, words) {
    withDefault = withDefault || false
    defaultDict = path.normalize(__dirname + "/..") + "/data/tdict-*.txt";
    this.dict=[]
    var dictPathIsDefined = dictPathFile !== undefined
    var dictPath = (withDefault || !dictPathIsDefined) ? [defaultDict]: [];
    var dictPathFile = dictPathFile || defaultDict

    if(dictPathIsDefined){
      if (Array.isArray(dictPathFile)) {
        dictPath.concat.apply(dictPath, dictPathFile);
      } else {
        dictPath.push(dictPathFile)
      }
    }

    this.addFiles(dictPath, false)

    if(words!==undefined){
      this.addWords(words, false)
    }
    this.finalizeDict();
  },

  addWords: function(words, finalize){
    finalize = finalize===undefined || finalize;
    this.dict.push.apply(this.dict, words)
    if(finalize){
      this.finalizeDict();
    }
  },

  finalizeDict: function(){
    this.dict = this.sortuniq(this.dict);
  },

  addFiles: function(files, finalize){
    finalize = finalize===undefined || finalize;
    
    for (var i = 0; i < 1; i++) {