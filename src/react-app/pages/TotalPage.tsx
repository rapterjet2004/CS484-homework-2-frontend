import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchExpenses } from "../utils";
import { formatMoney } from "../utils";
import { Expense } from "../types";

const TotalPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    // Fetch the list of expenses from the server
    (async () => {
      try {
        const data = await fetchExpenses();
        setExpenses(data);
      } catch (e) {
        // Optionally handle error
      }
    })();
  }, []);

  const computeTotal = (expenses: Expense[]) => {
  // Compute the total cost of all expenses
  return expenses.reduce((sum, exp) => sum + Number(exp.cost), 0);
  };

  return (
    <div className="page">
      <div className="header">
        <h1 data-testid="page-total">Total</h1>
        <div className="spacer" />
        <Link className="link" to="/">
          ← Back to List
        </Link>
      </div>

      <div className="total-card">
        <div className="total-label">Grand Total</div>
        <div className="total-value" data-testid="total-value">
          {formatMoney(computeTotal(expenses))}
        </div>
      </div>
    </div>
  );
};

export default TotalPage;
