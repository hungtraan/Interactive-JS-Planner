/*jshint multistr: true */
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
//= require jquery-ui/sortable
//= require jquery-ui/dialog
//= require turbolinks
//= require bootstrap-sprockets
//= require_tree .

// Prototyping Caching: Implementing cache in javascript at runtime
// Pros: fast to implement
// Cons: Cache at runtime (into memory), loses cache on refresh
// Future direction: Either local storage, InnoDB, app cache,  (even service worker?)
var localCacheTree = {};
var localCacheDetail = {};
var localCacheTags = {};
var localCacheTagTree = {};

$(document).ready(function() {
	var loader = $('.loader');

	// Save original tree in case later on user change it to view tags/filters
	var originalTreeHtml = $('.root > ul.children').first().html();

	// $(this).toggleClass("textedit moveitem");
	var firstLocationRemembered = 0;
	var originalSerialized = '';
	var serialized = '';
	
	/* EVENT HANDLERS ==================================== */

	// Click on a parent item on the breadcrumb will be similar to
	// clicking on the parent item in the tree
	$('ul.breadcrumb-onepage').on('click', 'a.parents',function(e){
		e.preventDefault();
		var itemToFocus = $(this).attr('data-item-id');
		$('div.tree_label[data-item-id="' + itemToFocus + '"]').click();
	});

	$('.object-editor').on('click', '.close-sign',function(){
		// $('.object-tree, .new-tree').toggleClass('col-md-12 col-md-6');
		$('.object-editor').addClass('closed');
		// $('.object-editor').toggleClass('col-md-5');
		$('.object-editor').removeClass('is-open');
		$('div.tree_label').removeClass('selected');
	});


	activateTags();
	

	// Support item sorting by drag and drop
	var dragnDrop = function(e){
		$('.tree.sortable').nestedSortable({
	        handle: 'i.mover',
	        helper:	'clone',
	        items: 'li',
	        toleranceElement: '> div',
	        // opacity: .6,
	        listType: 'ul',
	        forcePlaceholderSize: true,
	        placeholder: 'placeholder',
	        isTree: true, // to expand on hover
	        expandOnHover: 1500,
			protectRoot: true,
			rootID: 0,
			tabSize: 25,
			tolerance: 'pointer',
			relocate: function(){
				// serialized = $('#sortable').nestedSortable('serialize');
				// console.log(serialized);
				if (itemToMove.offset() !== oldPos){
					// 1. Reorder the items within its parent
					reorder(itemToMove);
					var newParentId = itemToMove.parent('ul').parent('li').attr('data-item-id');
					var possibleParent = itemToMove.parent('ul').parent('li');
					if (newParentId != oldParentId){
						// 2. Update children parent relationship
						setChildrenParent(itemToMove.attr('data-item-id'), newParentId);
						if (possibleParent.children('label.expander').length === 0){
							var toPrepend = '<input type="checkbox" data-item-id="' + newParentId + '" id="c' + newParentId + '"><label class="expander" for="c'+newParentId+'"></label>';
							$(toPrepend).prependTo(possibleParent);
							possibleParent.children('input[type=checkbox]').prop('checked','true');
						}
					}
				}
			},
			// revert: function(){
				
			// }
		});
		$('[contenteditable=true]').unbind(); // to make contenteditable work again with nestedsortable
	};
	
	dragnDrop();

	// Confirm deletion for deleting item with children
	var confirmDelete = function(){ //only placeholder to be redefined later 
	};
	$( "#dialog-confirm" ).dialog({
		resizable: false,
		autoOpen: false,
		modal: true,
		buttons: {
			"Delete": function() {
				$( this ).dialog( "close" );
				confirmDelete();
			},
			"Cancel": function() {
				document.execCommand('undo');
				$( this ).dialog( "close" );
			}
		}
	});


	// Highlight and Load detail when clicking on an item in tree
	$('.tree').on('click','.tree_label.item-name', function(event){
		var editor = $('.object-editor');
		if(!$(this).hasClass('selected')){
			var item_id = $(this).attr('data-item-id');
			if (item_id === '' || item_id === undefined) {return;}
			if(!editor.hasClass('is-open')){
				// $('.object-tree, .new-tree').toggleClass('col-md-12 col-md-6');
				editor.removeClass('closed');
				// editor.toggleClass('col-md-5');
				editor.addClass('is-open');
			}
			loadDetail($(this));
		}
		$('.tree_label.item-name').removeClass('selected');
		$(this).addClass('selected');
		// event.stopImmediatePropagation();
	});

	// Delete item when click on the delete button
	$('.object-editor')
	.on('click', 'i.delete-item-icon', function(){
		$(this).hide();
		$('.object-editor .confirm-delete-item,.yes-delete,.no-delete').show();

		var itemId = $(this).attr('data-item-id');
		var $liItem = $('li.item[data-item-id=' + itemId + ']');
		if ($liItem.children('label.expander').length !== 0){ // has children
			$('.object-editor .confirm-delete-item').text('This item has children item(s). Are you sure?');
		} else {
			$('.object-editor .confirm-delete-item').text('Confirm delete?');
		}
	})
	.on('click', '.yes-delete', function(){
		var itemId = $(this).attr('data-item-id');
		deleteItem(itemId);
		$('i.delete-item-icon').hide();
		$('.object-editor .confirm-delete-item,.yes-delete,.no-delete').hide();
		$('.object-editor').toggleClass('closed is-open');

		// Remove item from tree
		var $liItem = $('li.item[data-item-id=' + itemId + ']');
		$liItem.remove();
	})
	.on('click', '.no-delete', function(){
		$('.object-editor .confirm-delete-item,.yes-delete,.no-delete').hide();
		$('i.delete-item-icon').show();
	});

	// Expand and get children via AJAX
	$(document).on('change','li.item > input[type=checkbox]', function(){
		if (!this.checked) { // Collapse
			$(this).siblings('div.tree_label').removeClass('expanded');
			$(this).parent('li').removeClass('expanded');
			expandToggle($(this).parent('li').attr('data-item-id'), 0);
			// Note: (Future direction) Move to save expand-collapse state every 30s/60s instead of save on change to save number of requests to server
			return;
		}
		expandBranch(this);
		$(this).parent('li').addClass('expanded');
		$(this).siblings('div.tree_label').addClass('expanded');
	});
	
	$('.item').on('focus','.item-name',function(e){
		console.log("on('focus')");
		var element = $(this);
		focusContentEditable(element);
	});

	$('.object-editor').on('focus','span[contenteditable=true]',function(e){
		var element = $(this);
		focusContentEditable(element);
	});

	// Hover with mousedown on a li element over 1500ms, expand branch
	var itemToMove;
	var oldPos, oldParentId;
	$('.tree').on('mousedown', '.mover',function(e){
		var delay=1500, setTimeoutConst;
		$('.tree').on('mouseover','li.item:not(#0)',function(event){
			var li_element = $(this);
			if (li_element.children('input[type=checkbox]').length === 0){
				return;
			}
			setTimeoutConst = setTimeout(function(e){
				li_element.children('input[type=checkbox]').prop('checked',true).change();
			}, delay);
			event.stopImmediatePropagation();
		}).on('mouseleave','li.item', function(event){
			clearTimeout(setTimeoutConst);
		});
		itemToMove = $(this).parent('li');
		oldPos = itemToMove.offset();
		oldParentId = itemToMove.parent('ul').parent('li').attr('data-item-id');
		
	}).on('mouseup', function(e){
		$('.tree').unbind('mouseover');
	});

	/* Live ajax save with HTML5 contenteditable
	 * $('span[contenteditable=true]').focus() would not work
	 * since it does not recognize newly inserted elements
	 */
	var focusContentEditable = function(element){
		var originalDetail = element.text();
		
		element.focusout(function(event){
			event.stopImmediatePropagation(); // This is VERY important: prevent event bubbling
			var contentText = element.text();
			console.log('out', element);

			// When focus out (move on to a new line, clicking out of editable area)
			// If old content to new content --> update item
			// If blank content to new content --> create item
			// If totally blank item --> delete item
			if (element.hasClass('tree_label')){
				console.log("here");
				if (originalDetail === '' && contentText !== originalDetail && $.trim(contentText) !== ''){ // trim trailing spaces before comparison
					var newItemName = contentText;
					originalDetail = newItemName;

					var newItemParentId = element.parent('li').parent('ul').parent('li').attr('data-item-id');
					if (newItemParentId === 0){newItemParentId = null;}
					createItem(element, newItemName, newItemParentId);
					return;
				}
				else if ((element.attr('data-item-id') !== undefined && element.attr('data-item-id') !== '') && (contentText === '' || contentText === null)){ 
					// Remove if content is blank, but only for those with itemid
					// i.e. not a new line
					
					if (element.siblings('label.expander').length !== 0){
						confirmDelete = function(){
							$(element).parent().remove();
							deleteItem(element.attr('data-item-id'));
						};
						$( "#dialog-confirm" ).dialog("open");
					}
					else {
						$(element).parent().remove();
						deleteItem(element.attr('data-item-id'));
					}
					return;
				}

				// When current item's data-parent-id is different from its real parent in the DOM, update relationship
				var possibleParentId = element.parent('li').parent('ul').parent('li').attr('data-item-id');
				if (element.attr('data-parent-id') !== undefined && possibleParentId !== undefined && element.attr('data-parent-id') !== possibleParentId){
					setChildrenParent(element.attr('data-item-id'), possibleParentId);
				}
			}
			
			if (contentText !== originalDetail){
				originalDetail = contentText;
				updateItem(element);
				loadDetail(element, false);
			}
			return;
		});

		element.keydown(function(event){
			console.log('keydown');
			event.stopImmediatePropagation(); // This is SO important to prevent event bubbling and infinite recursion
			var el = event.target,
				input = el.nodeName != 'INPUT' && el.nodeName != 'TEXTAREA';

			if (input) 
			{	
				// Shift + Tab: Move item back out 1 level
				if (element.hasClass('tree_label') && event.which == 9 && event.shiftKey)
				{ 
					event.preventDefault();
					
					// Exception: No parent possible
					var treeElement = element.parent('li').parent('ul').parent('li');
					if (treeElement.hasClass('root')){ return; }

					var thisItem_li = element.parent('li'),
						itemId = thisItem_li.attr('data-item-id');
					var parentItem = thisItem_li.parent('ul').parent('li'),
						parentId = parentItem.parent('ul').parent('li').attr('data-item-id');
					
					// 1. Remove expander & parent's subtree if if the element is the only child
					if (element.parent().siblings().length === 0){
						var toRemove = thisItem_li.parent('ul').siblings('input, label');
						toRemove.remove();
					}

					// 2. Move after its parent
					$(parentItem).after(thisItem_li);
					
					// 3. Update the item information
					if (parentId === undefined) { parentId = null;}
					if (element.attr('data-item-id') !== undefined && element.attr('data-item-id') !== ''){
						setChildrenParent(itemId, parentId);
						loadDetail(element,false); // false == purge cache, get new info
					}
					
					element.focus(); // Keep focus on the item after Shift + tab
					focusContentEditable(element); // This line solved a bug: Cannot tab it after shift-tab on root level by putting focus again on this element
				}

				// Tab: Move item in 1 level (to its previous sibling)
				else if (element.hasClass('tree_label') && event.which == 9 && !event.shiftKey) 
				{
		        	event.preventDefault();

					// Exception: Top of list, no previous sibling
					var prevItem = element.parent('li').prev('li');
					if (prevItem.length === 0){ return; } 

					var itemId = element.attr('data-item-id');
					var parentId = prevItem.attr('data-item-id');

					// Expand the tree if prev item has children
					if (prevItem.children('input[type=checkbox]').length){
						expandBranch(prevItem.children('input[type=checkbox]'));
					}
					// Move itself
					element.parent().appendTo(prevItem.children('ul.children'));
					// The element will focusout right here (after appendTo)
					// thus creating the object right here
					
					// Expand the tree
					if (prevItem.children('label.expander').length === 0){
						var toPrepend = '<input type="checkbox" data-item-id="' + parentId + '" id="c' + parentId + '"><label class="expander" for="c'+parentId+'"></label>';
						$(toPrepend).prependTo(prevItem);
					}
					element.parent().parent().siblings('input[type=checkbox]').prop('checked','true');

					
					if (element.text() !== ''){ // new, type in then tab
						parentId = element.parent('li').parent('ul').parent('li').attr('data-item-id');
					}

					// Update relationship
					// For newly created item: Right here data-item-id will be blank since the newly created item has not been updated by createItem() function yet due to delay of xhf response
					if (element.attr('data-item-id') !== undefined && element.attr('data-item-id') !== ''){
						setChildrenParent(itemId, parentId);
						loadDetail(element,false); // false = purge cache, get new info
					} else { // new item being tabbed after typing

					}

					element.focus(); // Keep focus on the item after tab
				}
				else{
					switch(event.which) {
				        case 39: // Right: Expand
				        	if (element.siblings('label.expander').length){
				        		event.preventDefault();
				        		element.addClass('expanded');
				        		expandBranch(element.siblings('input[type=checkbox]'));
				        		element.siblings('input[type=checkbox]').prop('checked',true);
				        	}
				        	break;
				        
				        case 37: // Left: Collapse
				        	if (element.hasClass('expanded')){
				        		event.preventDefault();
				        		element.removeClass('expanded');
				        		element.siblings('input[type=checkbox]').prop('checked',false);
				        	} 
				        	else if (element.parent('li').parent('ul').prev('div.tree_label').hasClass('expanded')){
				        		event.preventDefault();
				        		element.parent('li').parent('ul').prev('div.tree_label').focus();
				        	}
				        	break;

				        case 38: // Up
				        	event.preventDefault();
				        	var prevItem = element.parent().prev().children('div.tree_label');
				        	// Move into expanded subtree of previous item
				        	if (prevItem.hasClass('expanded')){
				        		prevItem = prevItem.parent().find('ul.children > li.item:last-child > div.tree_label:visible');
				        		// :visible prevent going to loaded but collapsed leaf item
				        	}
							if (prevItem.length){ // prevent el.blur if at end of list
								prevItem[prevItem.length-1].focus();
							} else {
								if (element.parent('li').parent('ul').prev('div.tree_label').length){
									prevItem = element.parent('li').parent('ul').prev('div.tree_label');
									prevItem.focus();
								}
							}
				        	break;

				        case 40: // Down
				        	var nextItem;
				        	if (element.hasClass('expanded')){ // support traversing parent -> children
				        		nextItem = element.parent().find('ul > li.item:first-child > div.tree_label');
				        	} else { // same-level traversing
				        		nextItem = element.parent().next().children('div.tree_label');
				        	}
							if (nextItem.length){ // prevent el.blur if at end of list
								event.preventDefault();
								nextItem[0].focus();
							} 
							else{ // if its parent has more sibling to go to
								var parentSibling = element.parent('li').parent('ul').parent('li').next('li');
								if (parentSibling.length === 0){
									var runner = element.parent('li'); // set runner = li to go outward
									while (parentSibling.length === 0 && !(runner.hasClass('root')) ){
										runner = runner.parent('ul').parent('li');
										parentSibling = runner.parent('ul').parent('li').next('li');
									}
								}
								if (parentSibling.length){
									nextItem = parentSibling.children('div.tree_label');
									nextItem.focus();
								}
							}
				        	break;

				        case 27: // Esc
				        	// restore state
							element.text(originalDetail);
							el.blur();
				        	break;

				        case 13: // Return/Enter key: 
					        
					        // 1. Save data if original != el.innerHTML
				        	event.preventDefault();
					        var contentText = element.text();
					        
					        if(contentText !== originalDetail && $.trim(contentText) !== ""){ // trim trailing spaces before comparison
								updateItem(element);
							} 
							if (element.hasClass('tree_label')){
								// 2. Create new item below it
								var newItemHtml = "<li class=\"item\" data-item-id=\"\" id=\"\"><i class=\"fa fa-bars mover ui-sortable-handle\" aria-hidden=\"true\"></i><div class=\"tree_label item-name\" data-item-id=\"\" contenteditable=\"true\" data-name=\"name\"></div><ul class=\"children\"></ul></li>";
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

	/* END EVENT HANDLERS */
	
	// BEGIN HELPER FUNCTIONS ==============================================
	// Create item function
    // @input: name, parent_id, element div.tree_label
    var createItem = function(element, name, parent_id){
    	var newItemId = null;

    	// get prev & next item's ordering
    	var prevItem = element.parent('li').prev('li'),
    		nextItem = element.parent('li').next('li'),
			prevItemId = (prevItem.length === 0) ? null:prevItem.attr('data-item-id'),
    		nextItemId = (nextItem.length === 0) ? null:nextItem.attr('data-item-id'),
    		projectId = element.parents('div.tree.active').attr('data-project-id');
    	
    	if (parent_id === '0'){parent_id='';}
    	$.ajax({
    		data: {
    			item_name: name,
    			parent_id: parent_id, 
    			prev_item_id: prevItemId,
    			next_item_id: nextItemId,
    			project_id: projectId,
    		},
    		url: "/create_item",
    		method: "POST",
    		success: function(json){
    			if (json){
    				newItemId = json.id;
    				$(element).parent().attr('data-item-id',newItemId);
    				$(element).parent().attr('data-parent-id', parent_id);
    				$(element).attr('data-item-id',newItemId);
    				$(element).attr('data-parent-id',parent_id);
    				$(element).attr('id','item_'+newItemId);
    			}
    		}
    	});
    };

    // Load detail of item
    // @input jquery div.tree_label element, boolean of using localCache, default true
    // ajax get details of the item and insert into object viewer
    var loadDetail = function(element, useCache=true) {
    	var data;
    	var item_id = element.attr('data-item-id');
    	if (item_id === undefined) {return;}
    	
    	if (useCache && localCacheTree[item_id] !== undefined && localCacheTags[item_id] !== undefined ){
			loader.removeClass('enabled'); // Hide loader
			data = localCacheTree[item_id];
			showDetailOnSide(data, item_id);
			tagHtml = localCacheTags[item_id];
			$('.object-editor .tags > .tag-area').html(tagHtml);
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
	            	if(data!==undefined){
			        	showDetailOnSide(data, item_id);
			        }
	            }
	        });

	        $.ajax({
	            method: "GET",
	            url: "/get_tags_html",
	            data: {
	                item_id: item_id,
	            },
	            success: function(html) {
	            	localCacheTags[item_id] = html;
	            	if(html!==undefined){
	            		$('.object-editor .tags > .tag-area').html(html);
			        }
	            }
	        });
		}
    };

    var showDetailOnSide = function(data, item_id){
    	var object = data[0];
    	var parents = data[1];
    	$('.object-editor .yes-delete,.delete-item-icon').attr('data-item-id',object.id);
    	$('.object-editor span.item-id').html(object.id);
		$('.object-editor span.item-name').html(object.name);
		$('.object-editor span.item-parent').html(object.parent_name);
		$('.object-editor span.item-desc').html(object.description);
		$('.object-editor span.item-by').html(object.by_name);

		$('.object-editor span.item-id').attr('data-item-id', item_id);
		$('.object-editor span.item-name').attr('data-item-id', item_id);
		$('.object-editor span.item-parent').attr('data-item-id', item_id);
		$('.object-editor span.item-desc').attr('data-item-id', item_id);
		$('.object-editor span.item-by').attr('data-item-id', item_id);
		$('.object-editor div.tag-area div.tags').attr('data-item-id',object.id);

		var breadcrumb_li = "";
		var parents_li = "<li><a class=\"parents\" href=\"#\"";
		parents.forEach(function(item){
			breadcrumb_li += parents_li + "data-item-id=\"" + item.id + "\">" + item.name + "</a></li>";
		});
		var thisItem_li = "<li class=\"selected\">" + object.name + "</li>";
		$('.breadcrumb-onepage').html("");
		$('.breadcrumb-onepage').append(breadcrumb_li);
		$('.breadcrumb-onepage').append(thisItem_li);
		loader.removeClass('enabled'); // Hide loader
    };

	// Update detail of item
	// @input jquery element whose text has been updated
	// post ajax update from this (innerhtml) text to server
	var updateItem = function(element){
		var data = {};
		var itemId = $(element).attr('data-item-id');
		// If there is an itemId, this is an item already created
		// so update its information
		if (itemId){
			data.item_id = itemId;
			data.detail = $(element).attr('data-name');
			data.value = element.text();
			// Send an ajax request to update the field
			$.ajax({
				url: '/update_individual_detail',
				data: data,
				method: 'POST'
			});
		}

		// if name, also update name in DOM tree
		if (data.detail == 'name'){
			var selector = 'div.tree_label[data-item-id='+itemId+']';
			$(selector).text(data.value);
		}
		// Purge cache after update
		localCacheTree[itemId] = null;
		localCacheDetail[itemId] = null;
	};

	// Delete item
	// @input jquery element of an item (.div.item-name)
	// post ajax request to server, server will handle deletion validation
	var deleteItem = function(itemId){
		var data = {};
		// var itemId = $(element).attr('data-item-id');
		
		// If there is an itemId, this is an item already created
		// so update its information
		if (itemId){
			data.item_id = itemId;
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
		if (child_id===''){return;}
		$.ajax({
			url: '/update_parent_children',
			method: "POST",
			data: {
				parent_id: parseInt(parent_id),
				item_id: parseInt(child_id),
			},
			success: function(){
				$('#item_'.child_id).attr('data-parent-id',parent_id);
			}
		});
	};

	// Expand branch: Get children via ajax and display
	// @input: an input[type=checkbox] element
	var expandBranch = function(element){
		var toPrepend = $(element).siblings('ul.children');
		if (toPrepend.length === 0){
			$(element).parent().append('<ul class="children"></ul>');
		}
		toPrepend = $(element).siblings('ul.children');
		if(toPrepend.text().trim() === ''){ // Only fill in if the branch has not been filled
			var item_id = $(element).attr('data-item-id');
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
				        if(data!==undefined){
				        	// To-do: Refactor code to render this from partial _item

				        	// @input: an input[type=checkbox] element
				        	var thisItemId = $(element).attr('data-item-id');
				        	data.forEach(function(item){
				        		children_html += "<li class=\"item\" data-item-id=\"" + item.id + "\" data-parent-id=\"" + thisItemId +  "\" id=\"item_" + item.id + "\"><i class=\"fa fa-bars mover\" aria-hidden=\"true\"></i>";
				        		children_html += (item.has_children)? "<input type=\"checkbox\" data-item-id=\"" + item.id + "\" data-parent-id=\"" + thisItemId +  "\" id=\"c" + item.id + "\"><label class=\"expander\" for=\"c" + item.id + "\"></label>":"";
								children_html += 
										"<div class=\"tree_label item-name\" data-item-id=\"" + item.id + "\" data-name=\"name\" data-parent-id=\"" + thisItemId +  "\" contenteditable=\"true\">" + item.name + "</div>\
										<ul class=\"children\"  id=\"sortable\"></ul>";
				        		children_html+="</li>";
					        });
				        }
						toPrepend.prepend(children_html);
						loader.removeClass('enabled'); // Hide loader
						expandToggle(item_id, 1);
		            }
		        });
			}
		}
	};

	// Toggle expand/collapse state in DB
	// Note: (Future direction) Move to save expand-collapse state every 30s/60s instead of save on change to save number of requests to server
	var expandToggle = function(item_id, state){
		$.ajax({
			method: "POST",
			url: "/update_expand_collapse",
			data: {
				item_id: item_id,
				value: state
			}
		});
	};

	// Update order index of items
    // @input: li ement
	var reorder = function(element){
    	// get prev & next item's ordering
		var itemId = element.attr('data-item-id');
		var prevItem = element.prev('li');
		var nextItem = element.next('li');
		
		var prevItemId = (prevItem.length === 0) ? null:prevItem.attr('data-item-id');
    	var nextItemId = (nextItem.length === 0) ? null:nextItem.attr('data-item-id');

    	$.ajax({
			url: '/update_order_index',
			method: "POST",
			data: {
				item_id: itemId,
				next_item_id: nextItemId,
				prev_item_id: prevItemId,
			}
    	});
	};

	// Filter and Tags
	// Tags
	var selectedTagIds = [];
	$('.tags.sidebar').on('click', '.tag', function(){
		var tagId = parseInt($(this).attr('data-tagid')),
			projectId = $('div.tree.active').attr('data-project-id');
		if (!$(this).hasClass('highlight')){
			$(this).addClass('highlight delete');
			selectedTagIds.push(tagId);			
		} else {
			$(this).removeClass('highlight');
			var index = selectedTagIds.indexOf(tagId);
			if (index > -1) {
				selectedTagIds.splice(index,1);
			}
		}

		if (selectedTagIds.length !== 0){
			loader.addClass('enabled'); // Hide loader
			redrawTreeWithNewTag(selectedTagIds, projectId);
		} else {
			$('div.tree.active > ul.tree > .root > ul.children').html(originalTreeHtml);
		}
	});

	// Redraw $('.root > ul.children') with new tree including only
	// items with selected tags
	var redrawTreeWithNewTag = function(selectedTagIds, projectId){
		// Create a hash for the selection
		var hash = selectedTagIds.sort().toString(); // simple hash function

		if (localCacheTagTree[hash] !== undefined){
			loader.removeClass('enabled'); // Hide loader
			$('.root > ul.children').html(localCacheTagTree[hash]);
		}
		else{
			$.ajax({
				method: "GET",
				url: "/get_item_from_tag",
				// contentType: "application/json; charset=utf-8",
	            // dataType: 'json',
	            data: {
	            	tag_ids: selectedTagIds,
	            	project_id: projectId
	            },
				success: function(html){
					loader.removeClass('enabled'); // Hide loader
					$('div.tree.active > ul.tree > .root > ul.children').html(html);
					localCacheTagTree[hash] = html;
				}
			});
		}
	};


	// Tabs
	var tabApp = tabApp || {};

	tabApp.activeProjects = {};

	tabApp.highlightFirstTab = function(){
		var activeClass = "active",
			$tabs = $('.sublime-tabs__tab:not(.new-tab)'),
			$projects = $('div.tree');
		$tabs.first().addClass(activeClass);
		$projects.first().addClass(activeClass);
	};
				
	tabApp.titleFocusOut = function(e){
		$('.title-menu').on('focusout', '.project-title', function(){
			var $title = $('.project-title'),
				projectName = $title.text(),
				dataId = $title.attr('data-project-id'),
				dataName = $title.attr('data-project-name'),
				$project = $('div.tree.active'),
				$dropdownItems = $('.project-dropdown-item:not(.new-tab)');
			// Create new project
			if (dataId === undefined || dataId.indexOf('temp') !== -1){
				if (projectName.length !== 0){
					$.ajax({
						method: "POST",
						url: "/create_project",
						data: {
							project_name: projectName
						},
						success: function(json){
							$title.attr('data-project-id', json.id);
							var html = '<li class="project-dropdown-item" data-project-id="' + json.id + '"><a href="#">' + projectName + '</a></li>';
							$dropdownItems.last().after(html);
							tabApp.activeProjects[json.id] = $project;
							$('.sublime-tabs__tab.active, div.tree.active').attr('data-project-id',json.id);
						}
					});
					$title.attr('data-project-name', projectName);
					$('.sublime-tabs__tab.active>a').text(projectName);
					
				}
			}
			// Modify one
			else {
				if (projectName !== dataName){
					$.ajax({
						method: "POST",
						url: "/update_project",
						data: { 
							project_name: projectName,
							project_id: dataId
						},
						success: function(){
							$title.attr('data-project-name', projectName);
							$dropdownItems.filter('[data-project-id=' + dataId + ']').text(projectName);
							$('.sublime-tabs__tab.active').text(projectName);
						}
					});
				}
			}
		});
	};

	tabApp.tabify = function() {
		var activeClass = 'active',
			// $tabContainer = $('.sublime-tabs'),
			$tabs = $('.sublime-tabs__tab:not(.new-tab)'),
			$links = $('.sublime-tabs__link'),
			$projects = $('div.tree'),
			$closeBtn = $('.sublime-tabs__tab i.close-tab'),
			$newTab = $('.new-tab'),
			$newTabTab = $('.sublime-tabs__tab.new-tab'),
			$pageArea = $('.page-content-wrapper'),
			$dropdownItems = $('.project-dropdown-item'),
			$deleteProject = $('.delete-project');

		$tabs.each( function(k, v) {
			var $thisTab = $(v),
				projectId = $thisTab.attr('data-project-id');
			tabApp.activeProjects[projectId] = $thisTab;
		});
		
		$tabs.on('click',function(e){
			var projectId = $(this).attr('data-project-id'),
				projectName = $(this).text().trim();
			var $selectedTab = $(this),
				$selectedProject = $projects.filter('[data-project-id=' + projectId + ']');
			
			// reverse the z-order
			$tabs.each( function(k, v) {
				$(v).css("z-index", $tabs.length - k);
			})
			.removeClass(activeClass);

			$selectedTab.addClass(activeClass)
			.css("z-index", $tabs.length + 1 );

			$projects.removeClass(activeClass);
			$selectedProject.addClass(activeClass);
			$('.project-title').text(projectName);
			$('.project-title').attr('data-project-id', projectId);
			$('.project-title').attr('data-project-name', projectName);
			originalTreeHtml = $selectedProject.find('.root > ul.children').html();

			// Update the updated_at (to be sorted by)
			$.ajax({
				method: "POST",
				url: "/update_project",
				data: { 
					project_id: projectId,
					switched: 1
				},
			});
		});

		$newTab.on('click', function(e){
			if ($(this).hasClass('project-dropdown-item')){
				$('.dropdown-toggle').dropdown('toggle');
			}

			// Remove highlight from current tab			
			$tabs.each( function(k, v) {
				$(v).css("z-index", $tabs.length - k);
			})
			.removeClass(activeClass);
			$projects = $('div.tree'); // refresh
			$projects.removeClass(activeClass);

			// Add new tab
			var newTabHtml = "<li class=\"sublime-tabs__tab active\" data-project-id='temp_" + ($tabs.length + 1000) + "'>\
			        <a href=\"#\" class=\"sublime-tabs__link\">Untitled</a>\
			        <i class=\"fa fa-times close-tab\" aria-hidden=\"true\"></i>\
			      </li>";
			$newTabTab.before(newTabHtml);
			$tabs = $('.sublime-tabs__tab:not(.new-tab)'); // refresh tab list

			// Create new tree (tab content)
			var $newTree = $('.tree').first().clone();
			$newTree.find('li.root > ul.children').empty();
			$newTree.addClass(activeClass).css("z-index", $tabs.length + 2 );
			$newTree.attr('data-project-id', "temp_" + ($tabs.length + 1000 - 1));
			$newTree.find('ul.children').append('\
				<li class="item">\
					<div class="tree_label item-name first-item-placeholder" placeholder="Click to input your first item" contenteditable="true" data-name="name"></div>\
				</li>');

			// Add new tree (tab content)
			$projects.last().after($newTree);
			$newlyCreatedItem = $newTree.find('div.tree_label');
			$('.project-title')
				.text('')
				.attr('data-project-id', null)
				.focus();
			
			focusContentEditable($newlyCreatedItem);
			dragnDrop();
			tabApp.tabify(); // make new tab clickable
			e.stopImmediatePropagation(); // prevent event bubbling due to previous tabify() call
		});
		
		$closeBtn.on('click', function(){
			if ($tabs.length == 1){
				$('sublime-tabs__tab new-tab').trigger('click');
			}
			var $thisTab = $(this).parent('.sublime-tabs__tab');
			var activeProjectId =  $thisTab.attr('data-project-id');
			$('.tree[data-project-id=' + activeProjectId + ']').remove();
			if ($thisTab.hasClass(activeClass)){ // if close an active tab
				if ($thisTab.next().length === 0){
					$triggerTab = $thisTab.prev(); // then display its prev tab
				} else {
					$triggerTab = $thisTab.next(); // then display its prev tab
				}
				$triggerTab.click();
				// $triggerTab.addClass(activeClass);
				// var triggerProjectId = $triggerTab.attr('data-project-id');
				// $('.tree[data-project-id=' + triggerProjectId + ']').addClass(activeClass);
			}
			$.ajax({
				method: "POST",
				url: "/update_project",
				data: { 
					project_id: activeProjectId,
					active: 0
				},
			});
			$thisTab.remove();
			delete tabApp.activeProjects[activeProjectId];
		});

		$deleteProject.on('click', function(){
			$('#dialog-delete-project').dialog("open");
		});

		var deleteProject = function(projectId){
			$.ajax({
				method: "POST",
				url: "/delete_project",
				data: {project_id: projectId}
			});
		};

		$('#dialog-delete-project').dialog({
			resizable: false,
			autoOpen: false,
			modal: true,
			buttons: {
				"Delete": function() {
					$( this ).dialog( "close" );
					var projectId = $('div.tree.active').attr('data-project-id');
					$('.sublime-tabs__tab.active i.close-tab').click();
					deleteProject(projectId);
					$('.project-dropdown-item[data-project-id=' + projectId + ']').remove();
				},
				"Cancel": function() {
					$( this ).dialog( "close" );
				}
			}
		});
	};

	tabApp.dropdown = function(){
		var activeClass = 'active',
			$tabs = $('.sublime-tabs__tab:not(.new-tab)'),
			$projects = $('div.tree'),
			$newTabTab = $('.sublime-tabs__tab.new-tab');

		$('.dropdown-menu').on('click', '.project-dropdown-item', function(e){
			var projectId = $(this).attr('data-project-id'),
				projectName = $(this).text();
			if (tabApp.activeProjects[projectId] !== undefined){
				// This project is opened, switch to it
				$('.sublime-tabs__tab[data-project-id=' + projectId + ']').click();
			}
			else {
				// This project is not opened, open it as a new tab
				$.ajax({
					method: "GET",
					url: "/get_project_html",
					data: { project_id: projectId },
					success: function(html){
						$projects.last().after(html);
						// Remove highlight from current tabs
						$tabs = $('.sublime-tabs__tab:not(.new-tab)');
						$tabs.each( function(k, v) {
							$(v).css("z-index", $tabs.length - k);
						})
						.removeClass(activeClass);
						$projects = $('div.tree'); // refresh
						$projects.removeClass(activeClass);
						$projects.last().addClass(activeClass);

						// Add new tab
						var newTabHtml = "<li class=\"sublime-tabs__tab active\" data-project-id=\"" + projectId + "\">\
						        <a href=\"#\" class=\"sublime-tabs__link\" >" + projectName + "</a>\
						        <i class=\"fa fa-times close-tab\" aria-hidden=\"true\"></i>\
						      </li>";
						$newTabTab.before(newTabHtml);
						// $tabs = $('.sublime-tabs__tab:not(.new-tab)'); // refresh tab list
						$newlyCreatedItem = $projects.last().find('div.tree_label');

						focusContentEditable($newlyCreatedItem);
						dragnDrop();
						tabApp.tabify(); // make new tab clickable
						e.stopImmediatePropagation(); // prevent event bubbling due to previous tabify() call
					}
				});
			}
		});
	};

	tabApp.highlightFirstTab();
	tabApp.tabify();
	tabApp.dropdown();
	tabApp.titleFocusOut();
   
	// END HELPER FUNCTIONS ==============================================
});



var activateTags = function(){
	$('.tags:not(.sidebar)').on('mouseover','div.tag', function(e){
		$(this).children('.delete-tag').show();
	}).on('mouseleave','.tag', function(e){
		$(this).children('.delete-tag').hide();
	});
	$('.tags:not(.sidebar)').on('click','i.delete-tag', function(){
		var tag_id = $(this).parent('.tag').attr('data-tagid');
		var item_id = $(this).parent('.tag').parent('.tag-area').parent('.tags').attr('data-item-id');
		if (tag_id !== undefined && item_id !== undefined) deleteTag(tag_id, item_id);
		$(this).parent('.tag').remove();
	});
	var tagsAll = [];
	$.ajax({
		method: "GET",
		url: "/get_all_tags",
		success: function(tagArray){
			// This is fine for now with small number of tags
			// Future: Update this result array with every input key
			tagsAll = tagArray;
			$('.tags input').typeahead({
				source: tagArray,
				displayText: function(item){ 
					return item;}
			});
		}
	});
	

	$(document).on('keyup', '.tags input', function (e) {
		var key = e.keyCode || e.which;
        if (key === 13 || key === 188) { // Return-Enter key || comma key
        	var text = $(this).val().replace(',', '');
        	if (text !== '') {
                $('.tags input').before('<div class=\'tag\'>' + text + '<i class="fa fa-times delete-tag" aria-hidden="true"></i></div>');
                var item_id = $(this).parent('.tags').attr('data-item-id');

                createTag(item_id, text);
                $(this).val(''); // empty input field
            }
        } else if (key === 8) { // Delete-Backspace key
            if ($(this).val() === '') {
            	var prevTag = $(this).prev('.tag-area').find('.tag:last-child');
            	if (prevTag.length !== 0){
                	if (prevTag.hasClass('highlight delete')){
                		prevTag.remove();
                		var tag_id = prevTag.attr('data-tagid');
                		if (tag_id !== undefined) deleteTag(tag_id, $(this).parent('.tags').attr('data-item-id'));
                	}
                	else{
                		prevTag.addClass('highlight delete');	
                	}
                }
            }
        }
        else if (key === 27){ // undo delete
        	if ($(this).val() === '') {
            	var prevTag = $(this).prev('.tag');
                if (prevTag.length !== 0){
                	if (prevTag.hasClass('highlight')){
                		prevTag.removeClass('highlight');
                	}
                }
            }
        }
    });
};

var createTag = function(item_id, text){
	$.ajax({
		url: '/create_tag',
		method: 'POST',
		data: {
			item_id: item_id,
			tag_name: text
		},
		success: function(tag_id){
			if (tag_id !== undefined){
				$('.object-editor .tags tag:last-child').attr('data-tagid',tag_id);
			}
			purgeTagCache(tag_id);
		}
	});
};

var deleteTag = function(tag_id, item_id){
	$.ajax({
		url: '/delete_tag',
		method: 'POST',
		data: {
			tag_id: tag_id,
			item_id: item_id
		}, 
		success: function(){
			purgeTagCache(tag_id);
		}
	});
};

var purgeTagCache = function(tag_id){
	Object.keys(localCacheTagTree).forEach(function(key){
		if (key.split(",").indexOf(tag_id) !== -1){
			delete localCacheTagTree[key];
		}
	});
};