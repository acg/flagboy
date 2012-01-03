;(function($) {


$(document).ready( function() {

  var game = new Game( $('#main') );
  game.load( './data/level1.txt' );
  game.play();

} );


})(jQuery);
