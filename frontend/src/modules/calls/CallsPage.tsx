import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Phone, X } from "lucide-react";
import { callsApi } from "@/services/api";
import type { Call, CallStatus, SortCallsBy, SortOrder } from "@/types/calls";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallsTable } from "./CallsTable";
import { CallDetailDrawer } from "./CallDetailDrawer";

type TabValue = "all" | CallStatus;

const TABS: { label: string; value: TabValue }[] = [
  { label: "All", value: "all" },
  { label: "In Progress", value: "in_progress" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
];

const PAGE_SIZE = 20;

export function CallsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [page, setPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  // TASK 2: filter state
  const [callerName, setCallerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [label, setLabel] = useState("");
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");

  // TASK 2: sorting state
  const [sortBy, setSortBy] = useState<SortCallsBy>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const statusFilter = activeTab === "all" ? undefined : activeTab;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: [
      "calls",
      statusFilter,
      callerName,
      phoneNumber,
      label,
      minDuration,
      maxDuration,
      sortBy,
      sortOrder,
      page,
      PAGE_SIZE,
    ],
    queryFn: () =>
      callsApi.list({
        status: statusFilter,
        caller_name: callerName || undefined,
        phone_number: phoneNumber || undefined,
        label: label || undefined,
        min_duration_seconds: minDuration ? Number(minDuration) : undefined,
        max_duration_seconds: maxDuration ? Number(maxDuration) : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: PAGE_SIZE,
      }),
    refetchInterval: 5000,
  });

  function handleTabChange(tab: TabValue) {
    setActiveTab(tab);
    setPage(1);
  }

  // TASK 2: clear all filters and reset sorting
  function clearFilters() {
    setCallerName("");
    setPhoneNumber("");
    setLabel("");
    setMinDuration("");
    setMaxDuration("");
    setSortBy("created_at");
    setSortOrder("desc");
    setPage(1);
  }

  // TASK 2: change sorting when a column header is clicked
  function handleSortChange(column: SortCallsBy) {
    if (sortBy === column) {
      setSortOrder((currentOrder) => (currentOrder === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }

    setPage(1);
  }

  const hasActiveFilters =
    callerName ||
    phoneNumber ||
    label ||
    minDuration ||
    maxDuration ||
    sortBy !== "created_at" ||
    sortOrder !== "desc";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b-2 shadow-sm" style={{ borderBottomColor: "#FDDF5C" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shadow"
                style={{ backgroundColor: "#FDDF5C" }}
              >
                <span style={{ color: "#7A6000" }}>V</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">VOICO</span>
              <span className="hidden sm:block text-sm text-gray-400 font-normal pl-3 border-l border-gray-200">
                Calls Dashboard
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${isFetching ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: isFetching ? "#FDDF5C" : "#86efac" }}
                />
                {isFetching ? "Syncing..." : "Live"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-700"
                onClick={() => refetch()}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats row */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Calls", value: data.total },
              { label: "In Progress", value: data.counts?.in_progress ?? "—" },
              { label: "Successful", value: data.counts?.success ?? "—" },
              { label: "Failed", value: data.counts?.failed ?? "—" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                <p className="text-xs text-muted-foreground mb-1 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        <Card className="bg-white">
          <div className="flex items-center px-6 pt-5 pb-4 border-b border-border">
            <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={
                    activeTab === tab.value
                      ? { backgroundColor: "#FDDF5C", color: "#4a3800", boxShadow: "0 1px 3px rgba(0,0,0,0.10)" }
                      : { color: "var(--muted-foreground)" }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TASK 2: filter inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 px-6 py-4 border-b border-border">
            <input
              className="rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Caller name"
              value={callerName}
              onChange={(event) => {
                setCallerName(event.target.value);
                setPage(1);
              }}
            />

            <input
              className="rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Phone number"
              value={phoneNumber}
              onChange={(event) => {
                setPhoneNumber(event.target.value);
                setPage(1);
              }}
            />

            <input
              className="rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Label"
              value={label}
              onChange={(event) => {
                setLabel(event.target.value);
                setPage(1);
              }}
            />

            <input
              className="rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Min duration"
              type="number"
              min="0"
              value={minDuration}
              onChange={(event) => {
                setMinDuration(event.target.value);
                setPage(1);
              }}
            />

            <input
              className="rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Max duration"
              type="number"
              min="0"
              value={maxDuration}
              onChange={(event) => {
                setMaxDuration(event.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* TASK 2: active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-border bg-muted/30">
              {callerName && (
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs"
                  onClick={() => {
                    setCallerName("");
                    setPage(1);
                  }}
                >
                  Caller: {callerName}
                  <X className="h-3 w-3" />
                </button>
              )}

              {phoneNumber && (
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs"
                  onClick={() => {
                    setPhoneNumber("");
                    setPage(1);
                  }}
                >
                  Phone: {phoneNumber}
                  <X className="h-3 w-3" />
                </button>
              )}

              {label && (
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs"
                  onClick={() => {
                    setLabel("");
                    setPage(1);
                  }}
                >
                  Label: {label}
                  <X className="h-3 w-3" />
                </button>
              )}

              {minDuration && (
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs"
                  onClick={() => {
                    setMinDuration("");
                    setPage(1);
                  }}
                >
                  Min: {minDuration}s
                  <X className="h-3 w-3" />
                </button>
              )}

              {maxDuration && (
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs"
                  onClick={() => {
                    setMaxDuration("");
                    setPage(1);
                  }}
                >
                  Max: {maxDuration}s
                  <X className="h-3 w-3" />
                </button>
              )}

              {(sortBy !== "created_at" || sortOrder !== "desc") && (
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs"
                  onClick={() => {
                    setSortBy("created_at");
                    setSortOrder("desc");
                    setPage(1);
                  }}
                >
                  Sort: {sortBy} {sortOrder}
                  <X className="h-3 w-3" />
                </button>
              )}

              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}

          <CardContent className="p-0">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                  <Phone className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Failed to load calls</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure the backend is running at localhost:8000
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
                  Retry
                </Button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CallsTable
                calls={data?.data ?? []}
                onRowClick={setSelectedCall}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            )}
          </CardContent>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.total_pages}{" "}
                <span className="opacity-60">({data.total} total)</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  disabled={page === data.total_pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>

      <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}