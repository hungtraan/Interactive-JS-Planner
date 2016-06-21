class AddOrderIndexToItems < ActiveRecord::Migration
  def change
    add_column :items, :order_index, :float
  end
end
