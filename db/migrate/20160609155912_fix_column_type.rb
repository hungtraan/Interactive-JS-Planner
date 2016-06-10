class FixColumnType < ActiveRecord::Migration
  def self.up
    change_column :items, :parent_name, :integer
  end
  def self.down
    change_column :items, :parent_name, :string
  end
end
