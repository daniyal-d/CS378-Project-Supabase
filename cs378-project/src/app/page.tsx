"use client";

import { useState, useEffect } from "react";
import RecipeStep from "../components/RecipeStep";
import Ingredients from "../components/Ingredients";
import StartRecipe from "../components/StartRecipe";
import LandingPage from "../components/LandingPage";
// import recipeData from "../../demo_recipes.json";
import styles from "../styles/page.module.css";

// Define interfaces for your recipe structure (consider moving to a types file)
interface IngredientSubstitution {
  substitution: string;
}
interface Ingredient {
  item: string;
  quantity?: string;
  substitutions?: IngredientSubstitution[];
}
interface RecipeStepData {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description: string;
  imageUrl: string;
  timerDuration: number;
  demonstration: string;
  helpfulTip: string;
}
interface Recipe {
  name: string;
  serving_size: number;
  coverImage: string;
  ingredients: Ingredient[];
  steps: RecipeStepData[];
}
interface RecipeFileData {
  recipes: Recipe[];
}

interface HomeRecipe {
  recipeName: string;
  coverImage: string;
}

export default function Home() {
  const [allRecipeData, setAllRecipeData] = useState<RecipeFileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<"landing" | "start" | "ingredients" | "steps">("landing");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasStartedRecipe, setHasStartedRecipe] = useState(false);
  const [selectedRecipeName, setSelectedRecipeName] = useState<string>("");
  const [selectedCoverImage, setSelectedCoverImage] = useState<string>("")

  // Fetch recipe data from the API endpoint
  useEffect(() => {
    const fetchRecipes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/getRecipes');
        if (!response.ok) {
          throw new Error(`Failed to fetch recipes: ${response.statusText}`);
        }
        const data: RecipeFileData = await response.json();
        // Basic validation
        if (!data || !Array.isArray(data.recipes)) {
            console.error("Fetched data is not in expected format:", data);
            throw new Error("Invalid recipe data format received");
        }
        setAllRecipeData(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecipes();
  }, []); // Empty dependency array means this runs once on mount


  // Find the selected recipe object from the fetched data
  const selectedRecipe = allRecipeData?.recipes.find((r) => r.name === selectedRecipeName);
  const recipeSteps = selectedRecipe?.steps || [];
  const totalSteps = recipeSteps.length;
  const currentStep = recipeSteps[currentStepIndex];

  // Navigation handlers
  const goToIngredients = () => setCurrentView("ingredients");
  const goToStart = () => setCurrentView("start");
  const goToSteps = () => {
    setCurrentView("steps");
    setHasStartedRecipe(true);
  };
  const goToLanding = () => setCurrentView("landing");

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNavigateHome = () => {
    setCurrentView("start");
  };

  const handleStepSelect = (stepNumber: number) => {
    setCurrentStepIndex(stepNumber - 1);
  };

  const handleSelectRecipe = (recipeName: string, coverImage: string) => {
    setSelectedRecipeName(recipeName);
    setSelectedCoverImage(coverImage);
    setHasStartedRecipe(false);
    setCurrentStepIndex(0);
    setCurrentView("start");
  }

  // Timer state logic remains the same for now, but re-initialization depends on selectedRecipe
  const [timerStates, setTimerStates] = useState<{
    [stepNumber: number]: {
      timeRemaining: number;
      isPaused: boolean;
      isActive: boolean;
    };
  }>({});

  // Re-initialize timer states when the selected recipe *or* its steps change
  useEffect(() => {
    if (!selectedRecipe) return; // Don't run if no recipe is selected

    const initialTimerStates: {
      [key: number]: {
        timeRemaining: number;
        isPaused: boolean;
        isActive: boolean;
      };
    } = {};

    selectedRecipe.steps.forEach((step, index) => {
      initialTimerStates[index + 1] = {
        timeRemaining: step.timerDuration * 60 || 0,
        isPaused: false,
        isActive: step.timerDuration > 0
      };
    });
    setTimerStates(initialTimerStates);
  }, [selectedRecipe]); // Depend on the selectedRecipe object

  // Timer control functions
  const pauseTimer = (stepNumber: number) => {
    setTimerStates(prev => ({
      ...prev,
      [stepNumber]: {
        ...prev[stepNumber],
        isPaused: true
      }
    }));
  };

  const resumeTimer = (stepNumber: number) => {
    setTimerStates(prev => ({
      ...prev,
      [stepNumber]: {
        ...prev[stepNumber],
        isPaused: false
      }
    }));
  };

  const updateTimer = (stepNumber: number, newTime: number) => {
    setTimerStates(prev => ({
      ...prev,
      [stepNumber]: {
        ...prev[stepNumber],
        timeRemaining: newTime
      }
    }));
  };

  // Loading and Error States
  if (isLoading) {
    return <div className={styles.container}><p>Loading recipes...</p></div>;
  }
  if (error) {
    return <div className={styles.container}><p>Error loading recipes: {error}</p></div>;
  }
  if (!allRecipeData) {
     return <div className={styles.container}><p>No recipe data found.</p></div>;
  }


  return (
    <div className={styles.container}>
      {currentView === "landing" && (
        <LandingPage
        // Pass an array of objects with recipeName and coverImage
          recipes={allRecipeData.recipes.map(r => ({
            recipeName: r.name,
            coverImage: r.coverImage,
          }))}
          onSelectRecipe={handleSelectRecipe} // Make sure this is passed
        />
      )}
      {currentView === "start" && selectedRecipe && ( // Ensure recipe is selected
        <StartRecipe
          onStart={goToSteps}
          onShowIngredients={goToIngredients}
          onBack={goToLanding}
          hasStarted={hasStartedRecipe}
          selected={selectedRecipeName} // Pass name
          coverImage={selectedCoverImage}
        />
      )}
      {currentView === "ingredients" && selectedRecipe && ( // Ensure recipe is selected
        <Ingredients
          onContinueToInstructions={goToSteps}
          onBack={goToStart}
          // Pass the full selected recipe object or just ingredients/serving size
          recipe={selectedRecipe}
        />
      )}
      {currentView === "steps" && selectedRecipe && totalSteps > 0 && currentStep && ( // Check currentStep too
        <>
          {/* Maybe use selectedRecipe.name here? */}
          <h1 className={styles.title}>{selectedRecipe.name}</h1>
          <div className={styles.stepWrapper}>
            <RecipeStep
              // Pass data from currentStep
              stepNumber={currentStepIndex + 1}
              totalSteps={totalSteps}
              title={currentStep.title}
              description={currentStep.description}
              imageUrl={currentStep.imageUrl}
              timerDuration={currentStep.timerDuration}
              demonstration={currentStep.demonstration}
              helpfulTip={currentStep.helpfulTip}
              // Pass handlers and step titles
              onNext={handleNext}
              onPrevious={handlePrevious}
              onNavigateHome={handleNavigateHome}
              onStepSelect={handleStepSelect}
              allStepTitles={recipeSteps.map((step) => step.title)}
              // Pass timer state and handlers
              timerState={timerStates[currentStepIndex + 1]}
              onPauseTimer={() => pauseTimer(currentStepIndex + 1)}
              onResumeTimer={() => resumeTimer(currentStepIndex + 1)}
              onUpdateTimer={(time) => updateTimer(currentStepIndex + 1, time)}
            />
          </div>
        </>
      )}
      {/* Add handling for cases where selectedRecipe might not be found */}
       {currentView !== "landing" && !selectedRecipe && !isLoading && (
         <div><p>Selected recipe not found.</p><button onClick={goToLanding}>Go Back</button></div>
       )}
    </div>
  );
}
