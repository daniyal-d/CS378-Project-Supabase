import { NextResponse } from 'next/server';
import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import OpenAI from 'openai';

// Ensure this route is treated as dynamic
export const dynamic = 'force-dynamic';

// Retrieve keys securely from server-side environment variables
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Basic check to ensure keys are loaded
if (!firecrawlApiKey) {
  console.error("FIRECRAWL_API_KEY is not set in environment variables.");
}
if (!openaiApiKey) {
  console.error("OPENAI_API_KEY is not set in environment variables.");
}

const openai = new OpenAI({ apiKey: openaiApiKey });
const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });

const createPrompt = (scrapedContent: string) => `Extract the recipe details and format them as JSON in the following format:
{
  "recipes": [
    {
      "name": "<recipe name>",
      "serving_size": <number>,
      "ingredients": [
        {
          "item": "<ingredient>",
          "quantity": "<quantity>",
          "substitutions": [
            { "substitution": "<alternative>" }
          ]
        },
        ...
      ],
      "steps": [
        {
          "stepNumber": <number>,
          "totalSteps": <total>,
          "title": "<step title>",
          "description": "<step description>",
          "imageUrl": "/images/spaghetti_carbonara/1.jpg",
          "timerDuration": <duration in minutes>,
          "demonstration": "<demonstration text>",
          "helpfulTip": "<helpful tip text>"
        },
        ...
      ]
    }
  ]
}
Provide only the JSON output. No other text should be included.
Your output will be directly added to a JSON file, therefore do not wrap it in quotation marks or any other text.
Output only the pure JSON.
You will need to make up your own substitutions, demonstration, and helpfulTip texts based on what you think would work.
Every imageURL field should match the text provided.
For any fractions, use the format "1/2" instead of "½". It is critical that the fractions are in this format.
For example, "1/2 cup" instead of "½ cup" and "3 1/4 cups" instead of "3 ¼ cups".

Scraped Content:
${scrapedContent}`;


export async function POST(request: Request) {
  // Ensure API keys are available before processing
  if (!firecrawlApiKey || !openaiApiKey) {
    return NextResponse.json({ message: 'Server configuration error: API keys missing.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const url = body.url;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ message: 'Invalid URL provided' }, { status: 400 });
    }

    // --- Step 1: Scrape the URL using Firecrawl ---
    console.log(`Scraping URL: ${url}`);
    const scrapeResult = await firecrawl.scrapeUrl(url, { formats: ['markdown'] }) as ScrapeResponse;

    if (!scrapeResult.success || !scrapeResult.markdown) {
      console.error('Firecrawl scraping failed:', scrapeResult.error);
      return NextResponse.json({ message: `Failed to scrape URL: ${scrapeResult.error || 'Unknown error'}` }, { status: 500 });
    }
    console.log('Scraping successful.');

    // --- Step 2: Process with OpenAI ---
    console.log('Processing scraped content with OpenAI...');
    const prompt = createPrompt(scrapeResult.markdown);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that extracts recipe information and formats it as JSON." },
        { role: "user", content: prompt }
        // Note: We combined the prompt and content into one user message for simplicity here
      ],
      temperature: 0.7,
    });

    const recipeJsonString = response.choices[0]?.message?.content;

    if (!recipeJsonString) {
        console.error('OpenAI did not return recipe content.');
        return NextResponse.json({ message: 'Failed to process recipe content with AI.' }, { status: 500 });
    }

    console.log('OpenAI processing successful.');

    // --- Step 3: Validate and Return JSON ---
    // Basic validation: Check if it looks like JSON
    let parsedRecipeData;
    try {
        parsedRecipeData = JSON.parse(recipeJsonString);
        // Could add more specific validation here (e.g., check for `recipes` array)
         if (!parsedRecipeData || !Array.isArray(parsedRecipeData.recipes)) {
             throw new Error("Invalid JSON structure: Missing 'recipes' array.");
         }
    } catch (parseError) {
        console.error('Error parsing OpenAI response as JSON:', parseError);
        console.error('Received content:', recipeJsonString); // Log what was received
        return NextResponse.json({ message: 'AI returned invalid JSON format.' }, { status: 500 });
    }

    // Return the validated, stringified JSON (or the parsed object if preferred)
    // Returning the string as the saveRecipe API expects it
    return NextResponse.json({ recipe: recipeJsonString }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/processRecipeUrl:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    return NextResponse.json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
  }
} 