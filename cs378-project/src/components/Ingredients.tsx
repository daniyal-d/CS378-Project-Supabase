"use client";
import React, { useState, useEffect } from "react";
import styles from "./Ingredients.module.css";
import { FaRegStar, FaStar } from "react-icons/fa";

// Helper function to format the adjusted number
const formatAdjustedNumber = (num: number): string => {
    if (isNaN(num)) return "NaN";
    if (num === 0) return "0";

    // Use a small val for float comparisons
    const precision = 10000;
    const roundedNum = Math.round(num * precision) / precision;

    const floor = Math.floor(roundedNum);
    const remainder = roundedNum - floor;

    let fractionStr = "";

    // Check for common fractions, rn im checking for something like "1/2" instead of "½"
    // The latter (½) is called a vulgar function and more memory efficient
    // It's better to account for that instead, but I didn't think about that when I started haha
    if (Math.abs(remainder) < 1 / precision) fractionStr = ""; // It's an integer
    else if (Math.abs(remainder - 1/2) < 1 / precision) fractionStr = "1/2";
    else if (Math.abs(remainder - 1/4) < 1 / precision) fractionStr = "1/4";
    else if (Math.abs(remainder - 3/4) < 1 / precision) fractionStr = "3/4";
    else if (Math.abs(remainder - 1/3) < 1 / precision) fractionStr = "1/3";
    else if (Math.abs(remainder - 2/3) < 1 / precision) fractionStr = "2/3";
    else if (Math.abs(remainder - 1/8) < 1 / precision) fractionStr = "1/8";
    else if (Math.abs(remainder - 3/8) < 1 / precision) fractionStr = "3/8";
    else if (Math.abs(remainder - 5/8) < 1 / precision) fractionStr = "5/8";
    else if (Math.abs(remainder - 7/8) < 1 / precision) fractionStr = "7/8";
    // Honestly idk if this is the best way to do this, but it works for now

    if (fractionStr) {
        // Return mixed number or just the fraction
        return floor > 0 ? `${floor} ${fractionStr}` : fractionStr;
    } else if (remainder === 0) {
        // Return just the integer part
        return floor.toString();
    } else {
        // Fallback to decimal if no common fraction matches
        return roundedNum.toFixed(1);
    }
};

// Updated Helper function to parse and adjust quantity, handling fractions
const adjustQuantity = (quantity: string | undefined, ratio: number): string => {
    if (!quantity) return "";

    // Regex captures:
    // 1. Mixed fraction (whole num, numerator, denominator)
    // 2. Simple fraction (numerator, denominator)
    // 3. Decimal or Integer
    // 4. Any sequence of non-numeric, non-whitespace, non-slash characters (units, words like 'to')
    // 5. Whitespace
    // 6. Slash (to preserve it if it's not part of a matched fraction)
    const pattern = /(\d+)\s+(\d+)\/(\d+)|(\d+)\/(\d+)|(\d*\.?\d+)|([^\d\s\/]+)|(\s+)|(\/)/g;

    let result = "";
    let match;

    while ((match = pattern.exec(quantity)) !== null) {
        const [
            fullMatch,
            whole, num1, den1, // Group 1: Mixed fraction
            num2, den2,       // Group 2: Simple fraction
            basicNum,         // Group 3: Basic number
            otherText,        // Group 4: Unit/Word
            whitespace,       // Group 5: Whitespace
            slash             // Group 6: Slash
        ] = match;

        let value = NaN;

        if (whole && num1 && den1) { // Matched mixed fraction
            value = parseInt(whole, 10) + parseInt(num1, 10) / parseInt(den1, 10);
        } else if (num2 && den2) { // Matched simple fraction
            value = parseInt(num2, 10) / parseInt(den2, 10);
        } else if (basicNum) { // Matched basic number
            value = parseFloat(basicNum);
        }

        if (!isNaN(value)) { // If it was a numeric part
            const adjustedValue = value * ratio;
            result += formatAdjustedNumber(adjustedValue);
        } else if (otherText) { // Append non-numeric text
            result += otherText;
        } else if (whitespace) { // Append whitespace
            result += whitespace;
        } else if (slash) { // Append slash if captured separately
             result += slash;
        } else {
             // Fallback if something unexpected matched (shouldn't normally happen)
             result += fullMatch;
        }
    }

    // Handle cases where the regex might fail or the input was non-standard
    if (result === "" && quantity !== "") {
         console.warn("adjustQuantity parsing might have failed for:", quantity);
         return quantity; // Return original as a safe fallback
    }

    return result; // Don't trim here, preserve internal spaces like "1 1/2 cups"
};

interface IngredientSubstitution {
  substitution: string;
}

interface DemoIngredient {
  item: string;
  quantity?: string;
  substitutions?: IngredientSubstitution[];
}

interface Recipe {
  name: string;
  serving_size: number;
  ingredients: DemoIngredient[];
  steps?: unknown[];
}

interface IngredientAlternative {
    id: string;
    name: string;
    baseAmount: string;
    currentAmount: string;
    selected: boolean;
}

interface Ingredient {
  id: string;
  name: string;
  baseAmount: string;
  currentAmount: string;
  selected: boolean;
  alternatives?: IngredientAlternative[];
  showAlternatives?: boolean;
}

interface IngredientsProps {
  onContinueToInstructions: () => void;
  onBack: () => void;
  recipe: Recipe;
}

const Ingredients: React.FC<IngredientsProps> = ({ onContinueToInstructions, onBack, recipe }) => {
  const [baseIngredients, setBaseIngredients] = useState<Ingredient[]>([]);
  const [currentIngredients, setCurrentIngredients] = useState<Ingredient[]>([]);
  const [baseServingSize, setBaseServingSize] = useState<number>(1);
  const [currentServingSize, setCurrentServingSize] = useState<number>(1);
  const [servingInput, setServingInput] = useState<string>("1");

  const [showSettings, setShowSettings] = useState(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && recipe?.name) {
        const stored = localStorage.getItem(`isFavorite_${recipe.name}`);
        return stored ? JSON.parse(stored) : false;
    }
    return false;
  });

  useEffect(() => {
    if (!recipe) return;

    const initialIngredients = recipe.ingredients.map((item) => {
        const baseAmount = item.quantity ? `(${item.quantity})` : "";
        return {
            id: item.item.toLowerCase().replace(/\s/g, "-"),
            name: item.item,
            baseAmount: baseAmount,
            currentAmount: baseAmount,
            selected: false,
            alternatives: item.substitutions
                ? item.substitutions.map((sub) => {
                    const altBaseAmount = item.quantity ? `(${item.quantity})` : "";
                    return {
                        id: sub.substitution.toLowerCase().replace(/\s/g, "-"),
                        name: sub.substitution,
                        baseAmount: altBaseAmount,
                        currentAmount: altBaseAmount,
                        selected: false,
                    };
                })
                : [],
            showAlternatives: false,
        };
    });

    setBaseIngredients(initialIngredients);
    setCurrentIngredients(initialIngredients);
    const recipeServingSize = recipe.serving_size || 1;
    setBaseServingSize(recipeServingSize);
    setCurrentServingSize(recipeServingSize);
    setServingInput(recipeServingSize.toString());

    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`isFavorite_${recipe.name}`);
        setIsFavorite(stored ? JSON.parse(stored) : false);
    }

  }, [recipe]);

  useEffect(() => {
    if (baseIngredients.length === 0 || !recipe) return;

    const safeBaseServingSize = baseServingSize === 0 ? 1 : baseServingSize;
    const ratio = currentServingSize / safeBaseServingSize;

    const stripParens = (s: string) => s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1) : s;
    const addParens = (s: string) => s && s.trim() ? `(${s.trim()})` : "";

    setCurrentIngredients(prevCurrentIngredients =>
      baseIngredients.map(baseIng => {
          const prevIngState = prevCurrentIngredients.find(pi => pi.id === baseIng.id);

          const strippedBaseAmount = stripParens(baseIng.baseAmount);
          const adjustedAmountStr = adjustQuantity(strippedBaseAmount, ratio);
          const finalAmount = addParens(adjustedAmountStr);

          return {
            ...baseIng,
            selected: prevIngState?.selected ?? false,
            showAlternatives: prevIngState?.showAlternatives ?? false,
            currentAmount: finalAmount,
            alternatives: baseIng.alternatives?.map(baseAlt => {
                const prevAltState = prevIngState?.alternatives?.find(pa => pa.id === baseAlt.id);
                const strippedAltBaseAmount = stripParens(baseAlt.baseAmount);
                const adjustedAltAmountStr = adjustQuantity(strippedAltBaseAmount, ratio);
                const finalAltAmount = addParens(adjustedAltAmountStr);
                return {
                    ...baseAlt,
                    selected: prevAltState?.selected ?? false,
                    currentAmount: finalAltAmount,
                };
            }),
          };
      })
    );
  }, [currentServingSize, baseServingSize, baseIngredients, recipe]);

  const toggleIngredient = (id: string) => {
    setCurrentIngredients((prev) =>
      prev.map((ingredient) =>
        ingredient.id === id
          ? {
              ...ingredient,
              selected: !ingredient.selected,
              alternatives: ingredient.alternatives?.map((alt) => ({ ...alt, selected: false })),
            }
          : ingredient
      )
    );
  };

  const toggleAlternative = (ingredientId: string, alternativeId: string) => {
     setCurrentIngredients((prev) =>
      prev.map((ingredient) =>
        ingredient.id === ingredientId
          ? {
              ...ingredient,
              selected: false,
              alternatives: ingredient.alternatives?.map((alt) => ({
                ...alt,
                selected: alt.id === alternativeId ? !alt.selected : false,
              })),
            }
          : ingredient
      )
    );
  };

  const toggleDropdown = (id: string) => {
    setCurrentIngredients((prev) =>
      prev.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, showAlternatives: !ingredient.showAlternatives } : ingredient
      )
    );
  };

  const handleServingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;
      setServingInput(inputValue);

      const newSize = parseInt(inputValue, 10);

      if (!isNaN(newSize) && newSize >= 0) {
          setCurrentServingSize(newSize);
      } else if (inputValue === "" || isNaN(newSize)) {
           setCurrentServingSize(0);
      }
  };

  const adjustServingSize = (delta: number) => {
      const newNumericSize = Math.max(0, currentServingSize + delta);
      setCurrentServingSize(newNumericSize);
      setServingInput(newNumericSize.toString());
  };

  const handleBlurServingInput = (event: React.FocusEvent<HTMLInputElement>) => {
      const value = event.target.value;
       if (value === "" || isNaN(parseInt(value, 10)) || parseInt(value, 10) < 0) {
           setCurrentServingSize(baseServingSize);
           setServingInput(baseServingSize.toString());
       } else {
           const numValue = parseInt(value, 10);
            if (!isNaN(numValue)) {
               setServingInput(numValue.toString());
               setCurrentServingSize(numValue);
           } else {
                setCurrentServingSize(baseServingSize);
                setServingInput(baseServingSize.toString());
           }
       }
   };

  const toggleFavorite = () => {
    if (!recipe?.name) return;
    const newFavorite = !isFavorite;
    setIsFavorite(newFavorite);
    if (typeof window !== 'undefined') {
        localStorage.setItem(`isFavorite_${recipe.name}`, JSON.stringify(newFavorite));
    }
  };

  if (!recipe) {
      return <div>Loading ingredients...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back to {recipe.name}
        </button>
        <button className={styles.settingsButton} onClick={() => setShowSettings(true)}>
          <svg viewBox="0 0 24 24" width="24" height="24" className={styles.settingsIcon}>
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
          </svg>
        </button>
      </div>

      <h1 className={styles.title}>Ingredients</h1>

      <div className={styles.servingControl}>
          <span className={styles.servingLabel}>Servings:</span>
          <button onClick={() => adjustServingSize(-1)} disabled={currentServingSize <= 0}>-</button>
          <input
              type="number"
              min="0"
              value={servingInput}
              onChange={handleServingChange}
              onBlur={handleBlurServingInput}
              className={styles.servingInput}
           />
          <button onClick={() => adjustServingSize(1)}>+</button>
      </div>

      <div className={styles.ingredientsList}>
        {currentIngredients.map((ingredient) => (
          <div key={ingredient.id} className={styles.ingredientWrapper}>
            <div className={styles.ingredientItem}>
              <label className={styles.ingredientLabel}>
                <input
                  type="checkbox"
                  checked={ingredient.selected}
                  onChange={() => toggleIngredient(ingredient.id)}
                  className={styles.checkbox}
                />
                <span className={styles.ingredientText}>
                  {ingredient.name} {ingredient.currentAmount}
                </span>
              </label>
              {ingredient.alternatives && ingredient.alternatives.length > 0 && (
                <button
                  className={`${styles.dropdownButton} ${
                    ingredient.showAlternatives ? styles.dropdownOpen : ''
                  }`}
                  onClick={() => toggleDropdown(ingredient.id)}
                >
                  {ingredient.showAlternatives ? '▼' : '►'}
                </button>
              )}
            </div>
            {ingredient.showAlternatives && ingredient.alternatives && (
              <div className={styles.alternativesList}>
                {ingredient.alternatives.map((alternative) => (
                  <div key={alternative.id} className={styles.alternativeItem}>
                    <label className={styles.alternativeLabel}>
                      <input
                        type="checkbox"
                        checked={alternative.selected}
                        onChange={() => toggleAlternative(ingredient.id, alternative.id)}
                        className={styles.checkbox}
                      />
                      <span className={styles.alternativeText}>
                        {alternative.name} {alternative.currentAmount}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button className={styles.continueButton} onClick={onContinueToInstructions}>
          Continue to Instructions →
        </button>
      </div>

      {showSettings && (
        <div className={styles.modalOverlay} onClick={() => setShowSettings(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#333' }}>Settings</h2>
            <div className={styles.settingsRow}>
              <span style={{ color: "#333" }}>Add recipe to favorites</span>
              {isFavorite ? (
                <FaStar onClick={toggleFavorite} style={{ cursor: "pointer", color: "#FFD700" }} size={24} />
              ) : (
                <FaRegStar onClick={toggleFavorite} style={{ cursor: "pointer", color: "#666" }} size={24} />
              )}
            </div>
            <button onClick={() => setShowSettings(false)} className={styles.closeSettingsButton}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ingredients;
