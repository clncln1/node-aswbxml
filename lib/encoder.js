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
	    	//Previous array comparison was not working
		hasContent = (proto === '[object Object]' && Object.keys(obj).length !== 0 && Object.keys(obj).toString() !== "$") ||
				(proto === '[object String]' && obj.length>0);

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

	//create tag identifier
	tagBuffer = Buffer.concat([ new Buffer([tagCode.token | (hasRealAttributes ? 128 : 0) | (hasContent? 64 : 0)]) ]);

	if (tagCodePage !== currentCodePage) {
		//switch code page
		tagBuffer = Buffer.concat([tagBuffer, new Buffer([SWITCH_PAGE_TOKEN, tagCodePage])])
		currentCodePage = tagCodePage;
	}
	
	//add attributes: According to the pdfs, attributes should be encoded before content, thats why I didnt use the tag content loop
	if(hasRealAttributes){
		Object.keys(obj).forEach(function(key) {
			if (key === '$') {
				tagBuffer = Buffer.concat([ tagBuffer, parseAttributes(codePage, tagCodePage, obj[key]) ]);
			}
		})
	}

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
	//Only add END_TOKEN if it has content
	let returnBuffer
	if(hasContent){
		returnBuffer= Buffer.concat([ tagBuffer, new Buffer([END_TOKEN]) ])
	} else {
		returnBuffer = Buffer.concat([tagBuffer])
	}
	return {
		buffer: returnBuffer,
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
/**
* Parses the attributes looking in the pages attribute entry.
* More than 1 attribute can exist depending on the prefix, by default we grab the empty prefix attribute but we seek in case the prefix matches
*/
function parseAttributes(codePage, tagCodePage, obj){
	var attributesBuffer = new Buffer('')
	Object.keys(obj).forEach(function(key) {
		var tagsAttribute = codePage.findAttributes(tagCodePage, key);
		if (tagsAttribute){
			var selectedAttribute = tagsAttribute.filter((elem) => { return typeof elem.prefix === 'undefined'})[0]
			for (var i = 0; i < tagsAttribute.length; i++) {
				if (tagsAttribute[i].prefix && obj[key].startsWith(tagsAttribute[i].prefix)){
					selectedAttribute = tagsAttribute[i]
					break;
				}
			}
			attributesBuffer = Buffer.concat([ attributesBuffer, new Buffer([selectedAttribute.token]) ])
			attributesBuffer = Buffer.concat([ attributesBuffer, parseAttributeValue(codePage, tagCodePage, selectedAttribute, obj) ])
		}
	})
	// return attributesBuffer with end of attribute list
	return Buffer.concat([attributesBuffer, new Buffer([END_TOKEN])  ])
}
/**
* Incase there's a prefix, we remove it from the tag's value before parsing it
*/
function parseAttributeValue(codePage, tagCodePage, tagAttribute, obj){
	let valueBuf =  parseValue(new Buffer(0), codePage, tagCodePage, obj[tagAttribute.name].replace(tagAttribute.prefix, ''))
	return valueBuf
}

/**
* Recursive function to parse the attributes value searching coded values in the values entry of the codePage.
* In the advanced example: http://abc.org/s would be encoded as: 
* 	http:// ->part of the prefix, so we remove it on the parseAttributeValue function
*	abc 	-> encoded as an inlinestring
*	.org	-> encoded as a defined value 0x85
*	/s	-> encoded as an inlinestring
*/
function parseValue(valueBuffer, codePage, tagCodePage, realValue){
	if(!realValue) return new Buffer(0)
	else {
		var minIndexValue = codePage.findMinIndexValue(tagCodePage, realValue)
		if (!minIndexValue){
			return createInlineString(realValue)
		}
		else {
			let buf1, buf2
			if(minIndexValue.index>0){
				buf1 = createInlineString(realValue.substr(0,minIndexValue.index))
				buf2 = parseValue(valueBuffer, codePage, tagCodePage, realValue.substr(minIndexValue.index, realValue.length))
			} else {
				buf1 = new Buffer([minIndexValue.value.token])
				buf2 = parseValue(valueBuffer, codePage, tagCodePage, realValue.replace(minIndexValue.value.name, ''))
			}
			valueBuffer = Buffer.concat([valueBuffer, buf1, buf2])
			return valueBuffer
		}
	}
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
