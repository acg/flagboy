;(function($) {


$(document).ready( function() {

  var game = new Game( $('#main') );

  game.load( './data/levels.txt', function() {

    var fragment = window.location.hash;
    var level = 1;

    if (fragment.charAt(0) == '#' && fragment.length > 1)
      level = parseInt(fragment.substr(1));
      
    game.load_level(level-1);
    game.play();

  } );

} );


})(jQuery);
