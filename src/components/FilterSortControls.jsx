import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, ArrowUpDown, Calendar } from "lucide-react";

export default function FilterSortControls({ filterResult, onFilterChange, sortBy, onSortChange, dateFrom, onDateFromChange, dateTo, onDateToChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-600">Result:</span>
        <Select value={filterResult} onValueChange={onFilterChange}>
          <SelectTrigger className="h-8 text-xs w-44">
            <SelectValue placeholder="All Results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="Pass">Pass</SelectItem>
            <SelectItem value="Conditional Pass">Conditional Pass</SelectItem>
            <SelectItem value="Fail">Fail</SelectItem>
            <SelectItem value="Satisfactory">Satisfactory</SelectItem>
            <SelectItem value="Unsatisfactory">Unsatisfactory</SelectItem>
            <SelectItem value="Complete">Complete</SelectItem>
            <SelectItem value="Incomplete">Incomplete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-4 w-px bg-slate-200" />

      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-600">Inspected:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-8 px-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
          title="From date"
        />
        <span className="text-xs text-slate-400">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-8 px-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
          title="To date"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { onDateFromChange(""); onDateToChange(""); }}
            className="text-xs text-slate-400 hover:text-slate-700 font-semibold"
          >✕</button>
        )}
      </div>

      <div className="h-4 w-px bg-slate-200" />

      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-600">Sort:</span>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="h-8 text-xs w-44">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score-high">Safety Score (Highest)</SelectItem>
            <SelectItem value="score-low">Safety Score (Lowest)</SelectItem>
            <SelectItem value="inspections">Most Inspections</SelectItem>
            <SelectItem value="date-recent">Recent Inspection</SelectItem>
            <SelectItem value="date-oldest">Oldest Inspection</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}