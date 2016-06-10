class FixColumnName < ActiveRecord::Migration
  def change
    rename_column :items, :parent, :parent_name
  end
end
