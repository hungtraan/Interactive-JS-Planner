class AddExpandedToItems < ActiveRecord::Migration
  def change
    add_column :items, :expanded, :integer, :limit => 1
  end
end
