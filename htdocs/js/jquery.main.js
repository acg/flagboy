;(function($) {


$(document).ready( function() {

  var game = new Game( $('#main') );
  game.load( './data/level2.txt', function() { game.play(); } );

} );


})(jQuery);
