
function Game( $elem )
{
  return {

    TILE_CX: 64,
    TILE_CY: 64,
    BACKPACK_SIZE: 3,

    $elem: $elem,

    load: function( url ) {
      var self = this;

      $.ajax( {
        url: url,
        type: 'get',
        success: function( data ) {

          self.cx = 0;
          self.cy = 0;
          self.backpack = [];
          self.sprites = [];
          self.player = null;
          self.gameover = false;
          self.won = false;
          self.moves = 0;

          // Read the board

          self.board = $.map( data.split( /[\r\n]/ ), function(line,y)
          {
            if (line == "")
              return;

            var row = $.map( line.split(/ +/), function(cell,x)
            {
              if (cell == "")
                return;

              var contents = cell.split(/,/);

              // Create any sprites sitting on this tile.

              for (var i=1; i<contents.length; i++)
              {
                var kind = contents[i];
                var $sprite = $('<div class="sprite"></div>');
                $sprite.addClass('kind-'+kind);

                var sprite = {
                  $elem: $sprite,
                  kind: kind,
                  x: x,
                  y: y
                };

                self.sprites.push(sprite);

                if (kind == 'B')
                  self.player = sprite;
              }

              return { kind: contents[0] };
            } );

            self.cx = row.length > self.cx ? row.length : self.cx;
            self.cy++;
            return [ row ];

          } );

          // Build the map
          // TODO build outside of dom, then swap in

          var $map = $( '#map', self.$elem );
          $map.html('');
          $map.css({ left: '50%', 'margin-left': (-self.cx * self.TILE_CX/2)+'px' });

          for (var y=0; y<self.cy; y++)
          {
            var $row = $('<ul></ul>');

            for (var x=0; x<self.cx; x++)
            {
              var tile = self.board[y][x];
              var $tile = $('<li class="tile"></li>');
              $tile.addClass('x-'+x);
              $tile.addClass('y-'+y);
              $tile.addClass('kind-'+tile.kind);
              tile.$elem = $tile;
              $row.append( $tile );
            }

            $map.append( $row );
          }

          // Create a special death sprite.

          var $death = $('<div class="sprite"></div>');
          $death.addClass('kind-K');

          self.death = {
            $elem: $death,
            kind: 'K',
            x: -10000,
            y: -10000
          };

          self.sprites.push(self.death);

          // Create a special backpack sprite.

          var $pack = $('<div class="sprite"></div>');
          $pack.addClass('kind-P');

          self.pack = {
            $elem: $pack,
            kind: 'P',
            x: 0,
            y: self.cy
          };

          self.sprites.push(self.pack);

          // Place the sprites on the map.

          $.each( self.sprites, function(i,sprite) {

            var $elem = sprite.$elem;
            self.draw_sprite( sprite );
            $map.append( $elem );
            
          } );

          // Set up instructions.

          var instructions = [
            "Bring the girl a flower!",
            "Use an orange flag to cross the road, or die.",
            "Click on a nearby tile to move there.",
            "Click on your player to pick up an item.",
            "Keyboard: arrows move, spacebar picks up an item.",
            "Your backpack can hold up to " + self.BACKPACK_SIZE + " items.",
            "",
            "<i>Graphics: TC</i>",
            "<i>Programming: Alan</i>"
          ];

          $('#instructions')
            .html( instructions.join("<br/>") )
            .css({ left: '50%', 'margin-left': (self.cx * self.TILE_CX/2 + 20)+'px' })
            .show();

          // Show scoreboard.

          self.draw_scoreboard();
        }
      } );
    },

    play: function() {

      var self = this;


      // Keyboard controls.

      $(window).unbind( 'keydown.game' );
      $(window).bind( 'keydown.game', function(ev) {

        if (self.gameover)
          return false;

        var KEY_LEFT = 37;
        var KEY_UP = 38;
        var KEY_RIGHT = 39;
        var KEY_DOWN = 40;
        var KEY_SPACE = 32;
        var KEY_P = 80;
        var KEY_D = 68;

        var player = self.player;
        var newx = player.x;
        var newy = player.y;
        var key = ev.which;

        switch (key)
        {
          case KEY_LEFT:
            newx--;
            break;
          case KEY_UP:
            newy--;
            break;
          case KEY_RIGHT:
            newx++;
            break;
          case KEY_DOWN:
            newy++;
            break;
          case KEY_P:
          case KEY_SPACE:
            self.pickup();
            break;
          case KEY_D:
            break;
          default:
            return false; // let event bubble
        }

        if (player.x != newx || player.y != newy)
          self.move( newx, newy );

        // Update scoreboard and game status.

        self.draw_scoreboard();
        self.draw_status();

      } );


      // Mouse controls.

      var $map = $( '#map', self.$elem );

      $map.unbind( 'click.game' );
      $map.bind( 'click.game', function(ev) {

        var player = self.player;

        if (self.gameover)
          return false;

        var pos = $map.offset();
        var x = Math.floor( (ev.pageX - pos.left) / self.TILE_CX );
        var y = Math.floor( (ev.pageY - pos.top) / self.TILE_CY );

        // Click on the player's current tile to pick up an item.
        // Click elsewhere to move there.

        if (x == player.x && y == player.y)
          self.pickup();
        else
          self.move( x, y );

        // Update scoreboard and game status.

        self.draw_scoreboard();
        self.draw_status();

      } );

    },

    move: function( x, y ) {

      var self = this;
      var player = self.player;

      // Bounds check new position, must be on the board.

      if (x < 0 || x >= self.cx || y < 0 || y >= self.cy)
        return false;

      // Make sure movement is left, right, up, or down.

      var dx = x - player.x;
      var dy = y - player.y;

      if (Math.abs(dx) + Math.abs(dy) != 1)
        return false;

      // Check kind of tile we're moving onto.

      var newtile = self.board[y][x];
      var dead = false;

      switch (newtile.kind)
      {
        case 'X': // blocked
          return false;
        case 'H':
        case 'V':
        case 'S':
          if (!self.use('F'))
            dead = true;
        default:
          break;
      }

      player.x = x;
      player.y = y;
      self.draw_sprite( player );
      self.moves++;

      if (dead)
      {
        self.death.x = player.x;
        self.death.y = player.y;
        self.draw_sprite( self.death );
        self.gameover = true;
        self.won = false;
        return true;
      }
     
      var thing = self.at( player.x, player.y );

      if (thing != null && thing.kind == 'G' && self.use('R'))
      {
        self.gameover = true;
        self.won = true;
      }

      return true;
    },

    pickup: function() {
    
      var self = this;
      var player = self.player;
      var thing = self.at( player.x, player.y );

      if (!thing)
        return false;

      if (self.backpack.length >= self.BACKPACK_SIZE) // backpack full TODO flash image
        return false;

      if (thing.kind != 'F' && thing.kind != 'R') // must be a pickupable object
        return false;

      self.backpack.push( thing );
      self.draw_backpack();

      return thing;
    },

    drop: function() {
      // TODO someday... ;)
      return false;
    },

    use: function( kind ) {
      var self = this;
      var found = -1;
      var thing = null;

      for (i=0; i<self.backpack.length; i++) {
        thing = self.backpack[i];
        if (thing.kind == kind) {
          found = i;
          break;
        }
      }

      if (found < 0)
        return false;

      thing.x = -10000;
      thing.y = -10000;
      self.draw_sprite(thing);
      self.backpack.splice(found,1);
      self.draw_backpack();

      return true;
    },

    at: function( x, y ) {
      var self = this;
      for (i=0; i<self.sprites.length; i++) {
        var sprite = self.sprites[i];
        if (sprite.kind == 'B') continue;
        if (sprite.x == x && sprite.y == y)
          return sprite;
      }
      return null;
    },

    draw_sprite: function( sprite ) {
      var self = this;
      sprite.$elem.css( {
        top: (sprite.y*self.TILE_CY)+'px',
        left: (sprite.x*self.TILE_CX)+'px'
      } );
    },

    draw_backpack: function() {
      var self = this;

      for (i=0; i<self.backpack.length; i++) {
        var thing = self.backpack[i];
        thing.x = 1+i;
        thing.y = self.cy;
        self.draw_sprite( thing );
      }
    },

    draw_message: function( text ) {
      var self = this;
      var $map = $( '#map', self.$elem );
      var pos = $map.offset();
      var $message = $( '#message', self.$elem );

      $message 
        .html( text )
        .css( {
          top: (pos.top + $map.height()/2 - $message.height()/2)+'px',
          left: (pos.left)+'px',
          width: ($map.width())+'px',
        } );
    },

    draw_status: function() {
      var self = this;

      // Check for gameover, and show something.

      if (self.gameover)
        self.draw_message( self.won ? 'You won!' : 'You dead. :(' );
    },

    draw_scoreboard: function() {
      var self = this;
      var $scoreboard = $( '#scoreboard', self.$elem )

      $scoreboard
        .html( 'Moves: ' + self.moves )
        .css({ left: '50%', 'margin-left': (-(self.cx * self.TILE_CX/2 + 20 + $scoreboard.width()))+'px' })
        .show();

    },

    nothing: 0
  };
}

