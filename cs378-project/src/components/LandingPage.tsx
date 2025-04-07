"use client";
import { useState } from "react";
import styles from "./LandingPage.module.css";
// import recipeData from "../../demo_recipes.json";
import AddRecipeModal from "./AddRecipeModal";

interface LandingPageProps {
  recipeNames: string[]; // Accept list of names as props
  onSelectRecipe: (recipeName: string) => void;
}

// Remove DemoRecipe, DemoRecipes interfaces if no longer needed here
// Remove transformData function if no longer needed here

export default function LandingPage({ recipeNames, onSelectRecipe }: LandingPageProps) {
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
      {/* Pass the callback to the modal */}
      {showModal && <AddRecipeModal onClose={handleRecipeAdded} />}
      <div className={styles.content}>
        {recipeNames.map((recipeName) => { // Use recipeNames from props
          const formattedRecipe = recipeName.toLowerCase().replace(/\s+/g, "_");
          // TODO: Image paths will need handling if they are part of the dynamic data
          // or stored elsewhere. For now, it might break for new recipes.
          const imageUrl = `./images/${formattedRecipe}/cover_photo.jpg`;

          return (
            <button
              key={recipeName}
              className={styles.button}
              onClick={() => onSelectRecipe(recipeName)}
            >
              <div className={styles.imageWrapper}>
                <img
                  src={imageUrl}
                  alt={recipeName}
                  className={styles.recipeImage}
                  onError={(e) => { // Basic fallback if image fails
                      const target = e.target as HTMLImageElement;
                      target.src = './images/placeholder.jpg'; // Provide a placeholder image path
                      target.alt = `${recipeName} (Image not found)`;
                   }}
                />
              </div>
              <span>{recipeName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
