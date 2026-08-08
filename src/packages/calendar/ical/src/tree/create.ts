import type { ICalComponent } from "../types";
import { newComponent } from "./component";
import { setText } from "./accessors";
import { nowStamp } from "./datetime";

function withStamps(component: ICalComponent, uid: string): ICalComponent {
  setText(component, "UID", uid);
  const stamp = nowStamp();
  component.properties["DTSTAMP"] = [{ value: stamp, params: {} }];
  component.properties["CREATED"] = [{ value: stamp, params: {} }];
  return component;
}

export function newEvent(uid: string): ICalComponent {
  return withStamps(newComponent("VEVENT"), uid);
}

export function newTodo(uid: string): ICalComponent {
  return withStamps(newComponent("VTODO"), uid);
}

export function wrapInCalendar(component: ICalComponent): ICalComponent {
  const cal = newComponent("VCALENDAR");
  cal.properties["PRODID"] = [{ value: "-//dav-worker//EN", params: {} }];
  cal.properties["VERSION"] = [{ value: "2.0", params: {} }];
  cal.components.push(component);
  return cal;
}
