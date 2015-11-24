# aswbxml - ActiveSync WBXML Encoder/Decoder

Simple WBXML encoder and decoder intended for ActiveSync messages.
Supported are tags, codepages, inline strings and opaque data.
Opaque data however, is only processed during decoding and will be added as base64 encoded CDATA content.

```
npm install aswbxml
```

## API (synchronous, will throw)

#### encode(data, codePage)


```data``` xml2js-style formatted object

```codePage``` code page name (string), e.g.: ```'ActiveSync'```

#### decode(buf, codePage)


```buf``` wbxml data (Buffer)

```codePage``` code page name (string), e.g.: ```'ActiveSync'```

## Usage (example with xml2json)

```javascript
var fs = require('fs'),
	xml2js = require('xml2js'),
	aswbxml = require('aswbxml');

var contents = fs.readFileSync('./myActiveSyncRequest.xml',
	{encoding: 'utf8'});

xml2js.parseString(contents, function(err, res) {
	// handle error
	var binaryRep = aswbxml.encode(res, 'ActiveSync');
});
```

## Custom code pages

Easy as pie.. just fork and add your own code pages in ```./lib/pages```