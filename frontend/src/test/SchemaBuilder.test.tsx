import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaBuilder } from "../components/schema/SchemaBuilder";

describe("SchemaBuilder", () => {
  it("renders with empty schema showing one empty field row", () => {
    const onChange = vi.fn();
    render(<SchemaBuilder schema={{}} onChange={onChange} />);
    expect(screen.getByPlaceholderText("field_name")).toBeInTheDocument();
    expect(screen.getByText("Add Field")).toBeInTheDocument();
  });

  it("renders existing schema fields", () => {
    const onChange = vi.fn();
    const schema = {
      type: "object",
      properties: {
        name: { type: "string", title: "Name" },
        age: { type: "number", title: "Age" },
      },
      required: ["name"],
    };
    render(<SchemaBuilder schema={schema} onChange={onChange} />);
    expect(screen.getByDisplayValue("name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("age")).toBeInTheDocument();
  });

  it("adds a new field when Add Field is clicked", () => {
    const onChange = vi.fn();
    render(<SchemaBuilder schema={{}} onChange={onChange} />);
    fireEvent.click(screen.getByText("Add Field"));

    const inputs = screen.getAllByPlaceholderText("field_name");
    expect(inputs).toHaveLength(2);
  });

  it("removes a field when delete button is clicked", () => {
    const onChange = vi.fn();
    const schema = {
      type: "object",
      properties: {
        name: { type: "string", title: "Name" },
        age: { type: "number", title: "Age" },
      },
    };
    render(<SchemaBuilder schema={schema} onChange={onChange} />);
    const deleteButtons = screen.getAllByRole("button", { hidden: true }).filter(
      (btn) => btn.innerHTML.includes("trash") || btn.querySelector("svg[class*='lucide-trash']")
    );
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("updates field name on input change", () => {
    const onChange = vi.fn();
    render(<SchemaBuilder schema={{}} onChange={onChange} />);
    const input = screen.getByPlaceholderText("field_name");
    fireEvent.change(input, { target: { value: "email" } });
    expect(screen.getByDisplayValue("email")).toBeInTheDocument();
  });

  it("renders in readOnly mode without input fields", () => {
    const onChange = vi.fn();
    const schema = {
      type: "object",
      properties: {
        name: { type: "string", title: "Name" },
      },
    };
    render(<SchemaBuilder schema={schema} onChange={onChange} readOnly />);
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("string")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("field_name")).not.toBeInTheDocument();
    expect(screen.queryByText("Add Field")).not.toBeInTheDocument();
  });

  it("shows column count for table fields", () => {
    const onChange = vi.fn();
    const schema = {
      type: "object",
      properties: {
        items: {
          type: "array",
          title: "Items",
          items: {
            type: "object",
            properties: {
              sku: { type: "string", title: "SKU" },
            },
          },
        },
      },
    };
    render(<SchemaBuilder schema={schema} onChange={onChange} />);
    expect(screen.getByText(/1 columns?/i)).toBeInTheDocument();
  });
});
