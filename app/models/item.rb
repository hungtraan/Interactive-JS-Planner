class Item < ActiveRecord::Base
	# If want to create separate child-parent relationship table:
	# Refer to: http://cobwwweb.com/a-has-many-relationship-within-a-single-model-in-rails
	has_many :children, :class_name => "Item", :foreign_key => "parent_id"
	belongs_to :parent, :class_name => "Item"

	validates :name, presence: true, length: { minimum: 1, maximum: 255  }
	
	def parentName
	  # it may not have a parent
	  parent.try(:name)
	end

	# Returns array of parents of an item in elderly order
	def getBreadcrumbParents
		parents_arr = []
		runner = self
		while runner.hasParent?
			parents_arr.unshift(runner.parent) # push item at beginning of array
			runner = runner.parent
		end
		return parents_arr
	end

	# Returns all child items
	def getChildren
		childrenArr = self.children.order(order_index: :asc)
		children = []
		childrenArr.each do |child|
			# children[child.id] = {
			childObj = {
				:id => child.id,
				:name => child.name,
				:has_children => child.hasChildren?
			}
			children.push(childObj)
		end
		return children
	end

	# Add children to a parent item
	# @input array of children's id
	def addChildren(array)
		array.each do |children_id|
			Item.find(children_id).setParent(self.id)
		end
	end

	# Update parent item of the target item
	def setParent(pid)
		if self.parent_id != pid
			self.parent_id=pid
			if pid == nil || pid == '' || pid == 0
				self.parent_name = nil
			elsif Item.exists?(pid)
				self.parent_name = Item.find(pid).name
			end
			self.save
		end
	end

	def hasParent?
	  parent.present?
	end

	def hasChildren?
	  children.exists?
	end

end
