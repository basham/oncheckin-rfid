var sys = require('sys');
var fs = require('fs');
var $ = require('jquery'); 
require('joose');
require('joosex-namespace-depended');
require('hash');

function RFID(serial) {
	
	this.serial = serial;
	this.serials = [];
	
	// Temporarily stores the RFID id as it reconstructs from the stream.
	this._id = '';
	
	this.ids = [];
	
	this._autoReconnectId;
	
	this.readAvailable = function(serials) { // Tests suggested streams and chooses first available one for read
		// stats.isCharacterDevice() == true
		serials = ( serials && serials.length ) ? serials : this.serials;
		sys.puts('Attempting read.');
		for( var i = 0; i < serials.length; i++ ) {
		    try {
		        var stats = fs.lstatSync(serials[i]);
				this.serials = serials;
				clearInterval( this._autoReconnectId );
		        sys.puts('Opening serial stream ' + serials[i]);
				this.read( serials[i] );
				return true;
		    }
		    catch(e) { }
		}
		sys.puts('Failed to read any valid serial stream. ' + serials.length + ' attempted.');
	};
	
	this.read = function(serial) {
		this.serial = serial;
		var o = this;
		// Simplifies restruction of stream if one bit comes at a time.
		fs.createReadStream(serial, { bufferSize: 1 })
		
		.on('open', function(fd) {
			sys.puts('Begin scanning RFID tags.');
			socket.broadcast({ action: 'startScanning' });
		})

		.on('end', function() {
			sys.puts('End of data stream.');
		})

		.on('close', function() {
			//fd.close();
			//this.read(this.serial);
			sys.puts('Closing stream.');
			o.autoReconnect();
		})

		.on('error', function(error) {
			//this.read(this.serial);
			sys.debug(error);
			o.autoReconnect();
		})
		
		.on('data', function(chunk) {
			o.reconstruct(chunk);
		});
	};
	
	this.autoReconnect = function() {
		var sec = 5;
		sys.puts('Attempting to reconnect to stream every ' + sec + ' seconds.');
		var o = this;
		this._autoReconnectId = setInterval(function() { o.readAvailable() }, sec * 1000);
	};
	
	this.reconstruct = function(chunk) {
		chunk = chunk.toString('ascii').match(/\w*/)[0]; // Only keep hex chars
		if ( chunk == '' ) { // Found non-hex char
			if ( this._id != '' ) { // The ID isn't blank
				//this.ids.push(db[this._id] ? db[this._id] : this._id);
				this.ids.push(this._id);
				this.send(this._id);
			}
			this._id = ''; // Prepare for the next ID read
			return;
		}
		this._id += chunk; // Concat hex chars to the forming ID
	};

	this.send = function(id) {
		sys.puts(id);
	};
}




var hash = {
	title: 'Rehash of the Titans',
	attendees: [ 1, 2 ],
	checkins: [
		{
			id: 1,
			type: 'signin', // signin|beercheck|onin|onafter
			checkedin: [ 1 ]
		}
	]
};




function getHasher(rfid) {
	for( var i = 0; i < hashers.length; i++ ) {
		if ( hashers[i].id == rfids[rfid] )
			return hashers[i];
	}
	return null;
}

function getHasherById(id) {
	for( var i = 0; i < hashers.length; i++ ) {
		if ( hashers[i].id == id )
			return hashers[i];
	}
	return null;
}


var rfids = {};

fs.readFile('data/rfids.json', function (err, data) {
	if (err) throw err;
	rfids = JSON.parse(data);
});


var hashers = {};

fs.readFile('data/roster.json', function (err, data) {
	if (err) throw err;
	hashers = JSON.parse(data);
});


var hashEvent = {};

fs.readFile('data/hash.json', function (err, data) {
	if (err) throw err;
	hashEvent = JSON.parse(data);
});


var rfid = new RFID();
rfid.readAvailable(['/dev/ttyUSB0', '/dev/cu.usbserial-A600exqM']);


rfid.send = function(id) {
	//sys.puts(this.find(id));
	var h = getHasher(id);
	if( !h ) {
		sys.puts('Assign tag: ' + id);
		socket.broadcast({ action: 'assign', data: id });
		return;
	}
	sys.puts('Checking in: ' + ( h.hashname ? h.hashname : 'Just ' + h.firstname ));
	socket.broadcast({ action: 'checkin', data: h });
}

rfid.sendAll = function() {
	var a = [];
	for ( var i = 0; i < rfid.ids.length; i++ ) {
		a.push( this.find( rfid.ids[i] ) );
	}
	socket.broadcast({ message: 'Sending ' + rfid.ids.length + ' pieces of data.', data: a });
}

rfid.find = function(id) {
	return rfids[id] ? rfids[id] : null;
}



function autocompleteHasher(data, limit) {
	var auto = [];
	if( data.firstname.length == 0 && data.lastname.length == 0 && data.hashname.length == 0 )
		return auto;
	for( var i = 0; i < hashers.length && auto.length < limit; i++ ) {
		var h = hashers[i];
		if ( h.firstname.match(new RegExp(data.firstname, 'gi'))
			&& h.lastname.match(new RegExp(data.lastname, 'gi'))
			&& h.hashname.match(new RegExp(data.hashname, 'gi')) )
			auto.push(h);
	}
	return auto;
}

function assignRegistered(id, rfid) {
	rfids[rfid] = id;
	saveRFIDs();
	return getHasherById( id );
}

function register(hasher, rfid) {
	var h = new Hasher( hasher );
	hashers.push( h );
	rfids[rfid] = h.id;
	saveRoster();
	saveRFIDs();
	return h;
}

function saveRoster() {
	fs.writeFile('data/roster.json', JSON.stringify(hashers), function (err) {
		if (err) throw err;
		sys.puts('Saved roster.');
	});
}

function saveRFIDs() {
	fs.writeFile('data/rfids.json', JSON.stringify(rfids), function (err) {
	  if (err) throw err;
	  sys.puts('Saved RFIDs.');
	});
}

function saveHash(data) {
	hashEvent = data;
	fs.writeFile('data/hash.json', JSON.stringify(data), function (err) {
	  if (err) throw err;
	  sys.puts('Saved Hash.');
	});
}


var express = require('express');
var app = express.createServer(); 

app.configure(function(){
    //app.use(express.methodOverride());
    //app.use(express.bodyDecoder());
    //app.use(app.router);
    app.use(express.staticProvider(__dirname + '/public'));
})

.get('/hello', function(req, res) {
	res.send('Hello world.');
})

.listen(3000, '127.0.0.1'); 


var io = require('socket.io'); 
var socket = io.listen(app);

socket.on('connection', function(client){ 
	
	//rfid.sendAll();
	socket.broadcast({ action: 'loadHash', data: hashEvent });
	
	client.on('message', function(message) {
		sys.puts( 'ACTION: ' + message.action );
		switch( message.action ) {
			case 'clear':
				//rfid.ids = [];
				//rfid.sendAll();
				break;
			case 'autoHasher':
				socket.broadcast({ action: 'autoHasher', data: autocompleteHasher(message.data, message.limit) });
				break;
			case 'assignRegistered':
				socket.broadcast({ action: 'assignRegistered', data: assignRegistered(message.data.id, message.data.rfid) });
				break;
			case 'register':
				socket.broadcast({ action: 'register', data: register(message.data.hasher, message.data.rfid) });
				break;
			case 'saveHash':
				saveHash(message.data);
				break;
		}
	})
	
	.on('disconnect', function() {});
});



function Hasher(obj) {
	this.firstname = obj.firstname || '';
	this.lastname = obj.lastname || '';
	this.hashname = obj.hashname || '';
	this.hashes = obj.hashes || 1;
	this.hares = obj.hares || 0;
	this.lasthash = obj.lasthash || '';
	this.id = obj.id || Hash.sha1((obj.lastname + obj.firstname).toLowerCase());
	
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

/*
(function() {
  var app, express, pub, socket;
  express = require('express');
  pub = __dirname + '/public';
  app = express.createServer(express.compiler({
    src: pub,
    enable: ['sass']
  }), express.staticProvider(pub), express.logger(), express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
  app.get('/', function(req, res) {
    return res.render('index.jade');
  });
  app.get('/lazeroids.js', function(req, res) {
    return res.sendfile('lazeroids.js');
  });
  app.listen(process.env.PORT || 8000);
  socket = require('socket.io').listen(app);
  socket.on('connection', function(client) {
    client.on('message', function(message) {
      return socket.broadcast(message);
    });
    return client.on('disconnect', function() {
      return client.broadcast(JSON.stringify([['disconnect', client.sessionId]]));
    });
  });
})();
*/
