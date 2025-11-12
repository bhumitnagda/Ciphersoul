import React, { useState, useEffect } from "react";
import api from "../services/api";

const CategoryManager = ({ onCategorySelect }) => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name: "",
    color: "#808080",
    icon: "📁",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const createCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/categories", newCategory);
      setCategories([...categories, response.data]);
      setNewCategory({ name: "", color: "#808080", icon: "📁" });
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  return (
    <div className="category-manager">
      <h3>Categories</h3>

      <form onSubmit={createCategory} className="category-form">
        <input
          type="text"
          placeholder="New Category Name"
          value={newCategory.name}
          onChange={(e) =>
            setNewCategory({ ...newCategory, name: e.target.value })
          }
        />
        <input
          type="color"
          value={newCategory.color}
          onChange={(e) =>
            setNewCategory({ ...newCategory, color: e.target.value })
          }
        />
        <button type="submit">Add Category</button>
      </form>

      <div className="categories-list">
        {categories.map((category) => (
          <div
            key={category._id}
            className="category-item"
            onClick={() => onCategorySelect(category._id)}
            style={{ backgroundColor: category.color }}
          >
            <span>{category.icon}</span>
            {category.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;
