var socket = new io.Socket('localhost', { port: 3000 }); 
socket.connect();
socket.on('connect', function(){ message('Connected client-side') });
socket.on('message', function(obj) {
	if ( 'message' in obj )
		message(obj.message);
	/*
	if ( 'data' in obj ) {
		for (var d in obj.data)
			data( obj.data[d] );
	}
	*/
	if( 'action' in obj ) {
		switch( obj.action ) {
			case 'assign':
				openAssignModal(obj.data);
				break;
			case 'checkin':
				checkin(obj.data);
				break;
			case 'autoHasher':
				autocompleteHasher(obj.data);
				break;
			case 'assigned':
				feedback('Assigned tag to hasher.');
				break;
		}
	}
});
socket.on('disconnect', function(){ });

function message(msg) {
	//$('#console').prepend('<li><em>' + msg + '</em></li>');
}

function data(d) {
	$('#console').prepend('<li>' + d + '</li>');
}

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
		id: null,
		rfid: $('#rfid').text(),
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
	
	var h = serializeHasher();
	h.id = $('.auto .selected').length ? $('.auto .selected').attr('id') : null;
	socket.send({ action: 'assign', data: h })
	
	/*
	if( $('.auto .selected').length ) { // Assign tag to registered hasher
		socket.send({ action: 'assign'})
		console.log( $('.auto .selected').attr('id') );
	}
	else // Assign tag to unregistered hasher
		$('form').submit();
	*/
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

	$('#btn').click(function() {
		message('Clearing');
		socket.send({ action: 'clear' });
	});

	//$('#kennel').val('Blooming Fools');

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
				openAssignModal();
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

	// Assign tag to unregistered hasher
	$('form').submit(function() {
		//console.log( serializeHasher() );
		return false;
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
	this.rfid = obj.rfid || '';
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

/*
var upp = new Hasher({
	firstname: 'Chris',
	lastname: 'Basham',
	hashname: 'Untouched Private Panther',
	rfid: '3D002123221D',
	hashes: 15,
	hares: 1,
	lasthash: '20110219' });

var rob = new Hasher({
	firstname: 'Rob',
	lastname: 'Begley',
	hashname: '',
	rfid: '31007E195503',
	hashes: 9,
	hares: 0,
	lasthash: '20101211' });
	*/
/*
      function message(obj){
       var el = document.createElement('p');
       if ('announcement' in obj) el.innerHTML = '<em>' + esc(obj.announcement) + '</em>';
       else if ('message' in obj) el.innerHTML = '<b>' + esc(obj.message[0]) + ':</b> ' + esc(obj.message[1]);
       document.getElementById('chat').appendChild(el);
       document.getElementById('chat').scrollTop = 1000000;
     }
    
     function send(){
       var val = document.getElementById('text').value;
       socket.send(val);
       message({ message: ['you', val] });
       document.getElementById('text').value = '';
     }
    
     function esc(msg){
       return msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     };
    
     var socket = new io.Socket(null, {port: 8080, rememberTransport: false});
     socket.connect();
     socket.on('message', function(obj){
       if ('buffer' in obj){
         document.getElementById('form').style.display='block';
         document.getElementById('chat').innerHTML = '';
        
         for (var i in obj.buffer) message(obj.buffer[i]);
       } else message(obj);
     });
*/