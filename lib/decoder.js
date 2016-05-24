'use strict';

var codePageLoader = require('./codepage');

function decode_mb_u_int32(buf, pos) {
	const out = { val: 0, len: 0 };

	let b;
	do {
		out.len += 1;
		b = buf[pos + out.len - 1];
		out.val <<= 7;
		out.val += b & 127;
	} while (b & 128);

	return out;
}

function decode(buf, codePage) {
	if (typeof codePage === 'string') {
		codePage = codePageLoader(codePage);
	}

	var parseResult = parseTag(buf, 4, codePage, 0),
		obj = {};

	obj[parseResult.tagName] = parseResult.tag;

	return obj;
}

function parseTag(buf, pos, codePage, currentCodePage) {
	var tag = {},
		tagName = null;

	while (pos < buf.length) {
		var oct = buf[pos];

		if (oct === 0) {
			//code page switch
			currentCodePage = buf[++pos];
		} else if (oct === 1) {
			break;
		} else if (oct === 3) {
			//inline string
			var strEndIdx = buf.indexOf(0, pos);

			if (strEndIdx === -1) {
				throw new Error('Invalid format. Could not find end of inline string');
			}

			tag['_'] = buf.toString('utf8', pos + 1, strEndIdx);

			pos = strEndIdx;
		} else if (oct === 195) {
			//opaque data
			var parsedMultiByte = decode_mb_u_int32(buf, ++pos);
			var dataLength = parsedMultiByte.val;
			// Jump over the multi-byte integer's bytes
			pos += parsedMultiByte.len;

			if (dataLength > 0) {
				tag['_'] = '<![CDATA[' + buf.toString('base64', pos, pos + dataLength) + ']]>';
			}

			pos += dataLength - 1;
		} else {
			if (tagName === null) {
				var tagInfo = codePage.findTag(currentCodePage, (oct & 63)),
					tagHasAttributes = !!(oct >> 7),
					tagHasContent = !!(oct >> 6);

				tagName = tagInfo.name;

				// TODO: handle attributes

				if (!tagHasContent) {
					break;
				}
			} else {
				var childTag = parseTag(buf, pos, codePage, currentCodePage);

				currentCodePage = childTag.currentCodePage;
				pos = childTag.pos;

				if (tag.hasOwnProperty(childTag.tagName)) {
					tag[childTag.tagName].push(childTag.tag);
				} else {
					tag[childTag.tagName] = [ childTag.tag ];
				}
			}
		}

		pos++;
	}

	var tagKeys = Object.keys(tag);

	if (tagKeys.length === 0) {
		tag = '';
	} else if (tagKeys.length === 1 && tagKeys[0] === '_') {
		tag = tag['_'];
	}

	return {
		tag: tag,
		tagName: tagName,
		pos: pos,
		currentCodePage: currentCodePage
	};
}

module.exports = decode;
