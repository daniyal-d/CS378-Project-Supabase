import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Import the Supabase client

export const dynamic = 'force-dynamic';


// Define the structure of the recipe data file (can be more specific)
interface RecipeData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recipes: any[];
}

const RECIPE_STORE_ID = 1; // The ID of the row holding our recipes

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming request body
    const body = await request.json();
    const recipeJsonString = body.recipe; // The stringified JSON from the frontend

    if (!recipeJsonString || typeof recipeJsonString !== 'string') {
      return NextResponse.json({ message: 'Invalid recipe data received' }, { status: 400 });
    }

    // 2. Parse the recipe JSON string itself
    let newRecipeData;
    try {
        newRecipeData = JSON.parse(recipeJsonString);
    } catch (parseError) {
        console.error('Error parsing recipe JSON string:', parseError);
        return NextResponse.json({ message: 'Invalid JSON format in recipe data' }, { status: 400 });
    }

    // Ensure the parsed data has the expected structure { recipes: [...] }
    if (!newRecipeData || !Array.isArray(newRecipeData.recipes) || newRecipeData.recipes.length === 0) {
        console.error('Parsed recipe data is missing the recipes array or is empty:', newRecipeData);
        return NextResponse.json({ message: 'Parsed recipe data structure is invalid' }, { status: 400 });
    }

    // Extract the actual recipe object (assuming only one recipe is sent per request)
    const newRecipeObject = newRecipeData.recipes[0];

    // 3. Read the existing recipe data from Supabase
    const { data: existingStoreData, error: fetchError } = await supabase
      .from('recipe_store')
      .select('data')
      .eq('id', RECIPE_STORE_ID)
      .single(); // We expect only one row with id=1

    if (fetchError || !existingStoreData) {
      console.error('Error fetching existing recipes from Supabase:', fetchError);
      return NextResponse.json({ message: 'Could not load existing recipes' }, { status: 500 });
    }

    // Ensure the fetched data has the correct structure
    const existingData: RecipeData = existingStoreData.data || { recipes: [] };
    if (!Array.isArray(existingData.recipes)) {
        console.warn('Recipe data in Supabase was malformed. Resetting.');
        existingData.recipes = [];
    }

    // 4. Append the new recipe object to the existing recipes array
    existingData.recipes.push(newRecipeObject);

    // 5. Write the updated data back to Supabase
    const { error: updateError } = await supabase
      .from('recipe_store')
      .update({ data: existingData }) // Update the 'data' column
      .eq('id', RECIPE_STORE_ID); // Where id matches RECIPE_STORE_ID

    if (updateError) {
      console.error('Error updating recipes in Supabase:', updateError);
      return NextResponse.json({ message: 'Could not save the new recipe' }, { status: 500 });
    }

    // 6. Return a success response
    return NextResponse.json({ message: 'Recipe saved successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/saveRecipe:', error);
    // Check if the error is related to JSON parsing specifically
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Failed to parse incoming JSON data' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
