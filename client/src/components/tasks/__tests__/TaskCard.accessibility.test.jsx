import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import TaskCard from "../TaskCard.jsx";

describe("TaskCard Keyboard Accessibility & ARIA semantics (#1682)", () => {
  const mockTask = {
    id: "task-1",
    title: "Finish quarterly security audit",
    priority: "high",
    status: "open",
    dueDate: "2026-08-30T00:00:00.000Z",
    owner: "Alice Uploader",
    organization: "CyberDyne Systems",
    meetingId: "meeting-123",
    remindersEnabled: true,
  };

  it("renders with correct button role, tabIndex, and aria-label", () => {
    const setSelectedTask = vi.fn();
    render(<TaskCard task={mockTask} setSelectedTask={setSelectedTask} />);

    const card = screen.getByRole("button", {
      name: /open details for task: Finish quarterly security audit/i,
    });
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute("tabindex", "0");
  });

  it("activates details modal callback on Enter key press", () => {
    const setSelectedTask = vi.fn();
    render(<TaskCard task={mockTask} setSelectedTask={setSelectedTask} />);

    const card = screen.getByRole("button", {
      name: /open details for task:/i,
    });
    card.focus();
    fireEvent.keyDown(card, { key: "Enter", code: "Enter" });

    expect(setSelectedTask).toHaveBeenCalledTimes(1);
    expect(setSelectedTask).toHaveBeenCalledWith(mockTask);
  });

  it("activates details modal callback on Space key press", () => {
    const setSelectedTask = vi.fn();
    render(<TaskCard task={mockTask} setSelectedTask={setSelectedTask} />);

    const card = screen.getByRole("button", {
      name: /open details for task:/i,
    });
    card.focus();
    fireEvent.keyDown(card, { key: " ", code: "Space" });

    expect(setSelectedTask).toHaveBeenCalledTimes(1);
    expect(setSelectedTask).toHaveBeenCalledWith(mockTask);
  });

  it("renders reminder control button with correct accessibility properties", () => {
    render(<TaskCard task={mockTask} setSelectedTask={vi.fn()} />);

    const reminderButton = screen.getByRole("button", {
      name: /disable reminders for this task/i,
    });
    expect(reminderButton).toBeInTheDocument();
  });

  it("renders disabled status correct accessibility properties when reminders are disabled", () => {
    const disabledReminderTask = {
      ...mockTask,
      remindersEnabled: false,
    };
    render(<TaskCard task={disabledReminderTask} setSelectedTask={vi.fn()} />);

    const reminderButton = screen.getByRole("button", {
      name: /enable reminders for this task/i,
    });
    expect(reminderButton).toBeInTheDocument();
  });

  it("nested controls like select status do not trigger details callback on click", () => {
    const setSelectedTask = vi.fn();
    const updateTaskStatus = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        setSelectedTask={setSelectedTask}
        updateTaskStatus={updateTaskStatus}
      />,
    );

    const select = screen.getByRole("combobox");
    fireEvent.click(select);

    expect(setSelectedTask).not.toHaveBeenCalled();
  });

  it("nested controls like reminder toggle do not trigger details callback on click or key press", () => {
    const setSelectedTask = vi.fn();
    const toggleTaskReminder = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        setSelectedTask={setSelectedTask}
        toggleTaskReminder={toggleTaskReminder}
      />,
    );

    const reminderBtn = screen.getByRole("button", {
      name: /disable reminders/i,
    });
    fireEvent.click(reminderBtn);
    expect(setSelectedTask).not.toHaveBeenCalled();

    fireEvent.keyDown(reminderBtn, { key: "Enter", code: "Enter" });
    expect(setSelectedTask).not.toHaveBeenCalled();
  });
});
