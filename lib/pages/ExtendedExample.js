'use strict';

module.exports = [
	{
		name: 'extendedexample',
		tags: [
			{ name: 'CARD', token: 0x05 },
			{ name: 'INPUT', token: 0x06 },
			{ name: 'XYZ', token: 0x07 },
			{ name: 'DO', token: 0x08 }
		],
		attributes: [
			{ name: 'STYLE', prefix: 'LIST', token: 0x05 },
			{ name: 'TYPE', token: 0x06 },
			{ name: 'TYPE', prefix: 'TEXT', token: 0x07 },
			{ name: 'URL', prefix: 'http://', token: 0x08 },
			{ name: 'NAME', token: 0x09 },
			{ name: 'KEY', token: 0x0A }
		],
		values: [
			{ name: '.org', token: 0x85 },
			{ name: 'ACCEPT', token: 0x86 }
		]
	}
]
