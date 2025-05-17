const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const queryParser = require('./queryParser');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Default route for testing
app.get('/', (req, res) => {
  res.send('API is running. Use POST /api/query to send your queries.');
});

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'retail_db',
  password: 'Aniket@98',
  port: 5432,
});

// Query endpoint
app.post('/api/query', async (req, res) => {
  console.log('Received request:', req.body);

  if (!req.body || !req.body.query) {
    console.error('Invalid request: Missing query in body');
    return res.status(400).json({ error: 'Missing or invalid query in request body' });
  }

  const { query } = req.body;

  try {
    const { sql, chartType } = await queryParser(query);
    console.log('Generated SQL:', sql);

    const result = await pool.query(sql);

    const cleanedRows = result.rows.map(row => {
      const cleaned = {};
      for (const key in row) {
        cleaned[key] = row[key] ?? 'N/A';
      }
      return cleaned;
    });

    const uniqueRows = [...new Map(cleanedRows.map(row => [JSON.stringify(row), row])).values()];

    const answer = generateAnswer(query, uniqueRows);

    const headers = Object.keys(uniqueRows[0] || {});
    const rows = uniqueRows.map(row => headers.map(header => row[header]));

    let chartData = null;
    if (chartType && uniqueRows.length > 0) {
      chartData = {
        labels: uniqueRows.map(row => row[headers[0]] || 'Unknown'),
        datasets: [{
          label: headers[1] || 'Value',
          data: uniqueRows.map(row => parseFloat(row[headers[1]]) || 0),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        }],
      };
    }

    res.json({
      answer,
      table: { headers, rows },
      chartData,
      chartType,
    });
  } catch (error) {
    console.error('Error processing query:', error.message);
    res.status(500).json({ error: `Failed to process query: ${error.message}` });
  }
});

// Generate natural language responses for complex queries
function generateAnswer(query, rows) {
  const lowerQuery = query.toLowerCase();
  if (!rows.length) {
    return 'No results found for your query.';
  }

  const topRow = rows[0];

  // Query 1: "Which regions are underperforming in Q2 2025 compared to Q1 2025?"
  if (lowerQuery.includes('underperforming') && lowerQuery.includes('q2') && lowerQuery.includes('q1')) {
    return `The most underperforming region is ${topRow.region_name || 'N/A'}, with a sales drop of ${topRow.percentage_change || 'N/A'}% from Q1 to Q2 2025.`;
  }

  // Query 2: "What factors correlate with high customer churn in 2025?"
  if (lowerQuery.includes('customer churn') && lowerQuery.includes('2025')) {
    return `The highest churn is associated with products "${topRow.products_bought || 'N/A'}" in regions "${topRow.regions || 'N/A'}", affecting ${topRow.churned_customers || 'N/A'} customers.`;
  }

  // Query 3: "Why are logistics costs increasing in regions with high sales?"
  if (lowerQuery.includes('logistics costs') && lowerQuery.includes('high sales')) {
    return `In ${topRow.region_name || 'N/A'}, high sales of ${topRow.total_sales || 'N/A'} are associated with ${topRow.transaction_count || 'N/A'} transactions, likely driving up logistics costs.`;
  }

  // Query 4: "Which products have the most inconsistent sales across regions in 2025?"
  if (lowerQuery.includes('inconsistent sales') && lowerQuery.includes('regions') && lowerQuery.includes('2025')) {
    return `The product with the most inconsistent sales is ${topRow.product_name || 'N/A'}, with a sales variance of ${topRow.sales_variance || 'N/A'} across regions.`;
  }

  // Query 5: "What are the top customer segments by revenue in 2025, excluding outliers?"
  if (lowerQuery.includes('customer segments') && lowerQuery.includes('revenue') && lowerQuery.includes('2025')) {
    return `The top customer segment by revenue is "${topRow.email_domain || 'N/A'}" with a total revenue of ${topRow.total_revenue || 'N/A'} in 2025, after excluding outliers.`;
  }

  return 'Here are the results for your query.';
}

// Start server
app.listen(3000, () => console.log('Server running on port 3000'));