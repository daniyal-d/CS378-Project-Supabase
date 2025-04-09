"use client";
import { useState } from "react";
import styles from "./AddRecipeModal.module.css";
import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import OpenAI from 'openai';

interface AddRecipeModalProps {
  onClose: () => void;
}

export default function AddRecipeModal({ onClose }: AddRecipeModalProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const processWithChatGPT = async (scrapedContent: string) => {
    // NOTE: In production, API keys should be stored securely on the server-side
    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Required for client-side use
    });

    const prompt = `Extract the recipe details and format them as JSON in the following format:
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
              "demonstration": "<demonstration embedding url>",
            },
            ...
          ]
        }
      ]
    }
    Provide only the JSON output. No other text should be included. 
    Your output will be directly added to a JSON file, therefore do not wrap it in quotation marks or any other text. 
    Output only the pure JSON. 
    You will need to make up your own substitution texts based on what you think would work. 
    You will need to find a single YouTube video under 1 minute for each demonstration based on what you think is the one most challenging part from the description. The video must be relevant to the task in the description. It is critical that the video is available and that you find the entire embed video URL, and not the watch one. Demonstration should only be the embed video URL.
    Every imageURL field should match the text provided. 
    For any fractions, use the format "1/2" instead of "½". It is critical that the fractions are in this format.
    For example, "1/2 cup" instead of "½ cup" and "3 1/4 cups" instead of "3 ¼ cups".`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that extracts recipe information." },
          { role: "user", content: prompt },
          { role: "user", content: scrapedContent }
        ],
        temperature: 0.7,
      });

      // Extract the JSON recipe data from the response
      const recipeJson = response.choices[0].message.content;
      console.log('Processed Recipe JSON:', recipeJson);
      return recipeJson;
    } catch (error) {
      console.error('Error processing with ChatGPT:', error);
      throw error;
    }
  };

  const saveRecipeToFile = async (recipeJson: string) => {
    try {
      const response = await fetch('/api/saveRecipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipe: recipeJson }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    
    try {
      const app = new FirecrawlApp({apiKey: process.env.NEXT_PUBLIC_FIRECRAWL_API_KEY});
      
      // Make API call to scrape the URL
      const scrapeResult = await app.scrapeUrl(url, { formats: ['markdown'] }) as ScrapeResponse;
      
      // Handle API response
      if (!scrapeResult.success) {
        setMessage(`Failed to scrape: ${scrapeResult.error || 'Unknown error'}`);
        console.error('Scraping failed:', scrapeResult.error);
      } else {
        // Log the scraped content
        console.log('Scraped Content:', scrapeResult.markdown);
        
        // Process the content with ChatGPT
        setMessage("URL scraped successfully! Processing with ChatGPT...");
        const recipeJson = await processWithChatGPT(scrapeResult.markdown || '');
        
        if (recipeJson) {
          setMessage("Recipe processed! Saving to file...");
          await saveRecipeToFile(recipeJson);
          setMessage("Recipe saved successfully!");
        } else {
          setMessage("Failed to process recipe. Please try again with a different URL.");
        }
      }
    } catch (error) {
      console.error('Error processing recipe:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Simple modal with just a form and status message
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          X
        </button>
        <h2>Upload Custom Recipe</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            placeholder="Paste your recipe URL here"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Submit'}
          </button>
        </form>
        {message && <p className={styles.statusMessage}>{message}</p>}
      </div>
    </div>
  );
}
