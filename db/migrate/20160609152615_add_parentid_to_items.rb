class AddParentidToItems < ActiveRecord::Migration
  def change
    add_column :items, :parent_id, :integer
  end
end
