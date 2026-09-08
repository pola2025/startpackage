import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { PRINT_COLOR_AGREEMENT } from "@/lib/design-confirm";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), notify: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "test-user" } }) }));
vi.mock("@/lib/prisma", () => ({ default: { workflow: mocks } }));
vi.mock("@/lib/notification/notificationService", () => ({
  handleStateChange: mocks.notify, handleOrderRequest: mocks.notify,
}));
vi.mock("@/lib/utils/businessDays", () => ({ calculateExpectedArrival: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue({ id: "test-print", userId: "test-user", type: "명함", status: "발주대기", 확정동의항목: ["표기정보확인"] });
  mocks.update.mockResolvedValue({ status: "발주요청" });
  mocks.findMany.mockResolvedValue([{ status: "대기" }]);
});

it("rejects an order without color consent before writing or notifying", async () => {
  const response = await POST(new Request("http://localhost/api/workflows/test-print/order", { method: "POST" }), { params: Promise.resolve({ id: "test-print" }) });
  expect(response.status).toBe(400);
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.notify).not.toHaveBeenCalled();
});

it("records color consent and preserves previous agreements", async () => {
  const response = await POST(new Request("http://localhost/api/workflows/test-print/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agreements: [PRINT_COLOR_AGREEMENT.id] }) }), { params: Promise.resolve({ id: "test-print" }) });
  expect(response.status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ 확정동의항목: ["표기정보확인", PRINT_COLOR_AGREEMENT.id] }) }));
});
