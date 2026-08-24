import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OrgCustomFieldsSection from "../OrgCustomFieldsSection.jsx";
import { customFieldApi } from "../../../api/customFieldApi";

vi.mock("../../../api/customFieldApi", () => ({
  customFieldApi: {
    getDefinitions: vi.fn(),
    createDefinition: vi.fn(),
    updateDefinition: vi.fn(),
    deleteDefinition: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const ORG_ID = "org-123";

const existingFields = [
  {
    _id: "field-1",
    name: "Client name",
    type: "text",
    required: true,
    active: true,
  },
  {
    _id: "field-2",
    name: "Phase",
    type: "dropdown",
    options: ["Design", "Build"],
    required: false,
    active: true,
  },
];

describe("OrgCustomFieldsSection (#1903)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    customFieldApi.getDefinitions.mockResolvedValue({ data: [] });
    customFieldApi.createDefinition.mockResolvedValue({
      success: true,
      data: { _id: "new-1", name: "Department", type: "text" },
    });
  });

  it("loads definitions including inactive fields for org admins", async () => {
    render(<OrgCustomFieldsSection orgId={ORG_ID} />);

    await waitFor(() => {
      expect(customFieldApi.getDefinitions).toHaveBeenCalledWith(ORG_ID, {
        includeInactive: true,
      });
    });
    expect(
      screen.getByRole("heading", { name: /custom fields/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no custom fields yet/i)).toBeInTheDocument();
  });

  it("lists existing definitions and their types", async () => {
    customFieldApi.getDefinitions.mockResolvedValue({ data: existingFields });

    render(<OrgCustomFieldsSection orgId={ORG_ID} />);

    expect(await screen.findByText("Client name")).toBeInTheDocument();
    expect(screen.getByText(/text · required/i)).toBeInTheDocument();
    expect(screen.getByText("Phase")).toBeInTheDocument();
    expect(
      screen.getByText(/dropdown · optional · design, build/i),
    ).toBeInTheDocument();
  });

  it("creates a text field from the admin form", async () => {
    render(<OrgCustomFieldsSection orgId={ORG_ID} />);

    await screen.findByLabelText(/field name/i);
    fireEvent.change(screen.getByLabelText(/field name/i), {
      target: { value: "Department" },
    });
    fireEvent.change(screen.getByLabelText(/field type/i), {
      target: { value: "text" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add field/i }));

    await waitFor(() => {
      expect(customFieldApi.createDefinition).toHaveBeenCalledWith(ORG_ID, {
        name: "Department",
        type: "text",
        required: false,
      });
    });
  });

  it("creates a boolean field as checkbox for the existing backend type", async () => {
    render(<OrgCustomFieldsSection orgId={ORG_ID} />);

    await screen.findByLabelText(/field name/i);
    fireEvent.change(screen.getByLabelText(/field name/i), {
      target: { value: "NDA signed" },
    });
    fireEvent.change(screen.getByLabelText(/field type/i), {
      target: { value: "checkbox" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add field/i }));

    await waitFor(() => {
      expect(customFieldApi.createDefinition).toHaveBeenCalledWith(ORG_ID, {
        name: "NDA signed",
        type: "checkbox",
        required: false,
      });
    });
  });

  it("requires dropdown options before calling the API", async () => {
    render(<OrgCustomFieldsSection orgId={ORG_ID} />);

    await screen.findByLabelText(/field name/i);
    fireEvent.change(screen.getByLabelText(/field name/i), {
      target: { value: "Status" },
    });
    fireEvent.change(screen.getByLabelText(/field type/i), {
      target: { value: "dropdown" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add field/i }));

    expect(
      await screen.findByText(/dropdown fields require at least one option/i),
    ).toBeInTheDocument();
    expect(customFieldApi.createDefinition).not.toHaveBeenCalled();
  });

  it("creates a dropdown field with normalized options", async () => {
    render(<OrgCustomFieldsSection orgId={ORG_ID} />);

    await screen.findByLabelText(/field name/i);
    fireEvent.change(screen.getByLabelText(/field name/i), {
      target: { value: "Status" },
    });
    fireEvent.change(screen.getByLabelText(/field type/i), {
      target: { value: "dropdown" },
    });
    fireEvent.change(screen.getByLabelText(/dropdown options/i), {
      target: { value: "Open\nClosed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add field/i }));

    await waitFor(() => {
      expect(customFieldApi.createDefinition).toHaveBeenCalledWith(ORG_ID, {
        name: "Status",
        type: "dropdown",
        required: false,
        options: ["Open", "Closed"],
      });
    });
  });

  it("deactivates a field after confirmation", async () => {
    customFieldApi.getDefinitions.mockResolvedValue({ data: existingFields });
    customFieldApi.deleteDefinition.mockResolvedValue({ success: true });

    render(<OrgCustomFieldsSection orgId={ORG_ID} />);

    const deactivateButtons = await screen.findAllByRole("button", {
      name: /deactivate/i,
    });
    fireEvent.click(deactivateButtons[0]);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /^deactivate$/i }),
    );

    await waitFor(() => {
      expect(customFieldApi.deleteDefinition).toHaveBeenCalledWith(
        ORG_ID,
        "field-1",
      );
    });
  });
});
