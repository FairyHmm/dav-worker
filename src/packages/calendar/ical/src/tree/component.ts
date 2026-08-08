import type { ICalComponent } from "../types";

export function newComponent(name: string): ICalComponent {
  return { name, properties: {}, components: [] };
}

// Depth-first search for the first sub-component with the given name.
export function findComponent(
  root: ICalComponent,
  name: string,
): ICalComponent | undefined {
  if (root.name === name) return root;
  for (const sub of root.components) {
    const found = findComponent(sub, name);
    if (found) return found;
  }
  return undefined;
}

// Direct children only — VEVENT/VTODO/VTIMEZONE are always siblings
// under VCALENDAR per RFC 5545, never nested inside each other.
export function findAllComponents(
  root: ICalComponent,
  name: string,
): ICalComponent[] {
  return root.components.filter((c) => c.name === name);
}

// Deep copy. Used for occurrence-targeted updates where we clone a
// recurring master into a standalone RECURRENCE-ID override.
export function cloneComponent(component: ICalComponent): ICalComponent {
  return {
    name: component.name,
    properties: Object.fromEntries(
      Object.entries(component.properties).map(([key, props]) => [
        key,
        props.map((p) => ({ value: p.value, params: { ...p.params } })),
      ]),
    ),
    components: component.components.map(cloneComponent),
  };
}
