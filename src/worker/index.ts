import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { expenses } from "../../db/schema.ts";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/expenses", async (c) => {
  const db = drizzle(c.env.DB);

  // Fetch the list of expenses from the database
  const expenseList = await db.select().from(expenses).where(eq(expenses.deleted, false)).orderBy(desc(expenses.date));
  return c.json({ expenseList });
});

app.post("/api/addExpense", async (c) => {
  const db = drizzle(c.env.DB);

  // Define the expected structure of the incoming expense data
  const expense = await c.req.json<{ description: string; date: string; cost: number }>();

  // Validate the inputs before adding the expense and send appropriate error messages
  if (!expense.description || typeof expense.description !== "string") {
    return c.json({ error: "Invalid description" }, 400);
  }
  if (!expense.date || typeof expense.date !== "string") {
    return c.json({ error: "Invalid date" }, 400);
  }
  if (typeof expense.cost !== "number" || expense.cost < 0) {
    return c.json({ error: "Invalid cost" }, 400);
  }

  // Add the expense to the database and return the newly created expense
  const [newExpense] = await db.insert(expenses).values({
    description: expense.description,
    date: expense.date,
    cost: expense.cost,
    deleted: false,
  }).returning();

  return c.json({
    message: "Expense saved successfully",
    expense: newExpense,
  });
});

app.delete("/api/expenses/:id", async (c) => {
  const db = drizzle(c.env.DB);

  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Missing expense id" }, 400);
  }

  try {
    // Delete the expense from the database by setting deleted flag
    const expenseId = Number(id);
    const result = await db.update(expenses).set({ deleted: true }).where(eq(expenses.id, expenseId));

    // If no rows were affected, return a 404 error
    if (!result || !Array.isArray(result) || result.length === 0) {
      return c.json({ error: "Expense not found" }, 404);
    }

    // If deletion was successful, return a success message and the deleted expense
    const deletedExpense = await db.select().from(expenses).where(eq(expenses.id, expenseId));
    return c.json({
      message: "Expense deleted successfully",
      expense: { ...deletedExpense[0], deleted: true },
    });
  } catch (err) {
    console.error("Error deleting expense:", err);
    return c.json({ error: "Server error while deleting expense" }, 500);
  }
});

app.put("/api/expenses/:id", async (c) => {
  const db = drizzle(c.env.DB);

  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Missing expense id" }, 400);
  }

  const body = await c.req.json<{
    description: string;
    date: string;
    cost: number;
  }>();

  const { description, date, cost } = body;

  if (!description || typeof description !== "string") {
    return c.json({ error: "Invalid description" }, 400);
  }
  if (!date || typeof date !== "string") {
    return c.json({ error: "Invalid date" }, 400);
  }
  if (typeof cost !== "number" || cost < 0) {
    return c.json({ error: "Invalid cost" }, 400);
  }

  try {
    // Update the expense in the database
    const expenseId = Number(id);
    const result = await db.update(expenses).set({
      description,
      date,
      cost,
    }).where(eq(expenses.id, expenseId));

    // If no rows were affected, return a 404 error
    if (!result || !Array.isArray(result) || result.length === 0) {
      return c.json({ error: "Expense not found" }, 404);
    }

    // If update was successful, return a success message and the updated expense
    const updatedExpense = await db.select().from(expenses).where(eq(expenses.id, expenseId));
    return c.json({
      message: "Expense updated successfully",
      expense: updatedExpense[0],
    });
  } catch (err) {
    console.error("Error updating expense:", err);
    return c.json({ error: "Server error while updating expense" }, 500);
  }
});

export default app;
