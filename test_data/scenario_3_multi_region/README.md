# Scenario 3: Complex Multi-Region Manufacturing

## Description
Global thermal management and powertrain components across emerging markets.
Complex supply chain with diverse regional costs and risk profiles.

## Characteristics
- **Products**: 15 diverse automotive components
- **Plants**: 7 facilities across Latin America, Asia, and Southeast Asia
- **Total Demand**: ~369,500 units/month
- **Total Capacity**: ~370,000 units/month (with OEE) - TIGHT!
- **Focus**: Global optimization, risk management, regional complexity

## Test Objectives
1. Test near-capacity optimization scenarios
2. Validate multi-region cost tradeoffs
3. Test exclusion lists with complex dependencies
4. Stress test with tight capacity constraints

## Suggested Test Configs

### Config A: Cost Minimization with Budget
```json
{
  "budget_capital": 350000,
  "objective_function": "minimize_cost",
  "allow_fractional_assignment": false,
  "excluded_products": [],
  "excluded_plants": []
}
```

### Config B: Risk-Aware (Exclude High-Risk Plants)
```json
{
  "budget_capital": null,
  "objective_function": "minimize_cost",
  "allow_fractional_assignment": true,
  "excluded_products": [],
  "excluded_plants": ["PLANT-VN-HAIPHONG", "PLANT-ID-BEKASI"]
}
```

### Config C: Balanced Utilization with Exclusions
```json
{
  "budget_capital": 500000,
  "objective_function": "balance_utilization",
  "allow_fractional_assignment": false,
  "excluded_products": ["THERMOSTAT-TH100", "THERMOSTAT-TH200", "HOSE-COOLANT-HC10"],
  "excluded_plants": ["PLANT-BR-SOROCABA"]
}
```
