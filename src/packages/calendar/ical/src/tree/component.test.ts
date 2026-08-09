import { describe, it, expect } from "vitest";
import {
  newComponent,
  findComponent,
  findAllComponents,
  cloneComponent,
  newEvent,
  newTodo,
  wrapInCalendar,
} from "../../index";

describe("component tree", () => {
  it("newComponent creates empty component", () => {
    const comp = newComponent("VEVENT");
    expect(comp.name).toBe("VEVENT");
    expect(comp.properties).toEqual({});
    expect(comp.components).toEqual([]);
  });

  it("findComponent finds nested component", () => {
    const cal = newComponent("VCALENDAR");
    const event = newComponent("VEVENT");
    const todo = newComponent("VTODO");
    cal.components.push(event, todo);

    expect(findComponent(cal, "VEVENT")).toBe(event);
    expect(findComponent(cal, "VTODO")).toBe(todo);
    expect(findComponent(cal, "VFREEBUSY")).toBeUndefined();
  });

  it("findAllComponents returns direct children only", () => {
    const cal = newComponent("VCALENDAR");
    const event1 = newComponent("VEVENT");
    const event2 = newComponent("VEVENT");
    const todo = newComponent("VTODO");
    cal.components.push(event1, event2, todo);

    expect(findAllComponents(cal, "VEVENT")).toEqual([event1, event2]);
    expect(findAllComponents(cal, "VTODO")).toEqual([todo]);
  });

  it("cloneComponent creates deep copy", () => {
    const original = newComponent("VEVENT");
    original.properties.SUMMARY = [{ value: "Test", params: {} }];
    const child = newComponent("VALARM");
    original.components.push(child);

    const cloned = cloneComponent(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.properties.SUMMARY).not.toBe(original.properties.SUMMARY);
    expect(cloned.components[0]).not.toBe(original.components[0]);
  });
});

describe("factory functions", () => {
  it("newEvent creates VEVENT with UID and stamps", () => {
    const event = newEvent("test-uid");
    expect(event.name).toBe("VEVENT");
    expect(event.properties.UID?.[0]?.value).toBe("test-uid");
    expect(event.properties.DTSTAMP).toBeDefined();
    expect(event.properties.CREATED).toBeDefined();
  });

  it("newTodo creates VTODO with UID and stamps", () => {
    const todo = newTodo("test-uid");
    expect(todo.name).toBe("VTODO");
    expect(todo.properties.UID?.[0]?.value).toBe("test-uid");
    expect(todo.properties.DTSTAMP).toBeDefined();
  });

  it("wrapInCalendar wraps component in VCALENDAR", () => {
    const event = newEvent("test-uid");
    const cal = wrapInCalendar(event);
    expect(cal.name).toBe("VCALENDAR");
    expect(cal.properties.PRODID?.[0]?.value).toContain("dav-worker");
    expect(cal.properties.VERSION?.[0]?.value).toBe("2.0");
    expect(cal.components).toHaveLength(1);
    expect(cal.components[0]).toBe(event);
  });
});
