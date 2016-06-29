class OnepageController < ApplicationController

	def index
		@itemsWithNoParent = Item.where(parent_id: [nil, 0]).order(order_index: :asc)
	end

	def getChildren
		# Get time frame from POST request
        itemId = params[:item_id]
        thisItem = Item.find(itemId)
		children_arr = thisItem.getChildren
        
        response = children_arr

        respond_to do |format|
          format.json {
            render :json => response
          }
        end
	end

	def getDetail
		itemId = params[:item_id]
		thisItem = Item.find(itemId)
		breadcrumbParents = thisItem.getBreadcrumbParents
		response = []
		response.push(thisItem)
		response.push(breadcrumbParents)
		# p response
		respond_to do |format|
          format.json {
            render :json => response
          }
        end
    end

	def updateIndividualDetail
		itemId = params[:item_id]
		detail = params[:detail]
		val = params[:value]
		if Item.exists?(itemId)
			itemToUpdate = Item.find(itemId)

			if itemToUpdate && itemToUpdate[detail] != val
				itemToUpdate[detail] = val
				itemToUpdate.save
			end
		end
		

		head 200, content_type: "text/html"
	end

	def createItem
		itemName = params[:item_name]

		# Calculate order index, only within its parent
		# prevId and nextId is passed from js, so it's already inside the parent
		prevId = params[:prev_item_id]
		nextId = params[:next_item_id]
		prevItem = (Item.exists?(prevId) && prevId != '')? Item.find(params[:prev_item_id]): nil
		nextItem = (Item.exists?(nextId) && nextId != '')? Item.find(params[:next_item_id]): nil
		orderIndex = self.calculateOrder(prevItem, nextItem)

		if params[:parent_id] != ''
			parentId = params[:parent_id]
			if Item.exists?(parentId) && parentId
				parentName = Item.find(parentId).name
				newItem = Item.new(:name => itemName, :parent_id => parentId, :parent_name => parentName, :order_index => orderIndex)
				newItem.save
			end
		else
			newItem = Item.new(:name => itemName, :order_index => orderIndex)
			newItem.save
		end
		respond_to do |format|
			format.json {
				render :json => newItem
          }
        end
		# head 200, content_type: "text/html"
	end

	# @input: 2 item objects, could be nil
	def calculateOrder(prevItem, nextItem)
		prevOrderIndex = (prevItem == nil)? nil : prevItem.order_index
		nextOrderIndex = (nextItem == nil)? nil : nextItem.order_index
		
		step = 2**16 # ==> it takes at least 17 consecutive worst-case moves to get to 1
		
		if prevOrderIndex == nil && nextOrderIndex == nil # only child of parent item
			return step
		elsif prevOrderIndex == nil # insert into first child of parent
			# nextOrderIndex != 0
			return nextOrderIndex/2
		elsif nextOrderIndex == nil # last child
			return prevOrderIndex + step
		else # both order_index are available
			return (prevOrderIndex + nextOrderIndex)/2
			# Note: order_index is float, so we have to update this ordering very infrequently
			# float is 32-bit, so for now the prototype will not take care 
			# of reindexing in case of collision 
		end
	end

	# Calculate order index, only within its parent
	def updateOrderIndex
		# prevId and nextId is passed from js, so it's already inside the parent
		itemId = params[:item_id]
		prevId = params[:prev_item_id]
		nextId = params[:next_item_id]
		prevItem = (prevId != '' && Item.exists?(prevId))? Item.find(params[:prev_item_id]): nil
		nextItem = (nextId != '' && Item.exists?(nextId))? Item.find(params[:next_item_id]): nil
		orderIndex = self.calculateOrder(prevItem, nextItem)

		# TO-DO: Actually updating order index of items
		item = Item.find(itemId)
		item.order_index = orderIndex
		item.save
		head 200, content_type: "text/html"
	end

	def deleteItem
		itemId = params[:item_id]
		if itemId != nil || itemId != ''
			if Item.exists?(itemId)
				puts itemId
				Item.destroy(itemId)
			end
		end
		head 200, content_type: "text/html"
	end

	def updateParentChildren
		itemId = params[:item_id]
		parentId = params[:parent_id]
		if Item.exists?(itemId)
			item = Item.find(itemId)
			item.setParent(parentId) # setParent method handles parentId = nil
		end
		head 200, content_type: "text/html"
	end	

	def expandToggle
		itemId = params[:item_id]
		val = params[:value]
		if Item.exists?(itemId)
			item = Item.find(itemId)
			if item.expanded != val
				item.expanded = val
				item.save
			end
		end
		head 200, content_type: "text/html"
	end

end
