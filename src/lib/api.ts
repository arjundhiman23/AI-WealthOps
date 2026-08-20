import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: "Not signed in." }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Your demo role cannot perform this action." }, { status: 403 });
}

export function notFound(message = "Not found.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Something went wrong.") {
  return NextResponse.json({ error: message }, { status: 500 });
}
