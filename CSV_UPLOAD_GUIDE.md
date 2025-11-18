# CSV Upload Guide

This guide explains how to use CSV files to import products and plants data into the Denso Transfer Plan Recommendation System.

## Template Files

Two CSV template files are provided in the root directory:

1. **`products_template.csv`** - Template for importing products
2. **`plants_template.csv`** - Template for importing plants

## Products CSV Format

### Required Fields
- `product_id` (string) - Unique product identifier (e.g., SKU-001)
- `current_plant_id` (string) - Current plant where product is manufactured
- `monthly_demand` (number) - Monthly demand in pieces
- `current_unit_cost` (number) - Current unit cost in dollars

### Optional Fields
- `unit_volume_or_weight` (number) - Unit volume or weight
- `cycle_time_sec` (number) - Cycle time in seconds
- `yield_rate` (number) - Yield rate as percentage (0-100)

### Example
```csv
product_id,current_plant_id,monthly_demand,current_unit_cost,unit_volume_or_weight,cycle_time_sec,yield_rate
SKU-ALT-001,PLANT-JP-01,12000,25.50,2.5,45.0,98.5
SKU-ALT-002,PLANT-JP-01,8500,32.00,3.2,60.0,97.8
```

## Plants CSV Format

### Required Fields
- `plant_id` (string) - Unique plant identifier (e.g., PLANT-JP-01)
- `available_capacity` (number) - Available capacity in pieces per month
- `unit_production_cost` (number) - Unit production cost in dollars
- `transfer_fixed_cost` (number) - Fixed cost for transferring production in dollars

### Optional Fields
- `effective_oee` (number) - Overall Equipment Effectiveness (0-1), default: 1.0
- `lead_time_to_start` (number) - Lead time to start production in months, default: 0
- `risk_score` (number) - Risk score (0-1)
- `max_utilization_target` (number) - Maximum utilization target percentage (0-100), default: 90

### Example
```csv
plant_id,available_capacity,unit_production_cost,transfer_fixed_cost,effective_oee,lead_time_to_start,risk_score,max_utilization_target
PLANT-JP-01,50000,22.00,100000,0.92,0,0.15,85
PLANT-JP-02,45000,23.50,95000,0.88,1,0.18,85
```

## How to Upload CSV Files

### Using the Web Interface

1. **Navigate to Data Management**
   - Open the application in your browser
   - Click on the "Data Management" tab

2. **Upload Products**
   - Click on the "Products" sub-tab
   - Click the "Upload CSV" button
   - Select your products CSV file
   - Wait for the import confirmation

3. **Upload Plants**
   - Click on the "Plants" sub-tab
   - Click the "Upload CSV" button
   - Select your plants CSV file
   - Wait for the import confirmation

### Import Results

After uploading, you will see a summary showing:
- ✓ Success: Number of records successfully imported
- ✗ Failed: Number of records that failed to import

The lists will automatically refresh to show the newly imported data.

## Tips

1. **File Format**: Ensure your CSV file uses comma (`,`) as the delimiter
2. **Headers**: The first row must contain the field names exactly as shown
3. **Data Types**: Make sure numbers don't have extra formatting (e.g., no currency symbols)
4. **Validation**: Missing required fields will cause the import to fail with a clear error message
5. **Duplicate IDs**: If a product/plant with the same ID already exists, the import will fail for that record
6. **Clear Data**: Use the "Clear All Data" button in the sidebar to remove existing data before importing new data

## Example Workflow

1. Download the template file (`products_template.csv` or `plants_template.csv`)
2. Open the file in Excel, Google Sheets, or any spreadsheet application
3. Replace the example data with your actual data
4. Save the file as CSV format
5. Upload the file using the "Upload CSV" button in the application
6. Verify the import was successful
7. Proceed to generate your transfer plan

## Troubleshooting

### "Missing required fields" error
- Check that your CSV has all required column headers
- Ensure the header names match exactly (case-sensitive)

### "CSV file is empty or invalid" error
- Make sure your file is not empty
- Check that the file is properly formatted as CSV
- Ensure there is at least one data row below the header

### Import shows some failures
- Check the browser console for detailed error messages
- Verify that IDs are unique (no duplicates in the CSV)
- Ensure all data types are correct (numbers for numeric fields, etc.)
