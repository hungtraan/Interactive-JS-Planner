class AddProjectRefToItems < ActiveRecord::Migration
  def change
    add_reference :items, :project, index: true, foreign_key: true
  end
end
