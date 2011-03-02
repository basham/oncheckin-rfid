(function($){ 

jQuery.fn.center = function() {
	var o = $(this);
	o.css('left', ( $(window).width() - o.outerWidth() ) / 2);
	return o;
};

jQuery.fn.idle = function(time) {
	var o = $(this);
	o.queue(function() {
		o.data('timeoutId', setTimeout(function() {
			o.dequeue();
		}, time) );
	});
	return o;
};

jQuery.fn.clearIdle = function(time) {
	var o = $(this);
	clearTimeout( o.data('timeoutId') );
	o.dequeue();
	return o;
};

jQuery.fn.call = function(callback) {
	var o = $(this);
	callback(o);
	return o;
};

})(jQuery);