var socket = new io.Socket('localhost', { port: 3000 }); 
socket.connect()
.on('connect', function(){ feedback('Connected to server.') })
.on('message', function(obj) {
	if( 'action' in obj ) {
		switch( obj.action ) {
			case 'assign': // Unassigned RFID is scanned
				openAssignModal(obj.data);
				break;
			case 'checkin': // Assigned RFID is scanned
				checkin(obj.data);
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
		}
	}
})
.on('disconnect', function(){ feedback('Disconnected from server.') });

function checkin(hasher) {
	closeModal();
	
	hasher = new Hasher(hasher);
	var msg = '';
	msg += '<strong>' + hasher.hashname + '</strong>';
	msg += hasher.isAnniversary() ? '<p>You\'re celebrating your <mark>' + hasher.hashes + ' hash</mark>.</p>' : '<p>Today is your <mark>' + hasher.hashes + ' hash</mark>.</p>';
	msg += hasher.isReturner() ? '<p>You haven\'t come since <mark>' + hasher.lasthash + '</mark>.</p>' : '';
	msg += hasher.isNaming() ? '<p>Today is your <mark>naming</mark>.</p>' : '';
	$('#console').prepend('<li>' + msg + '</li>');
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
	if( $('#assign').is(':visible') ) // New tag was scanned when modal was already open
		feedback('Assigning new tag: ' + rfid);
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
	var rfid = $('#rfid').text();
	if( $('.auto .selected').length )
		socket.send({ action: 'assignRegistered', data: { id: $('.auto .selected').attr('id'), rfid: rfid } });
	else
		socket.send({ action: 'register', data: { hasher: serializeHasher(), rfid: rfid } });
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

	$('#overlay, #assign, #feedback').hide();

	$(this).keyup(function(event) {
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
				closeModal();
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

});

var latesthash = '20110219';

function Hasher(obj) {
	this.id = obj.id;
	this.firstname = obj.firstname || '';
	this.lastname = obj.lastname || '';
	this.hashname = obj.hashname ? obj.hashname : 'Just ' + this.firstname;
	this.hashes = parseInt(obj.hashes) || 0;
	this.hares = parseInt(obj.hares) || 0;
	this.lasthash = obj.lasthash || latesthash;

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
