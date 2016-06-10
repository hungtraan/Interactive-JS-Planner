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
		response = thisItem
		respond_to do |format|
          format.json {
            render :json => response
          }
        end
    end
    
	def updateDetail
	end

	
end
