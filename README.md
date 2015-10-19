# aswbxml - ActiveSync WBXML Encoder/Decoder
==============================
Simple WBXML encoder and decoder intended for ActiveSync messages.
Please note that the full WBXML spec is not implemented.

```
npm install aswbxml
```

## API (synchronous, will throw)

### encode(data, codePage)

#### ```data``` xml2json-style formatted object
#### ```codePage``` code page name (string), e.g.: ```'ActiveSync'```

### decode(buf, codePage)

#### ```buf``` wbxml data (Buffer)
#### ```codePage``` code page name (string), e.g.: ```'ActiveSync'```

## Usage (example with xml2json)

```javascript
var fs = require('fs'),
	xml2json = require('xml2json'),
	aswbxml = require('aswbxml');

xml2js.parseString(fs.readFileSync('./myActiveSyncRequest.xml', {encoding: 'utf8'}), function(err, res) {
	// handle error
	var binaryRep = aswbxml.encode(res, 'ActiveSync');
});
```

## Custom code pages

Easy as pie.. just fork and add your own code pages in ```./lib/pages```