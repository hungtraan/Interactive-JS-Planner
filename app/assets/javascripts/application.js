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
			$.ajax({ // Populate bar chart and data table
	            method: "POST",
	            async: false,
	            url: "/get_detail",
	            data: {
	                item_id: item_id
	            },
	            success: function(json) {
	            	data=json;
	            }
	        });

	        if(data!=undefined){
	        	console.log('in');
	        	$('.object-editor span.item-id').html(data.id);
				$('.object-editor span.item-name').html(data.name);
				$('.object-editor span.item-parent').html(data.parent_name);
				$('.object-editor span.item-desc').html(data.description);
	        }
		}
		$(this).addClass('selected');
	});

	$('.item').on('click','i.item-expander', function(){
		var toAppend = $(this).siblings('.collapse');
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
	            	data=json;
	            }
	        });

	        var children_html = "";

	        if(data!=undefined){
	        	data.forEach(function(item){
	        		children_html+="<div class=\"item\" data-itemid=\""+ item.id +"\">";
	        		children_of_children_glyphicon = (item.has_children)?"<i class=\"item-expander glyphicon glyphicon-plus\"></i>\n":"<i class=\"item-expander glyphicon glyphicon-plus\" style=\"visibility: hidden\"></i>\n";
	        		children_html+=children_of_children_glyphicon;
	        		children_html+= "<span class=\"item-name\">" + item.name + "</span>\n"
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
});