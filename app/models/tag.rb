class Tag < ActiveRecord::Base
	# belongs_to :item
	# has_many :item
	has_and_belongs_to_many :item
	validates :tag, presence: true, length: { minimum: 1, maximum: 255  }
end
