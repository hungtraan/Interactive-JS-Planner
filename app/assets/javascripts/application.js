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

// Prototyping Caching: Implementing cache in javascript at runtime
// Pros: fast to implement
// Cons: Cache at runtime (into memory), loses cache on refresh
// Future direction: Either local storage, InnoDB, app cache,  (even service worker?)
localCacheTree = {};
localCacheDetail = {};

$(document).ready(function() {
	var loader = $('.loader');

	// Change cursor on mouse hold to specify moveability
	$('.tree_label').mousedown(function(){
	   $(this).css('cursor', 'move');
	});
	$('.tree_label').mouseup(function(){ 
	   $(this).css('cursor', 'auto');
	});

	// Highlight and Load detail when clicking on an item in tree
	$('.tree').on('click','.tree_label.item-name', function(){
		$('.item-name').removeClass('selected');
		var editor = $('.object-editor');
		if(!editor.hasClass('is-open')){
			$('.object-tree, .new-tree').toggleClass('col-md-12 col-md-8');
			editor.removeClass('closed');
			editor.toggleClass('col-md-4');
			editor.addClass('is-open');
		}
		if(!$(this).hasClass('selected')){
			var item_id = $(this).data('itemid');
			var data;
			if (item_id == '') {return;}
			loadDetail($(this));
		}
		$(this).addClass('selected');
	});

	// Expand and get children via AJAX
	$(document).on('change','input[type=checkbox]', function(){
		if (!this.checked) {
			//do nothing if go from uncheck to checked
			console.log('checked');
			return;
		}
		expandBranch(this);
	});
	
	// Live ajax save with HTML5 contenteditable
	// $('span[contenteditable=true]').focus() would not work
	// since it does not recognize newly inserted elements
	var focusContentEditable = function(element){
		// console.log("Fired in: ", element);
		var originalDetail = element.text();
		
		element.focusout(function(event){
			event.stopImmediatePropagation(); // This is SO important to prevent event bubbling and infinite recursion
			// restore state
			var contentText = element.text();
			
			// When focus out (move on to a new line, clicking out of editable area)
			// If old content to new content --> update item
			// If blank content to new content --> create item
			// If totally blank item --> delete item
			if (element.hasClass('tree_label')){
				if (originalDetail == '' && contentText != originalDetail && $.trim(contentText) != ""){ // trim trailing spaces before comparison
					var newItemName = contentText;
					originalDetail = newItemName;

					var newItemParentId = $(element).parent().prev().data('parentid');
					if (newItemParentId == undefined){ newItemParentId = null;}
					createItem(element, newItemName, newItemParentId);
				} 
				else if (contentText == '' || contentText == null){
					$(element).parent().remove();
					deleteItem(element);
					return;
				}
			}
			
			if (contentText == originalDetail){
				return;
			}
			else {
				originalDetail = contentText;
				updateItem(element);
				loadDetail(element, false);
			}
			return;
		});

		element.keydown(function(event){
			event.stopImmediatePropagation(); // This is SO important to prevent event bubbling and infinite recursion
			var el = event.target,
				input = el.nodeName != 'INPUT' && el.nodeName != 'TEXTAREA';

			if (input) {	
				// Shift + Tab: Move item back out 1 level
				if (element.hasClass('tree_label') && event.which == 9 && event.shiftKey){  // shift + tab
					event.preventDefault();
					
					// Exception: No parent possible
					var treeElement = element.parent().parent();
					if (treeElement.hasClass('.tree')){ return; }

					var thisItem_li = element.parent('li'),
						itemId = thisItem_li.data('itemid');
					var parentItem = thisItem_li.parent('ul').parent('li'),
						parentId = parentItem.parent('ul').parent('li').data('itemid');
					
					// 1. Remove expander
					// Special case: Delete tree structure if the element is the only child
					if (element.parent().siblings().length == 0){
						var toRemove = thisItem_li.parent('ul').siblings('input, label');
						toRemove.remove();
						thisItem_li.parent('ul').remove();
					}

					// 2. Move after its parent
					$(parentItem).after(thisItem_li);
					
					// 3. Update the item information
					if (parentId == undefined) { parentId = null;}
					// 4. setChildrenParent(itemId, parentId);
					loadDetail(element,false); // false == purge cache, get new info
					element.focus(); // Keep focus on the item after Shift + tab 
				}
				// Tab: Move item in 1 level (to its previous sibling)
				else if (element.hasClass('tree_label') && event.which == 9 && !event.shiftKey) { // tab without shift
		        	event.preventDefault();

					// Exception: Top of list, no previous sibling
					var prevItem = element.parent('li').prev('li');
					if (prevItem.length == 0){ 
						console.log('oops'); return; } 
					// Problem remaining: Cannot tab it after shift-tab on root level

					var itemId = element.data("itemid");
					var parentId = prevItem.data("itemid");

					// Expand the tree if prev item has children
					if (prevItem.children('input[type=checkbox]').length != 0){
						console.log('yo');
						expandBranch(prevItem.children('input[type=checkbox]'));
					}
					
					// Only insert ul place holder if prev sibling does not have any child
					if (prevItem.children('ul.children').length == 0){
						var toPrepend = '<input type="checkbox" data-itemid="' + parentId + '" id="c' + parentId + '"><label class="expander" for="c'+parentId+'"></label>';
						$(toPrepend).prependTo(prevItem);
						
						var toAppend = '<ul class="children"></ul>';
						$(toAppend).appendTo(prevItem);
					} else {
						console.log("oops 2");
					}

					// Move itself
					element.parent().appendTo(prevItem.children('ul.children'));
					// Expand the tree
					element.parent().parent().siblings('input[type=checkbox]').prop('checked','true');
					// setChildrenParent(itemId, parentId);
					loadDetail(element,false); // false == purge cache, get new info
					element.focus(); // Keep focus on the item after tab
				}
				else{
					switch(event.which) {
				        case 38: // Up
				        	var prevItem = element.parent().prev().children('div.tree_label');
							if (prevItem.length){ // prevent el.blur if at end of list
								event.preventDefault();
								prevItem.focus();
							}
				        	break;

				        case 40: // Down
				        	var nextItem = element.parent().next().children('div.tree_label');
							if (nextItem.length){ // prevent el.blur if at end of list
								event.preventDefault();
								nextItem.focus();
							}
				        	break;

				        case 27: // Esc
				        	// restore state
							document.execCommand('undo');
							el.blur();
				        	break;

				        case 13: // Return/Enter key: 
					        
					        // 1. Save data if original != el.innerHTML
				        	event.preventDefault();
					        var contentText = element.text();
					        
					        if(contentText != originalDetail && $.trim(contentText) != ""){ // trim trailing spaces before comparison
								updateItem(element);
							} 
							if (element.hasClass('tree_label')){
								// 2. Create new item below it
								var newItemHtml = "<li class=\"item\" data-itemid=\"\" ><div class=\"tree_label item-name\" data-itemid=\"\" contenteditable=\"true\" data-name=\"name\"></div></li>";
								$(newItemHtml).insertAfter(element.parent());
								var newlyCreatedItem = element.parent().next().children('div.tree_label');
								newlyCreatedItem.focus();
								focusContentEditable(newlyCreatedItem);
					        }
				        	break;

				        default: return; // exit this handler for other keys
				    }
				}
			}
		});
	};

	$('.item').on('focus','.item-name',function(e){
		var element = $(this);
		focusContentEditable(element);
	});

	$('.object-editor').on('focus','span[contenteditable=true]',function(e){
		var element = $(this);
		focusContentEditable(element);
	});
	
	// BEGIN HELPER FUNCTIONS ==============================================
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
    				$(element).parent().attr('data-itemid',newItemId);
    				$(element).attr('data-itemid',newItemId);
    				$(element).parent().attr('data-parentid', parent_id);
    			}
    		}
    	});
    };

    // Load detail of item
    // @input jquery element, boolean of using localCache, default true
    // ajax get details of the item and insert into object viewer
    var loadDetail = function(element, useCache=true) {
    	var item_id = element.data('itemid');
		if (localCacheTree[item_id] && useCache){
			loader.removeClass('enabled'); // Hide loader
			data = localCacheTree[item_id];
		}
		else{
			loader.addClass('enabled'); // Show loader animation if the request takes too long
			// GET ajax request to get details of the selected item
			$.ajax({
	            method: "GET",
	            url: "/get_detail",
	            data: {
	                item_id: item_id
	            },
	            success: function(json) {
	            	data=json;
	            	localCacheTree[item_id] = data;
	            	if(data!=undefined){
			        	var object = data[0];
			        	var parents = data[1];
			        	$('.object-editor span.item-id').html(object.id);
						$('.object-editor span.item-name').html(object.name);
						$('.object-editor span.item-parent').html(object.parent_name);
						$('.object-editor span.item-desc').html(object.description);
						$('.object-editor span.item-by').html(object.by_name);

						$('.object-editor span.item-id').attr('data-itemid', item_id);
						$('.object-editor span.item-name').attr('data-itemid', item_id);
						$('.object-editor span.item-parent').attr('data-itemid', item_id);
						$('.object-editor span.item-desc').attr('data-itemid', item_id);
						$('.object-editor span.item-by').attr('data-itemid', item_id);

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
			        loader.removeClass('enabled'); // Hide loader
	            }
	        });
		}
    }

	// Update detail of item
	// @input jquery element whose text has been updated
	// post ajax update from this (innerhtml) text to server
	var updateItem = function(element){
		var data = {};
		var itemId = $(element).data('itemid');
		console.log("updating");
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

		// if name, also update name in DOM tree
		if (data['detail'] == 'name'){
			var selector = 'div.tree_label[data-itemid='+itemId+']';
			console.log(selector);
			$(selector).text(data['value']);
		}
		// Purge cache after update
		localCacheTree[itemId] = null;
		localCacheDetail[itemId] = null;
	};

	// Delete item
	// @input jquery element of an item
	// post ajax request to server, server will handle deletion validation
	var deleteItem = function(element){
		var data = {};
		var itemId = $(element).data('itemid');
		
		// If there is an itemId, this is an item already created
		// so update its information
		if (itemId){
			data['item_id'] = itemId;
			// Send an ajax request to update the field
			$.ajax({
				url: '/delete_item',
				data: data,
				method: 'POST'
			});
		}

		// Purge cache after update
		localCacheTree[itemId] = null;
		localCacheDetail[itemId] = null;
	};

	// Set child-parent relationship
	// @input item id of child and parent (one-one)
	var setChildrenParent = function(child_id, parent_id){
		$.ajax({
			url: '/update_parent_children',
			method: "POST",
			data: {
				parent_id: parent_id,
				item_id: child_id,
			},
		});
	};

	// Expand branch: Get children via ajax and display
	// @input: an input[type=checkbox] element
	var expandBranch = function(element){
		var toPrepend = $(element).siblings('ul.children');
		
		if(toPrepend.is(':empty')){ // Only fill in if the branch has not been filled
			var item_id = $(element).data('itemid');
			var data;

			if (localCacheDetail[item_id]){
				loader.removeClass('enabled'); // Hide loader
				data = localCacheDetail[item_id];
			}
			else{
				loader.addClass('enabled'); // Show loader if the request takes too long
				// GET ajax request to get children list
				$.ajax({
		            method: "GET",
		            url: "/get_children",
		            data: {
		                item_id: item_id
		            },
		            success: function(json) {
		            	data=json;
		            	localCacheDetail[item_id] = data;
		            	var children_html = "";

				        // Display HTML of children
				        if(data!=undefined){
				        	// @input: an input[type=checkbox] elemenet
				        	var thisItemId = $(element).data('itemid');
				        	data.forEach(function(item){
				        		children_html += "<li class=\"item\" data-itemid=\"" + item.id + "\" data-parentid=\"" + thisItemId +  "\">";
				        		children_html += (item.has_children)? "<input type=\"checkbox\" data-itemid=\"" + item.id + "\" data-parentid=\"" + thisItemId +  "\" id=\"c" + item.id + "\"><label class=\"expander\" for=\"c" + item.id + "\"></label>\
										<div class=\"tree_label item-name\" for=\"c" + item.id +"\" data-itemid=\"" + item.id + "\" data-name=\"name\" data-parentid=\"" + thisItemId +  "\" contenteditable=\"true\">" + item.name + "</div>\
										<ul class=\"children\"></ul>":"<div class=\"tree_label item-name\" data-itemid=\"" + item.id + "\" contenteditable=\"true\" data-name=\"name\">" + item.name + "</div>"
				        		children_html+="</li>";
					        });
				        }
						toPrepend.prepend(children_html);
						loader.removeClass('enabled'); // Hide loader
		            }
		        });
			}
		}
	}

	// END HELPER FUNCTIONS ==============================================
});


// Helper functions for Zooming tool
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function setFontSize(el) {
    var fontSize = el.val();
    
    if ( isNumber(fontSize) && fontSize >= 0.5 ) {
      $('.tree').css({ fontSize: fontSize + 'em' });
    } else if ( fontSize ) {
      el.val('1');
      $('.tree').css({ fontSize: '1em' });  
    }
}

$(function() {
  
  $('#fontSize')
    .on('input', function(){ setFontSize($(this)); })
    .bind('keyup', function(e){
      if (e.keyCode == 27) {
        $(this).val('1');
        $('body').css({ fontSize: '1em' });  
      } else {
        setFontSize($(this));
      }
    });
  
  $(window)
    .bind('keyup', function(e){
      if (e.keyCode == 27) {
        $('#fontSize').val('1');
        $('body').css({ fontSize: '1em' });  
      }
    });
  
});