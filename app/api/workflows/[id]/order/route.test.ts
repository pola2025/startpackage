import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { CONFIRM_AGREEMENTS, PRINT_COLOR_AGREEMENT } from "@/lib/design-confirm";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), notify: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "test-user" } }) }));
vi.mock("@/lib/prisma", () => ({ default: { workflow: mocks } }));
vi.mock("@/lib/notification/workflowNotifications", () => ({
  notifyWorkflowOrder: mocks.notify,
}));
vi.mock("@/lib/utils/businessDays", () => ({ calculateExpectedArrival: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue({ id: "test-print", userId: "test-user", type: "명함", status: "발주대기", 확정동의항목: ["표기정보확인"], user: { 이름: "테스트", cohort: { name: "테스트기수" } } });
  mocks.notify.mockResolvedValue(undefined);
  mocks.update.mockResolvedValue({ status: "발주요청" });
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.findMany.mockResolvedValue([{ status: "대기" }]);
});

it("rejects an order without color consent before writing or notifying", async () => {
  const response = await POST(new Request("http://localhost/api/workflows/test-print/order", { method: "POST" }), { params: Promise.resolve({ id: "test-print" }) });
  expect(response.status).toBe(400);
  expect(mocks.updateMany).not.toHaveBeenCalled();
  expect(mocks.notify).not.toHaveBeenCalled();
});

it("rejects an order when the base confirmation agreements are missing", async () => {
  const response = await POST(new Request("http://localhost/api/workflows/test-print/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agreements: [PRINT_COLOR_AGREEMENT.id] }) }), { params: Promise.resolve({ id: "test-print" }) });
  expect(response.status).toBe(400);
  expect(mocks.updateMany).not.toHaveBeenCalled();
});

it("stores the complete confirmation snapshot before notifying", async () => {
  const agreements = [...CONFIRM_AGREEMENTS, PRINT_COLOR_AGREEMENT].map((item) => item.id);
  const response = await POST(new Request("http://localhost/api/workflows/test-print/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shipping: { 인쇄물받을주소: "서울시 중구 세종대로 1", 받는분이름: "테스트", 수령연락처: "010-1234-5678", 우편번호: "04524" }, agreements }) }), { params: Promise.resolve({ id: "test-print" }) });
  expect(response.status).toBe(200);
  expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "test-print", userId: "test-user", status: "발주대기" }, data: expect.objectContaining({ 확정배송지: "04524 서울시 중구 세종대로 1", 확정수령인: "테스트", 확정수령연락처: "010-1234-5678", 확정동의항목: agreements }) }));
});

it("returns a conflict when the order CAS loses the status race", async () => {
  mocks.updateMany.mockResolvedValue({ count: 0 });
  const agreements = [...CONFIRM_AGREEMENTS, PRINT_COLOR_AGREEMENT].map((item) => item.id);
  const response = await POST(new Request("http://localhost/api/workflows/test-print/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shipping: { 인쇄물받을주소: "서울시 중구 세종대로 1", 받는분이름: "테스트", 수령연락처: "010-1234-5678", 우편번호: "04524" }, agreements }) }), { params: Promise.resolve({ id: "test-print" }) });
  expect(response.status).toBe(409);
  expect(mocks.notify).not.toHaveBeenCalled();
});

it("rejects malformed shipping values as validation errors", async () => {
  const agreements = [...CONFIRM_AGREEMENTS, PRINT_COLOR_AGREEMENT].map((item) => item.id);
  const response = await POST(new Request("http://localhost/api/workflows/test-print/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shipping: { 인쇄물받을주소: 123 }, agreements }) }), { params: Promise.resolve({ id: "test-print" }) });
  expect(response.status).toBe(400);
  expect(mocks.updateMany).not.toHaveBeenCalled();
});
