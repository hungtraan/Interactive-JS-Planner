class Item < ActiveRecord::Base
	has_many :children, :class_name => "Item", :foreign_key => "parent_id"
	belongs_to :parent, :class_name => "Item"

	validates :name, presence: true, length: { minimum: 3, maximum: 255  }
	
	def parent_name
	  # it may not have a parent
	  parent.try(:name)
	end

	def getBreadcrumbParents
		parents_arr = []
		runner = self
		while runner.has_parent?
			parents_arr.unshift(runner.parent) # push item at beginning of array
			runner = runner.parent
		end
		return parents_arr
	end

	def getChildren
		childrenArr = self.children
		children = []
		childrenArr.each do |child|
			# children[child.id] = {
			childObj = {
				:id => child.id,
				:name => child.name,
				:has_children => child.has_children?
			}
			children.push(childObj)
		end
		return children
	end

	def set_parent(pid)
		self.parent_id=pid
		self.parent_name = Item.find(pid).name
		self.save
	end

	def add_children(array)
		array.each do |children_id|
			Item.find(children_id).set_parent(self.id)
		end
	end

	def has_parent?
	  parent.present?
	end

	def has_children?
	  children.exists?
	end

end
