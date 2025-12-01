# Scenario 2: Heavy Industrial Manufacturing

## Description
High-volume, low-margin heavy automotive components (chassis, axles, brakes).
European manufacturing network with cost optimization focus.

## Characteristics
- **Products**: 6 heavy industrial components
- **Plants**: 4 European manufacturing facilities
- **Total Demand**: ~303,000 units/month
- **Total Capacity**: ~385,000 units/month (with OEE)
- **Focus**: Volume optimization, low-cost production

## Test Objectives
1. Test high-volume capacity allocation
2. Validate cost minimization with low margins
3. Test utilization balancing across plants

## Suggested Test Configs
```json
{
  "budget_capital": 200000,
  "objective_function": "balance_utilization",
  "allow_fractional_assignment": true,
  "excluded_products": [],
  "excluded_plants": []
}
```
