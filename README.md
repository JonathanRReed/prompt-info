# Simple Dev Tools

A product of Hello.World Consulting.

Made by Jonathan Reed.

---

## Overview

A modern, neon-themed dashboard for prompt/token insights and developer productivity.

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run locally:**

   ```bash
   npm run dev
   ```

3. **Build for production:**

   ```bash

   npm run build
   npm start
   ```

## Supabase configuration

The pricing and model metadata can be sourced directly from Supabase. Configure the following environment variables before starting the app:

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | The project URL from your Supabase dashboard. |
| `SUPABASE_ANON_KEY` | The anonymous/public API key. |
| `SUPABASE_PRICING_TABLE` *(optional)* | The table or view that stores pricing data. Defaults to `model_pricing`. |

Each row in the table should describe a model. The API expects, at minimum, a column that identifies the model (`model`, `name`, or `model_name`) and can optionally include:

- Pricing details (`input_cost`, `output_cost`, or a JSON column named `pricing` containing `input` and `output`).
- Emissions information (`co2e_factor`).
- Average output token estimates (`avg_output_tokens`).
- Free-form metadata such as `provider`, `description`, or any other custom columns. Any remaining columns are exposed to the UI as read-only metadata.

If the Supabase configuration is missing or the query fails, the app automatically falls back to the bundled dataset at `public/data/llm-data.json` so the UI remains functional.

---

For more info, visit [helloworldfirm.com](https://helloworldfirm.com)

## License

MIT License

Copyright (c) 2025 Jonathan Ray Reed

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
