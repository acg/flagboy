;(function($) {


$(document).ready( function() {

  var game = new Game( $('#main') );

  game.load( './data/levels.txt', function() {
    game.load_level(0);
    game.play();
  } );

} );


})(jQuery);
