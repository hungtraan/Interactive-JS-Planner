# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20160705181254) do

  create_table "items", force: :cascade do |t|
    t.string   "name",        limit: 255
    t.string   "parent_name", limit: 255
    t.text     "description", limit: 65535
    t.integer  "by",          limit: 4
    t.string   "by_name",     limit: 255
    t.datetime "created_at",                null: false
    t.datetime "updated_at",                null: false
    t.integer  "parent_id",   limit: 4
    t.float    "order_index", limit: 24
    t.integer  "expanded",    limit: 1
    t.integer  "project_id",  limit: 4
  end

  add_index "items", ["project_id"], name: "index_items_on_project_id", using: :btree

  create_table "items_tags", id: false, force: :cascade do |t|
    t.integer "item_id", limit: 4, null: false
    t.integer "tag_id",  limit: 4, null: false
  end

  create_table "projects", force: :cascade do |t|
    t.string   "name",       limit: 255
    t.integer  "owner",      limit: 4
    t.datetime "created_at",             null: false
    t.datetime "updated_at",             null: false
    t.integer  "active",     limit: 1
  end

  create_table "tags", force: :cascade do |t|
    t.string   "tag",        limit: 255
    t.datetime "created_at",             null: false
    t.datetime "updated_at",             null: false
  end

  add_foreign_key "items", "projects"
end
