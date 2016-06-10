class CreateItems < ActiveRecord::Migration
  def change
    create_table :items do |t|
      t.string :name
      t.integer :parent
      t.text :description
      t.integer :by
      t.string :by_name

      t.timestamps null: false
    end
  end
end
