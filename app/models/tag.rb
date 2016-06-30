class Tag < ActiveRecord::Base
	belongs_to :item
	has_many :item
	validates :tag, presence: true, length: { minimum: 1, maximum: 255  }
	validates :item_id, presence: true
	
end
