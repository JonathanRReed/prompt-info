const axios = require('axios');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const gistUrl = 'https://gist.githubusercontent.com/t3dotgg/a4bb252e590320e223e71c595e60e6be/raw';
    console.log('Fetching pricing data...');
    const response = await axios.get(gistUrl);
    const text = response.data;
    const lines = text.trim().split('\n');
    const [, ...dataLines] = lines;
    const pricingData = {};
    dataLines.forEach(line => {
      const [name, inputStr, outputStr] = line.split(',');
      pricingData[name] = {
        input: parseFloat(inputStr.replace('$', '')),
        output: parseFloat(outputStr.replace('$', ''))
      };
    });
    // gCO2e factors per token (g)
    const co2Factors = {
      'gpt-4': 0.005,
      'gpt-4-32k': 0.005,
      'gpt-3.5-turbo': 0.002
    };
    const merged = {};
    for (const model in pricingData) {
      merged[model] = {
        pricing: pricingData[model],
        co2eFactor: co2Factors[model] || 0
      };
    }
    const outDir = path.join(__dirname, '../public/data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'llm-data.json');
    fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
    console.log('Wrote llm-data.json');
  } catch (err) {
    console.error('Error fetching data:', err);
    process.exit(1);
  }
})();
