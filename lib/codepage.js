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

module.exports = loadCodePage;