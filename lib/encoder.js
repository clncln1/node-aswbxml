'use strict';

var codePageLoader = require('./codepage');

var SWITCH_PAGE_TOKEN = 0x00;
var END_TOKEN = 0x01;
var INLINE_STR_TOKEN = 0x03;
var INLINE_STR_END_TOKEN = 0x00;

function encode(data, codePage) {
	var currentCodePage = 0,
		parseResult = null,
		initialCodePageMapping = [
			{ prefix: '', page: 0 }
		];

	var rootElement = Object.keys(data);

	if (rootElement.length !== 1) {
		throw new Error('More than 1 root element defined? Seriously?');
	}

	rootElement = rootElement[0];

	if (typeof codePage === 'string') {
		codePage = codePageLoader(codePage);
	}

	parseResult = parseTag(data[rootElement],
		rootElement,
		codePage,
		initialCodePageMapping,
		0);
	
	return Buffer.concat([
		createMessageHeader(),
		parseResult.buffer
	]);
}

function parseTag(obj, tagName, codePage, codePageMapping, currentCodePage) {
	var tagMatch = tagName.match(/^(?:(.+)\:)?(.+)$/),
		tagPrefix = tagMatch[1] || '',
		tagSuffix = tagMatch[2],
		tagCode = null,
		tagCodePage = null,
		tagBuffer = new Buffer(0),
		proto = Object.prototype.toString.call(obj),
		hasAttributes = !!obj['$'],
		hasRealAttributes = null,
		hasContent = (proto === '[object Object]' && Object.keys(obj).length !== 0 && Object.keys(obj) !== ['$']) ||
					(proto === '[object String]');

	//update code page mapping
	if (hasAttributes) {
		hasRealAttributes = updateCodePageMapping(codePage, codePageMapping, obj['$']);
	}

	//find corresponding codepage
	for (var i = 0; i < codePageMapping.length; i++) {
		if (codePageMapping[i].prefix === tagPrefix) {
			tagCodePage = codePageMapping[i].page;
			break;
		}
	}

	if (tagCodePage === null) {
		throw new Error('Code page mapping for prefix ' + tagPrefix + ' not found');
	}

	//find tag code
	tagCode = codePage.findTag(tagCodePage, tagSuffix);

	if (tagCode === null) {
		throw new Error('Token for tag ' + tagSuffix + ' not found');
	}

	if (tagCodePage !== currentCodePage) {
		//switch code page
		tagBuffer = new Buffer([SWITCH_PAGE_TOKEN, tagCodePage]);
		currentCodePage = tagCodePage;
	}

	//create tag identifier
	tagBuffer = Buffer.concat([ tagBuffer, new Buffer([tagCode.token | (hasRealAttributes ? 128 : 0) | (hasContent? 64 : 0)]) ]);

	//TODO: add attributes

	//tag content
	if (hasContent) {
		if (proto === '[object String]') {
			tagBuffer = Buffer.concat([ tagBuffer, createInlineString(obj) ]);
		} else {
			//obj is an object
			Object.keys(obj).forEach(function(key) {
				if (key === '$') {
					return;
				}

				if (key === '_') {
					tagBuffer = Buffer.concat([ tagBuffer, createInlineString(obj[key]) ]);
					return;
				}

				obj[key].forEach(function(child) {
					var childResult = parseTag(child,
						key,
						codePage,
						codePageMapping,
						currentCodePage);

					tagBuffer = Buffer.concat([ tagBuffer, childResult.buffer ]);
					currentCodePage = childResult.codePage;
				});
			});
		}
	}

	return {
		buffer: Buffer.concat([ tagBuffer, new Buffer([END_TOKEN]) ]),
		codePage: currentCodePage
	};
}

function createMessageHeader() {
	var version = 0x03; //WBXML Version 1.3
	var publicId = 0x01; //No public identifier specified
	var charSet = 0x6a; //UTF-8
	var stringTable = 0x00; //string table - we dont need that for AS

	return new Buffer([version, publicId, charSet, stringTable]);
}

function createInlineString(str) {
	return Buffer.concat([
		new Buffer([INLINE_STR_TOKEN]),
		new Buffer(str),
		new Buffer([INLINE_STR_END_TOKEN])
	]);
}

function updateCodePageMapping(codePage, codePageMapping, attributes) {
	var hasRealAttributes = false;

	for (var key in attributes) {
		var match = key.match(/^xmlns(\:.+)?$/);

		if (match) {
			var matchPrefix = match[1] ? match[1].substr(1) : '',
				pageNumber = codePage.findPage(attributes[key]),
				prefixOverwrite = false;

			for (var i = 0; i < codePageMapping.length; i++) {
				if (codePageMapping[i].prefix === matchPrefix) {
					prefixOverwrite = true;
					codePageMapping[i].page = pageNumber;
					break;
				}
			}

			if (!prefixOverwrite) {
				codePageMapping.push({
					prefix: matchPrefix,
					page: pageNumber
				});
			}
		} else {
			hasRealAttributes = true;
		}
	}

	return hasRealAttributes;
}

module.exports = encode;