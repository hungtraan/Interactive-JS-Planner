class AddActiveToProjects < ActiveRecord::Migration
  def change
    add_column :projects, :active, :integer, :limit => 1
  end
end
