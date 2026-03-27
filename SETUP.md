# 🚀 FinSight AI - Setup & Deployment Guide

Welcome to FinSight AI! This application is ready to be hosted for free on Vercel and Supabase. Follow these simple steps to get your own instance running.

## 1. Supabase Setup (Database & Auth)

1. Go to [Supabase](https://supabase.com) and create a new project (the free tier is perfect).
2. Go to **SQL Editor** in the left sidebar.
3. Open the `finsight/supabase/schema.sql` file from this repository, copy its contents, and paste it into the Supabase SQL editor.
4. Click **Run**. This will create all your tables (`profiles`, `transactions`, `budgets`, etc.) and set up the necessary Row Level Security (RLS) policies.
5. Go to **Authentication > Providers** and ensure Email provider is enabled. Optionally, enable Google OAuth and provide your Google Cloud Client ID/Secret.

## 2. Environment Variables

In your Supabase dashboard, go to **Project Settings > API**. You'll need two things:
- Project URL
- Project API Key (`anon` / `public`)

Also, grab your AI API keys:
- **Groq**: Free at [console.groq.com](https://console.groq.com)
- **Gemini**: Free at [aistudio.google.com](https://aistudio.google.com) (Optional fallback)

Create a `.env.local` file in the root of the project (if running locally):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GROQ_API_KEY=your-groq-key
GEMINI_API_KEY=your-gemini-key
```

## 3. Vercel Deployment

1. Push this code to a new GitHub repository.
2. Go to [Vercel](https://vercel.com) and click **Add New > Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section of the Vercel deployment settings, add the 4 variables mentioned above.
5. Click **Deploy**.

## 4. Final Verification

Once deployed, visit your Vercel URL:
1. Try signing up for a new account.
2. If authentication works, you will be redirected to the dashboard.
3. Ensure no errors occur and that the AI Advisor and Health Score features generate insights correctly (this verifies your Groq/Gemini keys are working).

🎉 You now have a fully functional, premium, free-to-host personal finance AI!
