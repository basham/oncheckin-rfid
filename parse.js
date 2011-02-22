var sys = require('sys');
var fs = require('fs');
var csv = require('ya-csv');
var $ = require('jquery'); 
require('joose');
require('joosex-namespace-depended');
require('hash');

var n = 0;
var a = 0;
var hashers = [];

var reader = csv.createCsvFileReader('data/roster-20110211.csv');
reader.setColumnNames([ 'initials','name','hashname','address','phone','hashes','lasthash','hares' ]);

reader
.on('data', function(data) {
	if ( data.name && data.name.length > 0 && data.name.match(/.*,.*/) ) {
		var name = data.name.match(/(.*),(.*)/);
		data.lastname = $.trim(name[1]);
		data.firstname = $.trim(name[2]);
		data.id = Hash.sha1((data.lastname + data.firstname).toLowerCase());
		hashers.push( new Hasher(data) );
	}
})
.on('end', function() {

	for( var i = 0; i < hashers.length; i++ ) {
		if( hashers[i].isAnniversary() ) {
			a++;
			//sys.puts(i + ' | ' + hashers[i].hashes + ' ' + hashers[i].name() + ' | ' + hashers[i].rfid);
			sys.puts( JSON.stringify(hashers[i]) );
		}
		if( hashers[i].isNaming() )
			n++;
	}

fs.writeFile('data/roster.json', JSON.stringify(hashers), function (err) {
  if (err) throw err;
  sys.puts('Saved roster.');
});

	sys.puts('TOTAL: ' + hashers.length);
	sys.puts('ANNIVERSARIES: ' + a);
	sys.puts('NAMINGS: ' + n);
	//sys.puts(JSON.stringify(rfids));
	saveRFIDs();
});

/*
fs.readFile('/etc/passwd', function (err, data) {
  if (err) throw err;
  console.log(data);
});
*/
/*
var rfids = {
	'55a7d7166c840b6cd05cf03e055462b90cba7015': '31007E05450F', // UPP
	'462e1fb4612b0115ed993a089c34892931495919': '31007E195503', // (.)
	'a22b05c7d1c8d25cdbceae3b18a0be77a911d481': '3D002123221D', // Just Rob
	'5388b3b24f6c5646e9221b0555961f70ceb43069': '3D002133321D' // White Lightning
};
*/
var rfids = {
	'31007E05450F': '55a7d7166c840b6cd05cf03e055462b90cba7015', // UPP
	'31007E195503': '462e1fb4612b0115ed993a089c34892931495919', // (.)
	'3D002123221D': 'a22b05c7d1c8d25cdbceae3b18a0be77a911d481', // Just Rob
	'3D002133321D': '5388b3b24f6c5646e9221b0555961f70ceb43069' // White Lightning
};

function saveRFIDs() {
	fs.writeFile('data/rfids.json', JSON.stringify(rfids), function (err) {
	  if (err) throw err;
	  sys.puts('Saved RFIDs.');
	});
}

function Hasher(obj) {
	this.id = obj.id;
	this.firstname = obj.firstname || '';
	this.lastname = obj.lastname || '';
	this.hashname = obj.hashname || '';
	this.rfid = obj.rfid || '';
	this.hashes = obj.hashes || 0;
	this.hares = obj.hares || 0;
	this.lasthash = obj.lasthash || '';

	this.name = function() {
		return this.hashname ? this.hashname : 'Just ' + this.firstname;
	};
	this.isAnniversary = function() {
		return ( this.hashes % 5 == 0 && this.hashes > 0 ) || this.hashes == 69;
	};
	this.isNaming = function() {
		return this.hashes > 0 && this.hashname.length == 0;
	};
	this.isReturner = function() {
		return this.lasthash < latesthash;
	}
	this.isVirgin = function() {
		return this.hashes == 0;
	}
}