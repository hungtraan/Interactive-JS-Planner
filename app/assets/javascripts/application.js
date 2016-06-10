// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or any plugin's vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery
//= require jquery_ujs
//= require turbolinks
//= require bootstrap-sprockets
//= require_tree .

//http://stackoverflow.com/questions/21337393/bootstrap-load-collapse-panel-with-ajax

$('document').ready(function() {

	var loader = $('.loader');
	$('.tree').on('click','span.item-name', function(){
		$('span.item-name').removeClass('selected');
		var editor = $('.object-editor');
		if(!editor.hasClass('is-open')){
			$('.object-tree').toggleClass('col-md-12 col-md-8');
			editor.removeClass('closed');
			editor.toggleClass('col-md-4');
			editor.addClass('is-open');
		}
		if(!$(this).hasClass('selected')){
			var item_id = $(this).parent('div.item').data('itemid');
			var data;
			if (item_id == '') {return;}
			loader.addClass('enabled');
			$.ajax({ // Populate bar chart and data table
	            method: "POST",
	            async: false,
	            url: "/get_detail",
	            data: {
	                item_id: item_id
	            },
	            success: function(json) {
	            	loader.removeClass('enabled');
	            	data=json;
	            	// console.log(json);
	            }
	        });

	        if(data!=undefined){
	        	var object = data[0];
	        	var parents = data[1];
	        	$('.object-editor span.item-id').html(object.id);
				$('.object-editor span.item-name').html(object.name);
				$('.object-editor span.item-parent').html(object.parent_name);
				$('.object-editor span.item-desc').html(object.description);
				$('.object-editor span.item-by').html(object.by_name);

				var breadcrumb_li = "";
				var parents_li = "<li><a class=\"parents\" href=\"#\">"
				parents.forEach(function(item){
					breadcrumb_li += parents_li + item.name + "</a></li>";
				});
				var thisItem_li = "<li class=\"selected\">" + object.name + "</li>";
				$('.breadcrumb-onepage').html("");
				$('.breadcrumb-onepage').append(breadcrumb_li);
				$('.breadcrumb-onepage').append(thisItem_li);

	        }
		}
		$(this).addClass('selected');
	});

	$('.item').on('click','i.item-expander', function(){
		var toAppend = $(this).siblings('.collapse');
		loader.addClass('enabled');
		if(toAppend.is(':empty')){
			var item_id = $(this).parent('div.item').data('itemid');
			var data;
			$.ajax({ // Populate bar chart and data table
	            method: "POST",
	            async: false,
	            url: "/get_children",
	            data: {
	                item_id: item_id
	            },
	            success: function(json) {
	            	loader.removeClass('enabled');
	            	data=json;
	            }
	        });

	        var children_html = "";

	        if(data!=undefined){
	        	data.forEach(function(item){
	        		children_html+="<div class=\"item\" data-itemid=\""+ item.id +"\">";
	        		children_of_children_glyphicon = (item.has_children)?"<i class=\"item-expander glyphicon glyphicon-plus\"></i>\n":"<i class=\"item-expander glyphicon glyphicon-plus\" style=\"visibility: hidden\"></i>\n";
	        		children_html+=children_of_children_glyphicon;
	        		children_html+= "<span class=\"item-name\" contenteditable=\"true\" data-name=\"item-name\">" + item.name + "</span>\n";
	        		children_of_children_placeholder = (item.has_children)?"<div class=\"collapse\">":"";
	        		children_html+=children_of_children_placeholder;
	        		children_html+="</div></div>";
		        });
	        }
			toAppend.append(children_html);

			// Increment margin for children of an item
			var parentMargin = parseInt(toAppend.css('margin-left'),10);
			var newMargin = parentMargin+20+'px';
			toAppend.children('.item').css('margin-left',newMargin); 
		}
		toAppend.collapse('toggle');
	});

	$('.item').on('show.bs.collapse','.collapse', function (e) {       
		$(this).siblings('i').toggleClass('glyphicon-plus glyphicon-minus');
    })
    $('.item').on('hide.bs.collapse', '.collapse', function (e) {
		$(this).siblings('i').toggleClass('glyphicon-plus glyphicon-minus');
    })

	// Live ajax save with HTML5 contenteditable
	$('span[contenteditable]').focus(function(){
		var originalDetail = $(this).text();

		$(this).keydown(function(event){
			var esc = event.which == 27,
				nl = event.which == 13, //new line, Return key or Enter key
				up = event.which == 38,
				down = event.which == 40,
				el = event.target, // element
				input = el.nodeName != 'INPUT' && el.nodeName != 'TEXTAREA';

			var element = $(el);
			if (input) {
				if (esc) {
					// restore state
					document.execCommand('undo');
					el.blur();
				} 
				// Allow up and down key to move between items on the item tree
				else if (down){
					event.preventDefault();
					el.blur();
					element.parent('div.item').next().children('span.item-name').focus();
		        } else if (up){
		        	event.preventDefault();
		        	el.blur();
		        	element.parent('div.item').prev().children('span.item-name').focus();
		        } 
		        // Return/Enter key: Save data via ajax
		        else if (nl) {
					// save
					if(originalDetail != el.innerHTML){
						var data = {};
						data['item_id'] = $(element).parent('div.item').data('itemid');
						data['detail'] = el.getAttribute('data-name');
						data['value'] = el.innerHTML;
						// log(JSON.stringify(data));
						
						// Send an ajax request to update the field
						$.ajax({
							url: '/update_individual_detail',
							data: data,
							method: 'POST'
						});
						
					} //if original != el.innerHTML
					
					el.blur();
					event.preventDefault();

					// Not working yet
					// var newItemHtml = "<div class=\"item\" data-itemid=\"\">\
					// 			<i class=\"item-expander glyphicon glyphicon-plus\" style=\"visibility:hidden;\"></i>\
					// 				<span class=\"item-name\" contenteditable=\"true\" data-name=\"item-name\"></span>\
					// 			</div>";
					// $(newItemHtml).insertAfter((element.parent('div.item')));
					// $(element.parent('div.item')).next().children('span.item-name').focus();
					
				}
			}
		});
	});
});



function log(s) {
  console.log('value changed to: ' + s);
}