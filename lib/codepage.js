'use strict';

var path = require('path');

function loadCodePage(name) {
	var codePage;

	try {
		codePage = require(path.join(__dirname, 'pages', name));
	} catch(e) {
		throw new Error('Code page ' + name + ' not found');
	}

	return {
		findPage: findPage,
		findTag: findTag,
		findAttributes : findAttributes,
		findValue : findValue,
		findMinIndexValue: findMinIndexValue,
		get codePage() {
			return codePage;
		}
	};
}

function findPage(pageName) {
	if (pageName[pageName.length - 1] === ':') {
		pageName = pageName.substr(0, pageName.length - 1);
	}

	for (var i = 0; i < this.codePage.length; i++) {
		if (this.codePage[i].name === pageName) {
			return i;
		}
	}

	return null;
}

function findTag(pageNumber, searchFor) {
	var lookupAttr = typeof searchFor === 'string' ? 'name' : 'token';

	for (var i = 0; i < this.codePage[pageNumber].tags.length; i++) {
		if (this.codePage[pageNumber].tags[i][lookupAttr] === searchFor) {
			return this.codePage[pageNumber].tags[i];
		}
	}

	return null;
}

function findAttributes(pageNumber, searchFor) {
	var attributes = []
	var lookupAttr = typeof searchFor === 'string' ? 'name' : 'token';

	for (var i = 0; i < this.codePage[pageNumber].attributes.length; i++) {
		if (this.codePage[pageNumber].attributes[i][lookupAttr] === searchFor) {
			attributes.push( this.codePage[pageNumber].attributes[i])
		}
	}
	if (attributes.length===0) return null
	else return attributes
}

function findValue(pageNumber, searchFor) {
	var lookupAttr = typeof searchFor === 'string' ? 'name' : 'token';
	for (var i = 0; i < this.codePage[pageNumber].values.length; i++) {
		if (this.codePage[pageNumber].values[i][lookupAttr] === searchFor) {
			return this.codePage[pageNumber].values[i]
		}
	}

	return null
}
/**
* Scans the list of values getting the minimun index of the searchFor element
*/
function findMinIndexValue(pageNumber, searchFor) {
	var lookupAttr = typeof searchFor === 'string' ? 'name' : 'token';
	var minIndexValue = null
	for (var i = 0; i < this.codePage[pageNumber].values.length; i++) {
		let index = searchFor.indexOf(this.codePage[pageNumber].values[i][lookupAttr])
		if ( index >= 0 &&
			(!minIndexValue || (index < minIndexValue.index))){
			minIndexValue = {index: index, value: this.codePage[pageNumber].values[i] }
		}
	}

	return minIndexValue
}
module.exports = loadCodePage;
