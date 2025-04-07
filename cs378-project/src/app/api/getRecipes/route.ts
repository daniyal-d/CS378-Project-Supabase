import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

const RECIPE_STORE_ID = 1;

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('recipe_store')
      .select('data')
      .eq('id', RECIPE_STORE_ID)
      .single();

    if (error) {
      console.error('Error fetching recipes from Supabase:', error);
      throw error; // Throw error to be caught below
    }

    if (!data || !data.data) {
      // Handle case where data might be missing or null
       return NextResponse.json({ recipes: [] }, { status: 200 });
    }

    // Return the nested 'recipes' array directly
    return NextResponse.json(data.data, { status: 200 });

  } catch (error) {
    console.error('Error in /api/getRecipes:', error);
    return NextResponse.json({ message: 'Failed to fetch recipes' }, { status: 500 });
  }
}