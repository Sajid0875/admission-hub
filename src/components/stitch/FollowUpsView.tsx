"use client";

import React, { useState } from "react";
import { Calendar, CheckSquare, Square, Clock } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";

interface FollowUpItem {
  id: string;
  name: string;
  time: string;
  timeHighlight?: boolean;
  task: string;
  priority: "High Priority" | "Medium Priority" | "Low Priority";
  status: "Pending" | "New Lead" | "Lost" | "Completed";
  completed: boolean;
}

const initialTasks: FollowUpItem[] = [
  {
    id: "fu_1",
    name: "Alex Mercer",
    time: "10:00 AM",
    timeHighlight: true,
    task: "Follow up on application missing docs.",
    priority: "High Priority",
    status: "Pending",
    completed: false,
  },
  {
    id: "fu_2",
    name: "Sarah Connor",
    time: "2:30 PM",
    timeHighlight: false,
    task: "Initial consultation call.",
    priority: "Medium Priority",
    status: "New Lead",
    completed: false,
  },
  {
    id: "fu_3",
    name: "John Smith",
    time: "4:00 PM",
    timeHighlight: false,
    task: "Send fee structure details via email.",
    priority: "Low Priority",
    status: "Lost",
    completed: false,
  },
];

export function FollowUpsView() {
  const [tasks, setTasks] = useState<FollowUpItem[]>(initialTasks);
  const [activeFilter, setActiveFilter] = useState<"today" | "upcoming" | "overdue" | "completed">("today");
  const addToast = useUIStore((state) => state.addToast);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = !t.completed;
          addToast({
            type: next ? "success" : "info",
            title: next ? "Task Completed" : "Task Reopened",
            message: `${t.name}: ${t.task}`,
          });
          return { ...t, completed: next, status: next ? "Completed" : "Pending" };
        }
        return t;
      })
    );
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveFilter("today")}
          className={`px-4 py-2 rounded-full font-semibold text-xs transition-colors shrink-0 ${
            activeFilter === "today"
              ? "bg-primary text-white shadow-sm"
              : "bg-white border border-outline-variant text-on-surface-variant hover:bg-slate-50"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setActiveFilter("upcoming")}
          className={`px-4 py-2 rounded-full font-semibold text-xs transition-colors shrink-0 ${
            activeFilter === "upcoming"
              ? "bg-primary text-white shadow-sm"
              : "bg-white border border-outline-variant text-on-surface-variant hover:bg-slate-50"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveFilter("overdue")}
          className={`px-4 py-2 rounded-full font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 ${
            activeFilter === "overdue"
              ? "bg-primary text-white shadow-sm"
              : "bg-white border border-outline-variant text-on-surface-variant hover:bg-slate-50"
          }`}
        >
          <span>Overdue</span>
          <span className="bg-error text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">
            2
          </span>
        </button>
        <button
          onClick={() => setActiveFilter("completed")}
          className={`px-4 py-2 rounded-full font-semibold text-xs transition-colors shrink-0 ${
            activeFilter === "completed"
              ? "bg-primary text-white shadow-sm"
              : "bg-white border border-outline-variant text-on-surface-variant hover:bg-slate-50"
          }`}
        >
          Completed
        </button>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`bg-white border border-outline-variant rounded-2xl p-5 shadow-soft flex items-start gap-4 cursor-pointer transition-all hover:border-primary/40 ${
              task.completed ? "opacity-60 bg-slate-50/70" : ""
            }`}
          >
            {/* Custom Checkbox */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTask(task.id);
              }}
              className="mt-0.5 text-primary hover:scale-105 transition-transform"
            >
              {task.completed ? (
                <CheckSquare className="w-5 h-5 fill-primary text-white" />
              ) : (
                <Square className="w-5 h-5 text-outline" />
              )}
            </button>

            {/* Task Content */}
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between items-start">
                <h3 className={`text-base font-bold text-on-surface ${task.completed ? "line-through" : ""}`}>
                  {task.name}
                </h3>
                <span
                  className={`text-xs font-bold ${
                    task.timeHighlight ? "text-error" : "text-on-surface-variant"
                  }`}
                >
                  {task.time}
                </span>
              </div>

              <p className="text-xs text-on-surface-variant font-medium">{task.task}</p>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="bg-primary-fixed text-primary font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                  {task.priority}
                </span>
                <span
                  className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-full border ${
                    task.status === "New Lead"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : task.status === "Lost"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {task.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
