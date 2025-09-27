import React, { useEffect, useRef, useState } from "react";
import ExpenseRow from "../ExpenseRow";
import {
  fetchExpenses,
  updateExpense,
  deleteExpense as apiDelete,
} from "../utils";
import { Expense, TempEdit, SortDir } from "../types";

const PAGE_SIZE = 20;

type SortKey = "date" | "cost";

const ExpensesListPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [tempEdit, setTempEdit] = useState<TempEdit>({
    description: "",
    date: "",
    cost: "",
  });

  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogMsg, setDialogMsg] = useState("");
  const openDialog = (msg: string) => {
    setDialogMsg(msg);
    const d = dialogRef.current;
    if (d && typeof d.showModal === "function") d.showModal();
  };

  useEffect(() => {
    // Fetch the list of expenses from the server
    (async () => {
      try {
        const data = await fetchExpenses();
        setExpenses(data);
      } catch (e) {
        openDialog("Failed to fetch expenses");
      }
    })();
  }, []);

  const toTime = (d?: string | number | Date) => {
    if (!d) return 0;
    const t = new Date(d).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    // Sorting logic for date and cost
    let cmp = 0;
    if (sortBy === "date") {
      cmp = toTime(a.date) - toTime(b.date);
    } else {
      cmp = Number(a.cost) - Number(b.cost);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  //TODO: Define the pagination logic here for the expenses list based on PAGE_SIZE and the current page number.
  // Pagination logic for expenses list
  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / PAGE_SIZE));
  useEffect(() => setPage(1), [totalPages]);
  const startIdx = (page - 1) * PAGE_SIZE;
  const pagedExpenses = sortedExpenses.slice(startIdx, startIdx + PAGE_SIZE);

  const toggleDir = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  const chooseSort = (key: SortKey) => {
    if (sortBy === key) {
      toggleDir();
    } else {
      setSortBy(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  };

  const saveEdit = async (id: string | number, next: TempEdit) => {
    const parsedCost = parseFloat(next.cost);
    // Validate the inputs before saving the edit
    if (!next.description.trim()) {
      openDialog("Description is required");
      return;
    }
    if (!next.date) {
      openDialog("Date is required");
      return;
    }
    if (isNaN(parsedCost) || parsedCost < 0) {
      openDialog("Cost must be a non-negative number");
      return;
    }
    setEditingId(null);
    try {
      await updateExpense(id, {
        description: next.description,
        date: next.date,
        cost: parsedCost,
      });
      const updated = await fetchExpenses();
      setExpenses(updated);
    } catch (e) {
      console.error("Failed to save edit:", e);
      openDialog("Failed to save edit");
    }
  };

  const deleteExpense = async (id: string | number) => {
    try {
      await apiDelete(id);
      const updated = await fetchExpenses();
      setExpenses(updated);
    } catch (e) {
      console.error("Failed to delete:", e);
      openDialog("Failed to delete expense");
    }
    setPage((p) => {
      const newCount = Math.max(0, sortedExpenses.length - 1);
      const newTotalPages = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      return Math.min(p, newTotalPages);
    });
  };

  return (
    <div className="page">
      <div className="header">
        <h1 data-testid="page-expenses">Expenses</h1>
        <div className="spacer" />
      </div>

      <div className="table-header">
        <div className="th th-serial">Sr No.</div>
        <div className="th th-desc">Description</div>

        <div className="th th-date">
          <span className="th-label">Date</span>
          <button
            type="button"
            data-testid="sort-date"
            className={`sort-chip ${sortBy === "date" ? "active" : ""}`}
            onClick={() => chooseSort("date")}
            aria-pressed={sortBy === "date"}
            aria-label={`Sort by date ${
              sortBy === "date" ? `(${sortDir})` : ""
            }`}
            title={sortBy === "date" ? `Date (${sortDir})` : "Sort by Date"}
          >
            <span className="chip-icon">
              {sortBy === "date" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
            </span>
          </button>
        </div>

        <div className="th th-cost">
          <span className="th-label">Cost</span>
          <button
            type="button"
            data-testid="sort-cost"
            className={`sort-chip ${sortBy === "cost" ? "active" : ""}`}
            onClick={() => chooseSort("cost")}
            aria-pressed={sortBy === "cost"}
            aria-label={`Sort by cost ${
              sortBy === "cost" ? `(${sortDir})` : ""
            }`}
            title={sortBy === "cost" ? `Cost (${sortDir})` : "Sort by Cost"}
          >
            <span className="chip-icon">
              {sortBy === "cost" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
            </span>
          </button>
        </div>

        <div className="th th-actions">Actions</div>
      </div>

      <div className="list-wrapper" data-testid="expenses-list">
        {pagedExpenses.length === 0 ? (
          <div className="no-expenses" data-testid="empty-state">
            No expenses yet. Add one.
          </div>
        ) : (
          pagedExpenses.map((expense, idx) => (
            <ExpenseRow
              key={expense.id ?? `${expense.date}-${startIdx + idx}`}
              serialNo={startIdx + idx + 1}
              expense={expense}
              isEditing={editingId === expense.id}
              tempEdit={tempEdit}
              setTempEdit={setTempEdit}
              setEditingId={setEditingId}
              onSave={saveEdit}
              onDelete={deleteExpense}
            />
          ))
        )}
      </div>

      <div
        className="pager"
        data-testid="pager"
        style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}
      >
        <button
          className="btn"
          data-testid="pager-prev"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          ← Prev
        </button>

        <span
          className="page-indicator"
          data-testid="pager-indicator"
          style={{ padding: "0 6px" }}
        >
          Page {page} of {totalPages}
        </span>

        <button
          className="btn"
          data-testid="pager-next"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next →
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="modal"
        onClose={() => setDialogMsg("")}
      >
        <div className="modal-body">
          <p>{dialogMsg}</p>
        </div>
        <form method="dialog" className="modal-actions">
          <button className="btn btn-primary">OK</button>
        </form>
      </dialog>
    </div>
  );
};

export default ExpensesListPage;
