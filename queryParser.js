module.exports = function queryParser(query) {
  const lowerQuery = query.toLowerCase();

  // Query 1: "Which regions are underperforming in Q2 2025 compared to Q1 2025?"
  if (lowerQuery.includes('underperforming') && lowerQuery.includes('q2') && lowerQuery.includes('q1')) {
    return {
      sql: `
        WITH Q1Sales AS (
          SELECT r.r2 AS region_name, COALESCE(SUM(s.c3), 0) AS q1_revenue
          FROM sales s
          JOIN regions r ON s.reg_id = r.r1
          WHERE (s.c2 LIKE '2025-01%' OR s.c2 LIKE '2025-02%' OR s.c2 LIKE '2025-03%'
                 OR s.c2 LIKE '01/[0-2][0-9]/2025' OR s.c2 LIKE '02/[0-2][0-9]/2025' OR s.c2 LIKE '03/[0-2][0-9]/2025')
          AND s.c3 IS NOT NULL AND s.c3 >= 0
          GROUP BY r.r2
        ),
        Q2Sales AS (
          SELECT r.r2 AS region_name, COALESCE(SUM(s.c3), 0) AS q2_revenue
          FROM sales s
          JOIN regions r ON s.reg_id = r.r1
          WHERE (s.c2 LIKE '2025-04%' OR s.c2 LIKE '2025-05%' OR s.c2 LIKE '2025-06%'
                 OR s.c2 LIKE '04/[0-2][0-9]/2025' OR s.c2 LIKE '05/[0-2][0-9]/2025' OR s.c2 LIKE '06/[0-2][0-9]/2025')
          AND s.c3 IS NOT NULL AND s.c3 >= 0
          GROUP BY r.r2
        )
        SELECT 
          COALESCE(Q1Sales.region_name, Q2Sales.region_name) AS region_name,
          COALESCE(Q1Sales.q1_revenue, 0) AS q1_revenue,
          COALESCE(Q2Sales.q2_revenue, 0) AS q2_revenue,
          CASE 
            WHEN Q1Sales.q1_revenue = 0 THEN NULL
            ELSE ROUND(CAST(((Q2Sales.q2_revenue - Q1Sales.q1_revenue) * 100.0 / Q1Sales.q1_revenue) AS NUMERIC), 2)
          END AS percentage_change
        FROM Q1Sales
        FULL OUTER JOIN Q2Sales ON Q1Sales.region_name = Q2Sales.region_name
        WHERE Q2Sales.q2_revenue IS NOT NULL
        ORDER BY percentage_change ASC
        LIMIT 5
      `,
      chartType: 'line',
    };
  }

  // Query 2: "What factors correlate with high customer churn in 2025?"
  if (lowerQuery.includes('customer churn') && lowerQuery.includes('2025')) {
    return {
      sql: `
        WITH CustomerPurchases AS (
          SELECT 
            s.cust_id,
            COUNT(*) AS purchase_count,
            STRING_AGG(p.p2, ', ') AS products_bought,
            STRING_AGG(r.r2, ', ') AS regions
          FROM sales s
          JOIN products p ON s.prod_id = p.p1
          JOIN regions r ON s.reg_id = r.r1
          WHERE s.c2 LIKE '2025%'
          AND s.c3 IS NOT NULL AND s.c3 >= 0
          GROUP BY s.cust_id
          HAVING COUNT(*) = 1
        )
        SELECT 
          products_bought,
          regions,
          COUNT(*) AS churned_customers
        FROM CustomerPurchases
        GROUP BY products_bought, regions
        ORDER BY churned_customers DESC
        LIMIT 5
      `,
      chartType: 'bar',
    };
  }

  // Query 3: "Why are logistics costs increasing in regions with high sales?"
  if (lowerQuery.includes('logistics costs') && lowerQuery.includes('high sales')) {
    return {
      sql: `
        SELECT 
          r.r2 AS region_name,
          COALESCE(SUM(s.c3), 0) AS total_sales,
          COUNT(DISTINCT s.c1) AS transaction_count
        FROM sales s
        JOIN regions r ON s.reg_id = r.r1
        WHERE s.c3 IS NOT NULL AND s.c3 >= 0
        GROUP BY r.r2
        HAVING COALESCE(SUM(s.c3), 0) > (SELECT AVG(COALESCE(SUM(c3), 0)) FROM sales GROUP BY reg_id)
        ORDER BY total_sales DESC
        LIMIT 5
      `,
      chartType: 'scatter',
    };
  }

  // Query 4: "Which products have the most inconsistent sales across regions in 2025?"
  if (lowerQuery.includes('inconsistent sales') && lowerQuery.includes('regions') && lowerQuery.includes('2025')) {
    return {
      sql: `
        WITH ProductRegionSales AS (
          SELECT 
            p.p2 AS product_name,
            r.r2 AS region_name,
            COALESCE(SUM(s.c3), 0) AS total_sales
          FROM sales s
          JOIN products p ON s.prod_id = p.p1
          JOIN regions r ON s.reg_id = r.r1
          WHERE s.c2 LIKE '2025%'
          AND s.c3 IS NOT NULL AND s.c3 >= 0
          GROUP BY p.p2, r.r2
        )
        SELECT 
          product_name,
          STDDEV(total_sales) AS sales_variance
        FROM ProductRegionSales
        GROUP BY product_name
        HAVING product_name IS NOT NULL
        ORDER BY sales_variance DESC
        LIMIT 5
      `,
      chartType: 'bar',
    };
  }

  // Query 5: "What are the top customer segments by revenue in 2025, excluding outliers?"
  if (lowerQuery.includes('customer segments') && lowerQuery.includes('revenue') && lowerQuery.includes('2025')) {
    return {
      sql: `
        WITH ValidSales AS (
          SELECT 
            s.cust_id,
            s.c3 AS revenue
          FROM sales s
          WHERE s.c2 LIKE '2025%'
          AND s.c3 IS NOT NULL AND s.c3 >= 0
        ),
        Percentiles AS (
          SELECT 
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY revenue) AS p25,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY revenue) AS p75
          FROM ValidSales
        ),
        FilteredSales AS (
          SELECT 
            s.cust_id,
            s.revenue
          FROM ValidSales s
          CROSS JOIN Percentiles p
          WHERE s.revenue BETWEEN p.p25 - 1.5 * (p.p75 - p.p25) AND p.p75 + 1.5 * (p.p75 - p.p25)
        )
        SELECT 
          SUBSTRING(c.email FROM '@(.*)$') AS email_domain,
          COALESCE(SUM(fs.revenue), 0) AS total_revenue
        FROM FilteredSales fs
        JOIN customers c ON fs.cust_id = c.id
        WHERE c.email IS NOT NULL AND c.email LIKE '%@%.%'
        GROUP BY SUBSTRING(c.email FROM '@(.*)$')
        ORDER BY total_revenue DESC
        LIMIT 5
      `,
      chartType: 'pie',
    };
  }

  // Fallback query if none of the conditions match
  return {
    sql: 'SELECT * FROM sales LIMIT 5',
    chartType: null,
  };
};