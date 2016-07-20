var Word = Backbone.Model.extend({
	move: function() {
		this.set({y:this.get('y') + this.get('speed')});
	}
});

var Words = Backbone.Collection.extend({
	model:Word
});

var WordView = Backbone.View.extend({
	initialize: function() {
		$(this.el).css({position:'absolute'});
		var string = this.model.get('string');
		var letter_width = 25;
		var word_width = string.length * letter_width;
		if(this.model.get('x') + word_width > $(window).width()) {
			this.model.set({x:$(window).width() - word_width});
		}
		for(var i = 0;i < string.length;i++) {
			$(this.el)
				.append($('<div>')
					.css({
						width:letter_width + 'px',
						padding:'5px 2px',
						'border-radius':'4px',
						'background-color':'#fff',
						border:'1px solid #ccc',
						'text-align':'center',
						float:'left'
					})
					.text(string.charAt(i).toUpperCase()));
		}

		this.listenTo(this.model, 'remove', this.remove);

		this.render();
	},

	render:function() {
		$(this.el).css({
			top:this.model.get('y') + 'px',
			left:this.model.get('x') + 'px'
		});
		var highlight = this.model.get('highlight');
		$(this.el).find('div').each(function(index,element) {
			if(index < highlight) {
				$(element).css({'font-weight':'bolder','background-color':'#aaa',color:'#fff'});
			} else {
				$(element).css({'font-weight':'normal','background-color':'#fff',color:'#000'});
			}
		});
	}
});

	var TyperView = Backbone.View.extend({

	events: {
		'keyup input': 'check'
	},

	initialize: function() {
		var wrapper = $('<div>')
			.css({
				position:'fixed',
				top:'0',
				left:'0',
				width:'100%',
				height:'100%'
			});
		this.wrapper = wrapper;

		var self = this;
		this.text_input = $('<input>')
			.addClass('form-control')
			.css({
				'border-radius':'4px',
				position:'absolute',
				bottom:'0',
				'min-width':'80%',
				width:'80%',
				'margin-bottom':'10px',
				'z-index':'1000'
			});

		$(this.el)
			.append(wrapper
				.append($('<form>')
					.attr({
						role:'form'
					})
					.submit(function() {
						return false;
					})
					.append(this.text_input)));

		this.text_input.css({left:((wrapper.width() - this.text_input.width()) / 2) + 'px'});
		this.text_input.focus();

		this.listenTo(this.model, 'change', this.render);
	},

	render: function() {
		var model = this.model;
		var words = model.get('words');

		for(var i = 0;i < words.length;i++) {
			var word = words.at(i);
			if(!word.get('view')) {
				var word_view_wrapper = $('<div>');
				word_view_wrapper.css({
					'max-width':'50%',
					'min-width':'800px'
				});
				this.wrapper.append(word_view_wrapper);
				word.set({
					view:new WordView({
						model: word,
						el: word_view_wrapper
					})
				});
			} else {
				word.get('view').render();
			}
		}
	},

	check: function() {
		var words = this.model.get('words');
		var self = this;
		words.each(function(word) {
			var typed_string = $(self.text_input).val();
			var string = word.get('string');

			if(string.toLowerCase().indexOf(typed_string.toLowerCase()) == 0) {
				word.set({highlight:typed_string.length});
				if(typed_string.length == string.length) {
					$(self.text_input).val('');
				}
			} else {
				word.set({highlight:0});
			}
		});
	}

});

var ButtonView = Backbone.View.extend({
	el: '#button-group',

	events: {
      'click button#start': 'start',
	  'click button#stop': 'stop',
      'click button#resume': 'resume',
  	  'click button#pause': 'pause'
    },

	initialize: function(){
		$('#stop').prop('disabled', true);
		$('#resume').prop('disabled', true);
		$('#pause').prop('disabled', true);
   		this.render(); // not all views are self-rendering. This one is.
    },

    render: function(){

   	},

	start: function() {
		this.model.start();
		$('#start').prop('disabled', true);
		$('#stop').prop('disabled', false);
		$('#pause').prop('disabled', false);
	},

	stop: function() {
		this.pause();
		this.model.destroy();
		$('#stop').prop('disabled', true);
		$('#resume').prop('disabled', true);
		$('#pause').prop('disabled', true);
		$('#start').prop('disabled', false);
	},

	pause: function() {
		var timer = this.model.timer;
		clearInterval(timer);
		$('#pause').prop('disabled', true);
		$('#resume').prop('disabled', false);
	},

	resume: function() {
		this.model.start();
		$('#resume').prop('disabled', true);
		$('#pause').prop('disabled', false);
	}


});

var ScoreView = Backbone.View.extend({

	el: '#score',

	initialize: function() {
		this.timer = 0;
		this.render();
	},

	render: function() {
		this.$el.html(this.timer);
	}

});


var Typer = Backbone.Model.extend({
	defaults:{
		max_num_words:10,
		min_distance_between_words:50,
		words:new Words(),
		min_speed:1,
		max_speed:5
	},

	initialize: function() {
		new TyperView({
			model: this,
			el: $(document.body)
		});
		new ScoreView({
			model: this
		});
	},

	start: function() {
		var animation_delay = 100;
		var self = this;
		this.timer = setInterval(function() {
			self.iterate();
		},animation_delay);
	},

	destroy : function() {
		var words = this.get('words');
		_.invoke(words.toArray(), 'destroy');
	},

	iterate: function() {
		var words = this.get('words');

		if(words.length < this.get('max_num_words')) {
			var top_most_word = undefined;
			for(var i = 0;i < words.length;i++) {
				var word = words.at(i);
				if(!top_most_word) {
					top_most_word = word;
				} else if(word.get('y') < top_most_word.get('y')) {
					top_most_word = word;
				}
			}
			//create new word
			if(!top_most_word || top_most_word.get('y') > this.get('min_distance_between_words')) {
				var random_company_name_index = this.random_number_from_interval(0,company_names.length - 1);
				var string = company_names[random_company_name_index];
				var filtered_string = '';
				for(var j = 0;j < string.length;j++) {
					if(/^[a-zA-Z()]+$/.test(string.charAt(j))) {
						filtered_string += string.charAt(j);
					}
				}

				var word = new Word({
					x:this.random_number_from_interval(0,$(window).width()),
					y:0,
					string:filtered_string,
					speed:this.random_number_from_interval(this.get('min_speed'),this.get('max_speed'))
				});
				words.add(word);
			}
		}

		var words_to_be_removed = [];
		//move the words
		for(var i = 0;i < words.length;i++) {
			var word = words.at(i);
			word.move();

			if(word.get('y') > $(window).height() || word.get('move_next_iteration')) {
				words_to_be_removed.push(word);
			}

			if(word.get('highlight') && word.get('string').length == word.get('highlight')) {
				word.set({move_next_iteration:true});
			}
		}

		for(var i = 0;i < words_to_be_removed.length;i++) {
			words.remove(words_to_be_removed[i]);
		}

		this.trigger('change');
	},

	random_number_from_interval: function(min,max) {
	    return Math.floor(Math.random()*(max-min+1)+min);
	}
});
