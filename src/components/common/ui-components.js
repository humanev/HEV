import { createElement } from "react";

/** Small native React components used by the site without a UI library. */
export function CstButton({ className = "", href, type, children, ...props }) {
  const classes = `cst-app-button ${className}`.trim();
  if (href) {
    return createElement("a", { ...props, href, className: classes }, children);
  }
  return createElement("button", { ...props, type: type || "button", className: classes }, children);
}

export function CstInput({
  className = "",
  label,
  supportingText,
  multiline = false,
  id,
  ...props
}) {
  const fieldId = id || props.name;
  const fieldProps = { ...props, id: fieldId, className: "cst-input__field" };
  const field = multiline
    ? createElement("textarea", fieldProps)
    : createElement("input", fieldProps);

  return createElement(
    "div",
    { className: `cst-input ${className}`.trim() },
    label && createElement("label", { className: "cst-input__label", htmlFor: fieldId }, label),
    field,
    supportingText && createElement("small", { className: "cst-input__supporting-text" }, supportingText),
  );
}

export function CstSelect({
  className = "",
  label,
  options = [],
  id,
  name,
  ...props
}) {
  const fieldId = id || name;
  return createElement(
    "div",
    { className: `cst-input ${className}`.trim() },
    label && createElement("label", { className: "cst-input__label", htmlFor: fieldId }, label),
    createElement(
      "select",
      { ...props, id: fieldId, name, className: "cst-input__field" },
      options.map((option) => createElement("option", { key: option.value, value: option.value }, option.label)),
    ),
  );
}

export function CstCard({ className = "", children, ...props }) {
  return createElement("div", { ...props, className }, children);
}

export function CstTag({ className = "", children, variant = "neutral", ...props }) {
  return createElement("span", { ...props, className: `cst-tag cst-tag--${variant} ${className}`.trim() }, children);
}
