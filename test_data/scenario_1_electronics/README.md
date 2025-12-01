# Scenario 1: Electronics Manufacturing

## Description
High-value precision electronics components for automotive applications.
Small volumes, high unit costs, tight capacity constraints.

## Characteristics
- **Products**: 8 precision electronic components
- **Plants**: 3 Asian manufacturing hubs
- **Total Demand**: ~29,000 units/month
- **Total Capacity**: ~42,000 units/month (with OEE)
- **Focus**: High-value, low-volume optimization

## Test Objectives
1. Test optimization with high unit costs
2. Validate capacity constraints with tight margins
3. Test transfer cost impact on high-value items

## Suggested Test Configs
```json
{
  "budget_capital": 400000,
  "objective_function": "minimize_cost",
  "allow_fractional_assignment": false,
  "excluded_products": [],
  "excluded_plants": []
}
```
