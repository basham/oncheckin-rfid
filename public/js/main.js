var socket = new io.Socket('localhost', { port: 3000 }); 
socket.connect()
.on('connect', function(){ feedback('Connected to server.') })
.on('message', function(obj) {
	if( 'action' in obj ) {
		switch( obj.action ) {
			case 'loadHash':
				loadHash(obj.data);
				break;
			case 'startScanning':
				feedback('Start scanning tags.');
				break;
			case 'assign': // Unassigned RFID is scanned
				openAssignModal(obj.data);
				break;
			case 'checkin': // Assigned RFID is scanned
				checkinHasher(obj.data);
				break;
			case 'autoHasher': // Autocomplete results from registration form
				autocompleteHasher(obj.data);
				break;
			case 'assignRegistered': // RFID assigned to hasher already in database
				var h = new Hasher( obj.data );
				feedback('Assigned tag to registered hasher, ' + h.hashname + '.');
				closeModal();
				break;
			case 'register': // RFID assigned to newly registered hasher
				var h = new Hasher( obj.data );
				feedback('Assigned tag to new hasher, ' + h.hashname + '.');
				closeModal();
				break;
			case 'signinRegistered': // Manually sign-in hasher already in database
				var h = new Hasher( obj.data );
				checkinHasher(h);
				//feedback('Signed-in hasher, ' + h.hashname + '.');
				//closeModal();
				break;
			case 'manualRegister': // Manually sign-in and register hasher
				var h = new Hasher( obj.data );
				checkinHasher(h);
				//feedback('Registered and signed-in new hasher, ' + h.hashname + '.');
				//closeModal();
				break;
		}
	}
})
.on('disconnect', function(){ feedback('Disconnected from server.') });

function loadHash(data) {
	hash = new Hash(data);
	loadCheckIn();
}

function checkinHasher(hasher) {
	closeModal();
	
	hasher = new Hasher(hasher);
	
	if( !hash.checkIn(hasher) )
		return;
	
	updateStats();
	
	loadHasher(hasher);
}

function loadHasher(hasher) {
	$('#console').prepend( listHasher(hasher) );
}

function listHasher(hasher) {
	var msg = '';
	msg += '<strong>' + hasher.hashname + '</strong>';
	msg += hasher.isAnniversary() ? '<p>You\'re celebrating your <mark>' + hasher.hashes + ' hash</mark>.</p>' : '<p>Today is your <mark>' + ( hasher.hashes == 1 ? 'virgin' : hasher.hashes ) + ' hash</mark>.</p>';
	msg += hasher.isReturner() ? '<p>You haven\'t come since <mark>' + hasher.lasthash + '</mark>.</p>' : '';
	msg += hasher.isNaming() ? '<p>Today is your <mark>naming</mark>.</p>' : '';
	return '<li>' + msg + '</li>';
}

function updateStats() {
	var nav = $('#down-downs ul').empty();
	var stats = hash.getStats();
	if( stats.anniversaries )
		nav.append('<li class="anniversaries"><span>' + stats.anniversaries + '</span> ' + pluralize(stats.anniversaries, 'Anniversary', 'Anniversaries') + '</li>');
	if( stats.lateCheckIns )
		nav.append('<li class="latecheckins"><span>' + stats.lateCheckIns + '</span> ' + pluralize(stats.lateCheckIns, 'Late Sign-in') + '</li>');
	if( stats.namings )
		nav.append('<li class="namings"><span>' + stats.namings + '</span> ' + pluralize(stats.namings, 'Naming') + '</li>');
	if( stats.returners )
		nav.append('<li class="returners"><span>' + stats.returners + '</span> ' + pluralize(stats.returners, 'Returner') + '</li>');
	if( stats.virgins )
		nav.append('<li class="virgins"><span>' + stats.virgins + '</span> ' + pluralize(stats.virgins, 'Virgin') + '</li>');

	// Add .social class to down-down <li> if ( value / attendees > .5 )

	
	$('#hash-title .value').text(stats.attendees);
	
	var open = $('#open-checkin').empty();
	
	for( var i = 0; i < hash.checkIns.length; i++ )
		open.append(
			$('<li><span class="value">' + hash.checkIns[i].checkedIn.length + '</span> at ' + hash.checkIns[i].label() + '</li>')
			.data('index', i)
			.addClass( hash.current == i ? 'selected' : '' ) );

	$('#open-checkin li').click(function() {
		$('#checkin-options').hide();
		hash.openCheckIn( $(this).data('index') );
		loadCheckIn();
	});
	
	$('#checkin-label .value').text(stats.checkedIn);
	$('#checkin-label .label').text(hash.currentCheckIn().label());
	
	var missing = hash.getMissing();

	if( missing.length && hash.isCheckInActive() ) {
		$('#missing').show();
		$('#missing .value').text(missing.length);
		var miss = $('#missing ul').empty();
		for( var i = 0; i < missing.length; i++ )
			miss.append( $('<li>' + missing[i].hashname + '</li>').data('hasher', missing[i]) );
	}
	else
		$('#missing').hide();

	$('#missing li').click(function() {
		checkinHasher( $(this).data('hasher') );
	});

	$('#down-downs li').click(function() {
		$(this).toggleClass('selected').siblings().removeClass('selected');
		$('#body section').hide();
		var c = $(this).clone().removeClass('selected').attr('class'); // Capture the relavant class
		if( $(this).hasClass('selected') ) {
			updateDownDowns();
			$('#' + c).show();
			$('#missing').hide();
		}
		else {
			$('#checkin').show();
			if( missing.length && hash.isCheckInActive() ) 
				$('#missing').show();
		}
	});
}

function updateDownDowns() {
	var n = hash.getNamings();
	var a = hash.getAnniversaries();
	var l = hash.getLateCheckIns();
	var r = hash.getReturners();
	var v = hash.getVirgins();
	var i = 0;
	
	$('#anniversaries ul, #namings ul, #latecheckins ul, #returners ul, #virgins ul').empty();

	for( i = 0; i < a.length; i++ )
		$('#anniversaries ul').prepend( '<li><mark>' + a[i].hashes + '</mark> &bull; ' + a[i].hashname + '</li>' );
		
	for( i = 0; i < n.length; i++ )
		$('#namings ul').prepend( listHasher(n[i]) );

	for( i = 0; i < l.length; i++ )
		$('#latecheckins ul').prepend( listHasher(l[i]) );

	for( i = 0; i < r.length; i++ )
		$('#returners ul').prepend( '<li><mark>' + r[i].lasthash + '</mark> &bull; ' + r[i].hashname + '</li>' );
		
	for( i = 0; i < v.length; i++ )
		$('#virgins ul').prepend( listHasher(v[i]) );
}

function loadCheckIn() {
	$('#console').empty();
	var h = hash.getCurrentCheckedInHashers();
	for( var i = 0; i < h.length; i++)
		loadHasher(h[i]);
	updateStats();
}

function pluralize(value, singular, plural) {
	plural = plural || singular + 's';
	return value == 1 ? singular : plural;
}

function autocompleteHasher(data) {
	$('.auto ul').empty();
	$.each(data, function(key, value) {
		var h = new Hasher(value);
		$('.auto ul').append('<li id="' + h.id + '"><span>' + h.hashname + '</span> ' + h.firstname + ' ' + h.lastname + '</li>');
	});
}

function serializeHasher() {
	return {
		firstname: $('#firstname').val(),
		lastname: $('#lastname').val(),
		hashname: $('#hashname').hasClass('default') ? '' : $('#hashname').val() };
}

function openAssignModal(rfid) {
	$('#rfid').text(rfid);
	$('#modal-title').text('Assign tag');
	if( $('#assign').is(':visible') ) // New tag was scanned when modal was already open
		feedback('Assigning new tag: ' + rfid);
	$('#overlay:hidden').show('fade', {}, 250);
	$('#assign:hidden').center().show('slide', { direction:'up' }, 250);
}

function openManualAssignModal() {
	$('#modal-title').text('Sign-in');
	$('#overlay:hidden').show('fade', {}, 250);
	$('#assign:hidden').center().show('slide', { direction:'up' }, 250);
}

function closeModal() {
	$('#overlay:visible').hide('fade', {}, 250);
	$('#assign:visible').hide('slide', { direction:'up' }, 250, function() {
		$('form input').val('').removeClass('disabled');
		$('.auto ul').empty();
	});
}

function defaultHashname() {
	return $('#firstname').val().length > 0 ? 'Just ' + $('#firstname').val() : ''
}

function compareSerializedHashers(a, b) {
	return a.firstname == b.firstname && a.lastname == b.lastname && a.hashname == b.hashname;
}

function autoAssign() {
	if( $('#assign').is(':hidden') ) // Only assign if the modal is active
		return;
	var rfid = $('#rfid').text();
	if( rfid == '' ) {
		autoSignin();
		return;
	}
	if( $('.auto .selected').length )
		socket.send({ action: 'assignRegistered', data: { id: $('.auto .selected').attr('id'), rfid: rfid } });
	else {
		var s = serializeHasher();
		if( s.firstname == '' || s.lastname == '' ) {
			feedback('The full mother-given name must be supplied.');
			return;
		}
		socket.send({ action: 'register', data: { hasher: s, rfid: rfid } });
	}
}

function autoSignin() {
	if( $('.auto .selected').length )
		socket.send({ action: 'signinRegistered', data: { id: $('.auto .selected').attr('id') } });
	else {
		var s = serializeHasher();
		if( s.firstname == '' || s.lastname == '' ) {
			feedback('The full mother-given name must be supplied.');
			return;
		}
		socket.send({ action: 'manualRegister', data: { hasher: s } });
	}
}

function feedback(msg) {
	$('#feedback p').html(msg);
	$('#feedback')
		.clearIdle()
		.center()
		.show('slide', { direction:'down' }, 250)
		.idle( ( msg.length * 40) + 1000 )
		.hide('slide', { direction:'down' }, 250);
}


$(document).ready(function() {

	$('#overlay, #assign, #feedback, #checkin-options, #body section:not(:first-child)').hide();
	
	updateStats();

	$(this).keyup(function(event) {
		console.log(event.keyCode);
		switch( event.keyCode ) {
			case 38: // Up arrow
				$('form input').blur().addClass('disabled');
				if( $('.auto .selected').length ) {
					$('.auto .selected').removeClass('selected').prev().addClass('selected');
					if( !$('.auto .selected').length ) {
						$('form input.focused').focus();
						$('form input').removeClass('disabled');
					}
				}
				else
					$('.auto li').last().addClass('selected');
				break;
			case 40: // Down arrow
				$('form input').blur().addClass('disabled');
				if( $('.auto .selected').length ) {
					$('.auto .selected').removeClass('selected').next().addClass('selected');
					if( !$('.auto .selected').length ) {
						$('form input.focused').focus();
						$('form input').removeClass('disabled');
					}
				}
				else
					$('.auto li').first().addClass('selected');
				break;
			case 13: // Return
				autoAssign();
				break;
			case 65: // A
				//	openAssignModal();
				break;
			case 27: // Escape
				//closeModal();
				break;
			case 112: // F1
				openManualAssignModal();
				break;
		}
	});

	$('form input')
	.focus(function() {
		$('form input').removeClass('focused disabled');
		$(this).addClass('focused');
		$('.auto .selected').removeClass('selected');
	})
	.keyup(function() {
		var serialized = serializeHasher();
		var old = $(this).data('serializedHasher') || {};
		if( compareSerializedHashers( old, serialized ) )
			return;
		$(this).data('serializedHasher', serialized);
		socket.send({ action: 'autoHasher', data: serialized, limit: 8 });
	});

	$('#btn').click(function() {
		message('Clearing');
		socket.send({ action: 'clear' });
	});

	$('#firstname').keyup(function() {
		if( !$('#hashname').hasClass('default') )
			return;
		$('#hashname').val( defaultHashname() );
	});

	$('#hashname').keyup(function() {
		if( $(this).val() == defaultHashname() )
			$(this).addClass('default');
		else
			$(this).removeClass('default');
	});

	$('#hashname').blur(function() {
		if( $(this).val().length == 0 )
			$(this).addClass('default').val( defaultHashname() );
	});
	
	$('.close').click(function() {
		closeModal();
		return false;
	});

	$('#checkin-label').click(function() {
		$('#checkin-options').toggle();
	});
	
	$('#new-checkin').click(function() {
		$('#checkin-options').hide();
		hash.newCheckIn('checkin');
		$('#console').empty();
		updateStats();
	});
	
	/*
	$('#new-checkin li').click(function() {
		hash.newCheckIn( $(this).attr('id') );
		$('#console').empty();
		updateStats();
	});
	*/
	
});


var latesthash = '4/16/11';

function Hasher(options) {
	options = options || {};
	this.id = options.id;
	this.firstname = options.firstname || '';
	this.lastname = options.lastname || '';
	this.hashname = options.hashname ? options.hashname : 'Just ' + this.firstname;
	this.hashes = parseInt(options.hashes) || 1;
	this.hares = parseInt(options.hares) || 0;
	this.lasthash = options.lasthash || latesthash;

	this.isAnniversary = function() {
		return ( this.hashes % 5 == 0 && this.hashes > 0 ) || this.hashes == 69;
	};
	this.isNaming = function() {
		return this.hashes > 5 && this.hashname == ('Just ' + this.firstname);
	};
	this.isReturner = function() {
		return new Date(this.lasthash) < new Date(latesthash);
	}
	this.isVirgin = function() {
		return this.hashes <= 1;
	}
}
/*
var hash = {
	title: 'Rehash of the Titans',
	attendees: [ 1, 2 ],
	checkins: [
		{
			type: 'signin', // signin|beercheck|onin|onafter
			checkedin: [ 1 ]
		}
	]
};
*/
var hash = new Hash();
//var hash;
function Hash(options) {
	options = options || {};
	this.title = options.title || 'Hash of Shame';
	this.attendees = options.attendees || [];
	this.hashers = toHashers(options.hashers); // Temporary storage of hasher data
	this.checkIns = toCheckIns(options.checkIns);
	this.current = options.current || 0;
	this.lateCheckIns = toHashers(options.lateCheckIns);
	
	this.save = function() {
		socket.send({ action: 'saveHash', data: this });
	};
	
	this.newCheckIn = function(type) {
		this.checkIns.push( new CheckIn({ type: type }) );
		this.openCheckIn(this.checkIns.length - 1);
		this.save();
	};
	
	this.loadCheckIns = function(checkIns) {
		var ci = [];
		
	//	this.checkIns
	};
	
	this.openCheckIn = function(index) {
		this.current = index;
		this.save();
	};
	
	this.checkIn = function(hasher) {
		if( this.currentCheckIn().checkIn(hasher) ) {
			this.save();
			for( var i = 0; i < this.attendees.length; i++ )
				if( this.attendees[i] == hasher.id ) // The hasher has checked in at least once at this hash
					return true;
			this.attendees.push( hasher.id ); // This is the hasher's first check in for this hash
			this.hashers.push( hasher );
			if( this.checkIns.length > 1 ) {
				feedback('You\'re signing in late, ' + hasher.hashname + '.');
				this.lateCheckIns.push( hasher );
			}
			//console.log("WHAT?");
			this.save();
			return true;
		}
		feedback('You\'re already checked in, ' + hasher.hashname + '.');
		return false;
	};
	
	this.currentCheckIn = function() {
		return this.checkIns[ this.current ];
		/*
		if( this.checkIns.length )
			return this.checkIns[ this.checkIns.length - 1 ];
		return null;
		*/
	};
	
	this.isCheckInActive = function() {
		return this.current == this.checkIns.length - 1;
	};
	
	this.getAttendees = function() {
		return this.attendees;
	};
	
	this.getCheckedIn = function() {
		return this.currentCheckIn().checkedIn;
	};
	
	this.getCurrentCheckedInHashers = function() {
		return this.currentCheckIn().hashers;
	};

	this.getMissing = function() {
		var a = [];
		
		if( this.checkIns.length <= 1 )
			return a;
		
		for( var i = 0; i < this.hashers.length; i++ )
			if( $.inArray( this.hashers[i].id, this.getCheckedIn() ) < 0 )
				a.push( this.hashers[i] );

		return a;
	};
	
	this.getAnniversaries = function() {
		var a = [];
		for( var i = 0; i < this.hashers.length; i++ )
			if( this.hashers[i].isAnniversary() )
				a.push( this.hashers[i] );
		a.sort(function(b, c) {
			if( b.hashes > c.hashes )
				return 1;
			if ( b.hashes == c.hashes )
				return 0;
			return -1;
		});
		return a;
	};

	this.getLateCheckIns = function() {
		return this.lateCheckIns;
	};
	
	this.getNamings = function() {
		var a = [];
		for( var i = 0; i < this.hashers.length; i++ )
			if( this.hashers[i].isNaming() )
				a.push( this.hashers[i] );
		return a;
	};

	this.getReturners = function() {
		var a = [];
		for( var i = 0; i < this.hashers.length; i++ )
			if( this.hashers[i].isReturner() )
				a.push( this.hashers[i] );
		a.sort(function(b, c) {
			bd = new Date(b.lasthash);
			cd = new Date(c.lasthash);
			if( bd > cd )
				return 1;
			if ( bd == cd )
				return 0;
			return -1;
		});
		return a;
	};
	
	this.getVirgins = function() {
		var a = [];
		for( var i = 0; i < this.hashers.length; i++ )
			if( this.hashers[i].isVirgin() )
				a.push( this.hashers[i] );
		return a;
	};
	
	this.getStats = function() {
		return {
			attendees: this.getAttendees().length,
			checkedIn: this.getCheckedIn().length,
			anniversaries: this.getAnniversaries().length,
			lateCheckIns: this.getLateCheckIns().length,
			namings: this.getNamings().length,
			returners: this.getReturners().length,
			virgins: this.getVirgins().length };
	};
}

function CheckIn(options) {
	options = options || {};
	this.type = options.type || 'signin';
	this.checkedIn = options.checkedIn || [];
	this.hashers = toHashers(options.hashers);
	
	this.checkIn = function(hasher) {
		if( this.isCheckedIn(hasher) )
			return false;
		this.checkedIn.push( hasher.id );
		this.hashers.push( hasher );
		return true;
	};
	
	this.isCheckedIn = function(hasher) {
		for( var i = 0; i < this.checkedIn.length; i++ )
			if( this.checkedIn[i] == hasher.id )
				return true;
		return false;
	};
	
	this.label = function() {
		switch( this.type ) {
			case 'signin':
				return 'Sign-in';
			case 'checkin':
				return 'Check-in';
			case 'beercheck':
				return 'Beer Check';
			case 'onin':
				return 'On In';
			case 'onafter':
				return 'On after';
		}
	};
}

function toHashers(data) {
	var a = [];
	data = data || [];
	//data = new Array(data);
	for( var i = 0; i < data.length; i++ )
		a.push( new Hasher(data[i]) );
	return a;
}

function toCheckIns(data) {
	var a = [];
	data = data || [];
	//data = new Array(data);
	for( var i = 0; i < data.length; i++ )
		a.push( new CheckIn(data[i]) );
	if( !a.length ) // Nothing to convert. Load default.
		a = [ new CheckIn() ];
	return a;
}