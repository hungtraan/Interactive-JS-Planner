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

// http://stackoverflow.com/questions/21337393/bootstrap-load-collapse-panel-with-ajax
localCacheTree = {};
localCacheDetail = {};

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
			loader.addClass('enabled'); // Show loader animation if the request takes too long
			if (localCacheTree[item_id]){
				loader.removeClass('enabled'); // Hide loader
				data = localCacheTree[item_id];
			}
			else{
				// GET ajax request to get details of the selected item
				$.ajax({
		            method: "GET",
		            async: false,
		            url: "/get_detail",
		            data: {
		                item_id: item_id
		            },
		            success: function(json) {
		            	loader.removeClass('enabled'); // Hide loader
		            	data=json;
		            	localCacheTree[item_id] = data;
		            	// console.log(json);
		            }
		        });
			}
			
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

	// On click of expander button:
	// Insert placeholder divs for children
	// Get children either form local js cache or ajax GET
	$('.item').on('click','i.item-expander', function(){
		var toAppend = $(this).siblings('.collapse');
		loader.addClass('enabled'); // Show loader if the request takes too long
		
		if(toAppend.is(':empty')){ // Only fill in if the branch has not been filled
			var item_id = $(this).parent('div.item').data('itemid');
			var data;

			if (localCacheDetail[item_id]){
				loader.removeClass('enabled'); // Hide loader
				data = localCacheDetail[item_id];
			}
			else{
				// GET ajax request to get children list
				$.ajax({
		            method: "GET",
		            async: false,
		            url: "/get_children",
		            data: {
		                item_id: item_id
		            },
		            success: function(json) {
		            	loader.removeClass('enabled'); // Hide loader
		            	data=json;
		            	localCacheDetail[item_id] = data;
		            }
		        });
			}

	        var children_html = "";

	        // Display HTML of children
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

	// Show and hide plus/minus sign after collapsed/expanded
	$('.item').on('show.bs.collapse','.collapse', function (e) {       
		$(this).siblings('i').toggleClass('glyphicon-plus glyphicon-minus');
    });
    $('.item').on('hide.bs.collapse', '.collapse', function (e) {
		$(this).siblings('i').toggleClass('glyphicon-plus glyphicon-minus');
    });

    // Create item function
    // @input: name, parent_id
    var createItem = function(element, name, parent_id){
    	var newItemId = null;
    	$.ajax({
    		data: {
    			item_name: name,
    			parent_id: parent_id, 
    		},
    		url: "/create_item",
    		method: "POST",
    		success: function(json){
    			if (json){
    				newItemId = json.id;
    				$(element).parent('div.item').attr('data-itemid',newItemId);
    			}
    		}
    	});
    };

	// Live ajax save with HTML5 contenteditable
	// $('span[contenteditable=true]').focus() would not work
	// since it does not recognize newly inserted elements
	
	var focusContentEditable = function(element){
		console.log("Fired in: ", element);
		var originalDetail = element.text();
		
		element.focusout(function(event){
			event.stopImmediatePropagation(); // This is SO important to prevent event bubbling and infinite recursion
			// restore state
			var contentText = element.text();
			if( originalDetail == '' && contentText != originalDetail && $.trim(contentText) != ""){ // trim trailing spaces before comparison
				var newItemName = contentText;
				originalDetail = newItemName;
				var newItemParent = element.parents('div.item')[1]; // 2 levels of parents
				if (newItemParent == undefined){ // If level 0 items, no parent
					var newItemParentId = null;
				} else { // Items of Level > 0, get parentId to construct a new item object
					var newItemParentId = $(newItemParent).data('itemid');
				}
				createItem(element, newItemName, newItemParentId);
			} 
			else if (contentText == originalDetail){
				return;
			}
			else if ($.trim(contentText) == ""){
				return;
			}
			else {
				originalDetail = contentText;
				updateItem(element);
			}
			return;
		});

		element.keydown(function(event){
			event.stopImmediatePropagation(); // This is SO important to prevent event bubbling and infinite recursion
			var el = event.target;
			var input = el.nodeName != 'INPUT' && el.nodeName != 'TEXTAREA';
			// var element = $(el);
			if (input) {	
				switch(event.which) {
			        case 38: // up
			        	var prevItem = element.parent('div.item').prev().children('span.item-name');
						if (prevItem.length){ // prevent el.blur if at end of list
							event.preventDefault();
							// el.blur();
							prevItem.focus();
						}
			        	break;

			        case 40: // down
			        	var nextItem = element.parent('div.item').next().children('span.item-name');
						if (nextItem.length){ // prevent el.blur if at end of list
							event.preventDefault();
							// el.blur();
							nextItem.focus();
						}
			        	break;

			        case 27: // esc
			        	// restore state
						document.execCommand('undo');
						el.blur();
			        	break;

			        case 9: // tab
			        	break;

			        case 13: // new line
			        	// Return/Enter key: 
				        // 1. Save data via ajax
				        // 2. Create new div.item > span.item-name to create new object

				        // Start here:
				        // 1. Save data if original != el.innerHTML
				        event.preventDefault();
				        var contentText = element.text();
				        if(contentText != originalDetail && $.trim(contentText) != ""){ // trim trailing spaces before comparison
								updateItem(element);
						} 
						// Only create new item if new line was empty
						else if (originalDetail=='') {
							var newItemName = contentText;
							var newItemParent = element.parents('div.item')[1]; // 2 levels of parents
							if (newItemParent == undefined){ // If level 0 items, no parent
								var newItemParentId = null;
							} else { // Items of Level > 0, get parentId to construct a new item object
								var newItemParentId = $(newItemParent).data('itemid');
							}
							createItem(element, newItemName, newItemParentId);
							originalDetail = newItemName;
						}
						
						// el.blur();

						// 2. Create new item below it
						var newItemHtml = "<div class=\"item\" data-itemid=\"\">\
									<i class=\"item-expander glyphicon glyphicon-plus\" style=\"visibility:hidden;\"></i>\
										<span class=\"item-name\" contenteditable=\"true\" data-name=\"item-name\"></span>\
									</div>";
						$(newItemHtml).insertAfter((element.parent('div.item')));
						var newlyCreatedItem = $(element.parent('div.item')).next().children('span.item-name');
						newlyCreatedItem.focus();
						focusContentEditable(newlyCreatedItem);
			        	break;

			        default: return; // exit this handler for other keys
			    }
			}
		});
	};

	$('.item').on('focus','span',function(e){
		var element = $(this);
		focusContentEditable(element);
	});
	
	// Update detail of item
	var updateItem = function(element){
		var data = {};
		var itemId = $(element).parent('div.item').data('itemid');
		
		// If there is an itemId, this is an item already created
		// so update its information
		if (itemId){
			data['item_id'] = itemId;
			data['detail'] = $(element).data('name');
			data['value'] = element.text();
			// Send an ajax request to update the field
			$.ajax({
				url: '/update_individual_detail',
				data: data,
				method: 'POST'
			});
		}

		// Purge cache after update
		localCacheTree[itemId] = null;
		localCacheDetail[itemId] = null;
	};
});