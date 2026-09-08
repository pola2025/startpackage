import { NextResponse } from "next/server";
import { getDataServiceErrorResponse } from "./http-error";

export function dataServiceErrorResponse(error: unknown): NextResponse | null {
  const response = getDataServiceErrorResponse(error);
  return response ? NextResponse.json(response.body, { status: response.status }) : null;
}
