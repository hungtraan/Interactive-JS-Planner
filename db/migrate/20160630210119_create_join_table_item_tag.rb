class CreateJoinTableItemTag < ActiveRecord::Migration
  def change
    create_join_table :items, :tags do |t|
      # t.index [:item_id, :tag_id]
      # t.index [:tag_id, :item_id]
    end
  end
end
