class OnepageController < ApplicationController

	def index
		@itemsWithNoParent = Item.where(parent_id: nil)
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

	
end
