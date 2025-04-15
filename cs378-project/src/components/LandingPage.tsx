"use client";
import { useState } from "react";
import styles from "./LandingPage.module.css";
// import recipeData from "../../demo_recipes.json";
import AddRecipeModal from "./AddRecipeModal";

interface HomeRecipe {
  recipeName: string;
  coverImage: string;
}

interface LandingPageProps {
  recipes: HomeRecipe[]; 
  onSelectRecipe: (recipeName: string, coverImage:string) => void;
}


// Remove DemoRecipe, DemoRecipes interfaces if no longer needed here
// Remove transformData function if no longer needed here

export default function LandingPage({ recipes, onSelectRecipe }: LandingPageProps) {
  const [showModal, setShowModal] = useState(false);

  // Function to handle successful recipe addition (optional)
  const handleRecipeAdded = () => {
      setShowModal(false);
      // Potentially trigger a data refresh on the parent page
      // For now, just close the modal. A full refresh might be needed
      // Or the parent page could refetch data when the modal closes.
      // Consider adding an `onRecipeAdded` prop callback if needed.
       window.location.reload(); // Simple way to refresh data, but not ideal UX
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>AL DENTE</h1>
      </div>
      <div className={styles.uploadPill} onClick={() => setShowModal(true)}>
        <span>Upload custom recipe</span>
        <span className={styles.arrow}>↑</span>
      </div>
      {showModal && <AddRecipeModal onClose={handleRecipeAdded} />}
      
      <div className={styles.content}>
        {recipes.map(({ recipeName, coverImage }) => (
          <button
            key={recipeName}
            className={styles.button}
            onClick={() => onSelectRecipe(recipeName, coverImage)}
          >
            <div className={styles.imageWrapper}>
              <img
                src={coverImage}
                alt={recipeName}
                className={styles.recipeImage}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/placeholder.jpg";
                  target.alt = `${recipeName} (Image not found)`;
                }}
              />
            </div>
            <span>{recipeName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
